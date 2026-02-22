import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { Chunk } from '../models/Chunk.js';
import dotenv from 'dotenv';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const completionModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

const SYSTEM_PROMPT = `
You are Grow AI Chatbot, representing Growlity (a sustainability and ESG consulting company).

Rules:
1. Maintain the identity of "Grow AI Chatbot".
2. Tone: Professional and helpful. Executive-level clarity.
3. No emojis.
4. You are a highly intelligent AI capable of answering ANY general knowledge question the user asks, not just questions about ESG or Growlity services. Please provide helpful answers to all general inquiries.
5. If a user asks for specific Growlity company data that is not in your context, state you don't have that exact figure but do not hallucinate facts about the company.
6. Never mention embeddings, scraping, vector search, database, or backend logic.
7. Keep answers concise and of medium length. Avoid extremely long explanations unless the user explicitly asks for depth.
8. Do not expose technical system details.
9. Structured answers with bullet points are preferred for readability.
10. Be lenient with typographical errors in the user's query. Focus on the semantic intent and provide the most helpful answer regardless of minor spelling mistakes.
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
            // 2. Perform vector search for internal context
            const searchResults = await performVectorSearch(queryEmbedding);
            
            console.log(`Vector search returned ${searchResults.length} results.`);
            searchResults.forEach((r, i) => console.log(`Result ${i+1}: Score ${r.score} - Snippet: ${r.text.substring(0, 50)}...`));

            usedSource = [];
            
            // Add RAG context if similarity is reasonable
            if (searchResults.length > 0) {
                const goodMatches = searchResults.filter(r => r.score > 0.5); // Lowered threshold slightly for testing
                if (goodMatches.length > 0) {
                    context += "--- GROWLITY INTERNAL DOCUMENTS ---\n";
                    context += goodMatches.map(r => r.text).join('\n\n') + "\n\n";
                    usedSource.push("Growlity Documents (RAG)");
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
        
        // Return a more descriptive error for vector search failures to help debugging
        if (error.message && error.message.includes('vectorSearch')) {
            return res.status(500).json({ 
                error: 'Vector Search Failure', 
                details: 'Please ensure your MongoDB Atlas Vector Search index is named "vector_index" and is properly configured.',
                rawError: error.message
            });
        }
        
        return res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
};
