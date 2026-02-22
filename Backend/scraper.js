import axios from 'axios';
import * as cheerio from 'cheerio';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Chunk } from './models/Chunk.js';
import path from 'path';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    if (mongoose.connection.readyState === 1) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/growlity');
        console.log('Connected to MongoDB for Scraping');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
    }
};

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// We use the embedding model recommended for retrieval: gemini-embedding-001
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

/**
 * Scrape content from the URL (or read from a local file), clean it, and extract text.
 */
async function scrapeUrl(source) {
    if (!source.startsWith('http')) {
        // It's a local file - ensure path is correct for Vercel
        const filePath = path.resolve(process.cwd(), source);
        console.log(`Reading local file from: ${filePath}`);
        try {
            return fs.readFileSync(filePath, 'utf8');
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error.message);
            return null;
        }
    }

    console.log(`Scraping ${source}...`);
    
    // Use ContentAPI if key is available
    if (process.env.CONTENT_API_KEY) {
        try {
            const response = await axios.get(`https://api.getcontentapi.com/api/v1/web/extract`, {
                params: { url: source, render_js: true },
                headers: { 'Authorization': `Bearer ${process.env.CONTENT_API_KEY}` }
            });
            if (response.data && response.data.content) {
                console.log(`Used ContentAPI for ${source}`);
                return response.data.content.replace(/\s+/g, ' ').trim();
            }
        } catch (error) {
            console.warn(`ContentAPI failed for ${source}, falling back to Cheerio:`, error.message);
        }
    }

    try {
        const { data } = await axios.get(source);
        const $ = cheerio.load(data);

        // Remove unnecessary elements
        $('script, style, noscript, nav, footer, header, iframe').remove();

        // Extract primary viewable text
        let text = $('body').text();

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    } catch (error) {
        console.error(`Error scraping ${source}:`, error.message);
        return null;
    }
}

/**
 * Split text into chunks of ~600 words.
 */
function chunkText(text, maxWords = 600) {
    const words = text.split(' ');
    const chunks = [];
    let currentChunk = [];

    for (let word of words) {
        currentChunk.push(word);
        if (currentChunk.length >= maxWords) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [];
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    return chunks;
}

/**
 * Generate embedding using Gemini API
 */
async function generateEmbedding(textChunk) {
    try {
        const result = await embeddingModel.embedContent(textChunk);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error.message);
        return null;
    }
}

/**
 * Main function to scrape, chunk, embed, and store
 */
export async function runIngestion(customUrls = null) {
    await connectDB();
    // DEFAULT URLS OR FILE PATHS:
    const sourceUrls = customUrls || [
        'https://growlity.com',
        'https://growlity.com/our-team',
        'https://growlity.com/solutions',
        'https://growlity.com/contact-us',
        'company-info.txt'
    ];
    
    let totalChunksSaved = 0;
    for (const sourceUrl of sourceUrls) {
        console.log(`\n--- Starting ingestion for: ${sourceUrl} ---`);
        const fullText = await scrapeUrl(sourceUrl);
        if (!fullText) {
            console.log(`Failed to scrape text from ${sourceUrl}. Skipping...`);
            continue;
        }
        
        console.log(`Scraped ${fullText.split(' ').length} words from ${sourceUrl}.`);
        const textChunks = chunkText(fullText, 600);
        console.log(`Created ${textChunks.length} chunks.`);

        await Chunk.deleteMany({ sourceUrl });
        console.log(`Cleared existing chunks for ${sourceUrl}.`);

        for (let i = 0; i < textChunks.length; i++) {
            console.log(`Processing chunk ${i + 1}/${textChunks.length}...`);
            const embedding = await generateEmbedding(textChunks[i]);
            
            if (embedding) {
                const chunkDoc = new Chunk({
                    text: textChunks[i],
                    embedding: embedding,
                    sourceUrl: sourceUrl
                });
                await chunkDoc.save();
                totalChunksSaved++;
            } else {
                console.log(`Failed to generate embedding for chunk ${i + 1}`);
            }
        }
        console.log(`--- Finished ingestion for: ${sourceUrl} ---`);
    }

    console.log(`\nAll Ingestion completed successfully! Total chunks saved: ${totalChunksSaved}`);
    return totalChunksSaved;
}

// Execute the script if run directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    runIngestion().then(() => {
        console.log("Ingestion Script Finished.");
        mongoose.connection.close();
    });
}
