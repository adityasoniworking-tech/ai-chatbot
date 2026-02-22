# Scraping Process for Growlity Solutions

This document explains how the data from `https://growlity.com/solutions` is transformed into AI-ready data.

## 1. Request Phase
The system uses **ContentAPI** (via the provided API key) to perform a headless browser extraction of the target URL. 
- **URL**: `https://growlity.com/solutions`
- **Engine**: Headless Chromium (to handle JavaScript rendering).
- **Authentication**: Bearer Token in the Authorization header.

## 2. Extraction & Cleaning
Once the HTML is retrieved:
- **Filtering**: Script tags, styles, navigation bars, and footers are removed to prevent "noise."
- **Normalization**: Multiple spaces and newlines are collapsed into single spaces to save token space.

## 3. Chunking Data
The cleaned text is split into segments:
- **Size**: Approximately 600 words per chunk.
- **Purpose**: This allows the AI to focus on specific sections of the "Solutions" page during retrieval, rather than reading the entire (potentially large) page at once.

## 4. Vector Embedding
Each chunk is sent to the **Gemini Embedding Model (gemini-embedding-001)**:
- The text is converted into a **3,072-dimension vector**.
- This vector represents the semantic meaning of your various solution offerings (e.g., ESG reporting, Carbon accounting).

## 5. Storage
- **Primary Storage**: MongoDB Atlas Vector Search.
- **Export**: A copy of the text, source URL, and embedding is saved in `scraped_data.json` for manual verification.

## 6. Recall
When a user asks about "Sustainable Solutions," the chatbot performs a **Cosine Similarity Search** in MongoDB to find the chunks that mathematically match the user's intent.
