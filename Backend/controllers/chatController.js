import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { Chunk } from '../models/Chunk.js';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

const SYSTEM_PROMPT = `
You are Grow AI Chatbot, representing Growlity (a global sustainability and ESG consulting firm).

Identity & Tone:
1. Maintain the identity of "Grow AI Chatbot".
2. Tone: Professional, helpful, and highly positive. 
3. Executive-level clarity. No emojis.
4. Positive Framing: NEVER use negative phrases like "I don't know", "No", "I can't", or "I am unable to". If information is missing, frame it positively: "To ensure you receive the most accurate and detailed information for your specific requirements, I recommend connecting directly with our experts."

Core Rules:
1. Email Privacy: NEVER provide any email addresses. If you encounter an email address in the context, do not disclose it.
2. Mandatory CTA: EVERY single response must end with a clear Call to Action (CTA). Invite the user to fill out the contact form or book a consultation call.
   - Contact Form: https://growlity.com/contact-us
3. Links: Provide more helpful links to Growlity's sections whenever relevant (e.g., Services, Our Company, Team). Always include the Contact link.
4. Professional Persona: Even when answering general knowledge questions, maintain the professional Growlity persona.
5. Conciseness: Keep answers concise and of medium length. Use bullet points for structured readability.
6. Discretion: Never mention technical details like embeddings, vector search, or backend databases.
7. Lenience: Be helpful even if the user makes typos; focus on their intent.
`;

async function generateEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating query embedding:', error);
        return null;
    }
}

async function performVectorSearch(queryEmbedding) {
    try {
        // Requires a Search Index on the 'embedding' field in MongoDB Atlas
        // Index definition (for reference):
        // { "mappings": { "dynamic": true, "fields": { "embedding": { "dimensions": 768, "similarity": "cosine", "type": "knnVector" } } } }
        
        const results = await Chunk.aggregate([
            {
                "$vectorSearch": {
                    "index": "vector_index", // Name of the Atlas Vector Search Index
                    "path": "embedding",
                    "queryVector": queryEmbedding,
                    "numCandidates": 100,
                    "limit": 5
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "text": 1,
                    "sourceUrl": 1,
                    "score": { "$meta": "vectorSearchScore" }
                }
            }
        ]);
        return results;
    } catch (error) {
        console.error('Error performing vector search:', error);
        throw error; // Throw so we can catch it in handleChat
    }
}

async function performOpenRouterSearch(query) {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'gpt-oss-120b',
            messages: [{ role: 'user', content: query }]
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('Error in OpenRouter API:', error.message);
        return null;
    }
}

async function performGoogleSearch(query) {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        const cx = process.env.GOOGLE_CX;
        
        if (!apiKey || !cx) {
            console.warn('Google Search API keys missing. Skipping web search.');
            return null;
        }

        const response = await axios.get(`https://www.googleapis.com/customsearch/v1`, {
            params: {
                key: apiKey,
                cx: cx,
                q: query,
                num: 3
            }
        });

        const items = response.data.items || [];
        if (items.length === 0) return null;

        return items.map(item => `Title: ${item.title}\nSnippet: ${item.snippet}`).join('\n\n');
    } catch (error) {
        console.error('Error in Google Search API:', error.message);
        return null;
    }
}

export const handleChat = async (req, res) => {
    try {
        const { messages } = req.body; // Expecting an array of previous messages like [{role: 'user', content: '...'}, {role: 'model', content: '...'}]
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Valid messages array is required' });
        }

        const latestQuery = messages[messages.length - 1].content;
        console.log(`Received query: ${latestQuery}`);

        // 1. Generate Embedding for the query
        const queryEmbedding = await generateEmbedding(latestQuery);

        let context = "";
        let usedSource = "General Knowledge";

        if (queryEmbedding) {
            try {
                // 2. Perform vector search for internal context
                const searchResults = await performVectorSearch(queryEmbedding);
                
                console.log(`Vector search returned ${searchResults.length} results.`);
                searchResults.forEach((r, i) => console.log(`Result ${i+1}: Score ${r.score} - Snippet: ${r.text.substring(0, 50)}...`));

                usedSource = [];
                
                // 2. Add RAG context if similarity is reasonable
                if (searchResults.length > 0) {
                    const goodMatches = searchResults.filter(r => r.score > 0.6); 
                    if (goodMatches.length > 0) {
                        context += "--- GROWLITY INTERNAL DOCUMENTS ---\n";
                        context += goodMatches.map(r => r.text).join('\n\n') + "\n\n";
                        usedSource.push("Growlity Documents (RAG)");
                    }
                }
            } catch (searchError) {
                console.warn('Vector search failed, falling back to other sources:', searchError.message);
                usedSource = [];
            }

            // 3. Fallback to Google Search if no good internal matches
            if (usedSource.length === 0) {
                const searchResults = await performGoogleSearch(latestQuery);
                if (searchResults) {
                    context += "--- WEB SEARCH RESULTS ---\n";
                    context += searchResults + "\n\n";
                    usedSource.push("Google Search");
                }
            }
            
            usedSource = usedSource.join(" + ") || "General Knowledge";
        } 

        console.log(`Using source: ${usedSource}`);
        // console.log(`Context:\n${context}`);

        // 4. Construct Prompt
        const prompt = `
${SYSTEM_PROMPT}

Context Information (Use this to inform your answer if relevant):
---
${context}
---

User Query: ${latestQuery}

Answer the user query acting as Grow AI Chatbot:`;

        // 5. Generate Response using a fast model on OpenRouter
        const chatResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'google/gemini-2.0-flash-lite-001',
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const responseText = chatResponse.data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

        return res.status(200).json({ 
            response: responseText
        });

    } catch (error) {
        console.error('Error handling chat:', error);
        
        // Handle API Quota Errors (429)
        if (error.response?.status === 429 || error.status === 429) {
            console.error('CRITICAL: API Quota exceeded (429). Please check your billing/limits.');
            return res.status(429).json({ 
                error: 'Service Temporarily Unavailable', 
                details: 'The AI service is currently at its limit. Please try again in a few minutes.' 
            });
        }

        // Return a more descriptive error for vector search failures to help debugging
        if (error.message && error.message.includes('vectorSearch')) {
            return res.status(500).json({ 
                error: 'Knowledge Base Error', 
                details: 'There was a timeout connecting to the knowledge base. Please try again.',
                rawError: error.message
            });
        }
        
        return res.status(500).json({ error: 'An error occurred while processing your request. Please try again later.' });
    }
};
