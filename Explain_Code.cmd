@echo off
setlocal enabledelayedexpansion
title Grow AI Chatbot - Full Codebase Explanation
color 0A

echo ==============================================================================
echo                      GROW AI CHATBOT - CODEBASE EXPLANATION
echo ==============================================================================
echo.
echo 1. Generating a detailed DOCUMENTATION.md file...
echo 2. Providing an interactive walkthrough here in the terminal...
echo.

:: --- GENERATE THE DOCUMENTATION FILE ---
(
echo # Grow AI Chatbot - Full Codebase Explanation
echo.
echo This document provides a line-by-line or block-by-block explanation of the entire project.
echo.
echo ## Table of Contents
echo 1. [Backend - server.js]^(#backend---serverjs^)
echo 2. [Backend - controllers/chatController.js]^(#backend---controllerschatcontrollerjs^)
echo 3. [Backend - scraper.js]^(#backend---scraperjs^)
echo 4. [Frontend - src/widget-main.jsx]^(#frontend---srcwidget-mainjsx^)
echo 5. [Frontend - src/components/ChatbotWidget.jsx]^(#frontend---srccomponentschatbotwidgetjsx^)
echo.
echo ---
echo.
echo ## Backend - server.js
echo *The entry point for the Node.js API server.*
echo.
echo - **Lines 1-7**: Imports essential libraries: `express` (web server), `mongoose` (database), `cors` (cross-origin access), `helmet` (security), `morgan` (logging), `dotenv` (env variables), and `express-rate-limit`.
echo - **Line 9**: Calls `dotenv.config()` to load secrets from the `.env` file into `process.env`.
echo - **Lines 15-22**: Configures middleware. `express.json()` parses incoming JSON. `cors` allows the frontend (even from other domains) to talk to the API. `helmet` adds security headers. `morgan('dev')` logs requests to the console.
echo - **Lines 25-33**: Implements Rate Limiting. This prevents a single user from spamming the API (limit: 100 requests per 15 minutes).
echo - **Lines 41-44**: Mounts the API routes. Requests to `/api/chat` are handled by `chatRoutes`.
echo - **Lines 53-74**: Database Logic. It looks for `MONGODB_URI`, connects using Mongoose, and if successful, starts the server listening on the specified `PORT`.
echo.
echo ---
echo.
echo ## Backend - controllers/chatController.js
echo *The RAG (Retrieval Augmented Generation) logic and AI integration.*
echo.
echo - **Lines 1-9**: Imports the Google Generative AI SDK and initializes Gemini models for both standard generation and vector embeddings.
echo - **Lines 11-25**: **SYSTEM_PROMPT**: This defines the chatbot's identity (Grow AI), tone (professional), and rules (no emojis, no hallucinating company data).
echo - **Lines 27-35**: `generateEmbedding(text)`: Converts a user's question into a numerical vector so it can be compared with stored documents.
echo - **Lines 37-67**: `performVectorSearch(embedding)`: Queries MongoDB Atlas Vector Search index. This finds the top 5 most relevant "chunks" of Growlity's internal data to help answer the user.
echo - **Lines 89-116**: `performGoogleSearch(query)`: A fallback function. If the internal search finds nothing, it queries the live web via Google Custom Search API.
echo - **Lines 118-214**: **handleChat(req, res)**: The main API handler.
echo   - 1. Gets user message.
echo   - 2. Generates embedding.
echo   - 3. Searches internal vector DB.
echo   - 4. If no internal matches, searches Google.
echo   - 5. Constructs a final "Super Prompt" containing the search context and the user question.
echo   - 6. Calls OpenRouter (Gemini 2.0 Flash) to generate the final polite response.
echo.
echo ---
echo.
echo ## Backend - scraper.js
echo *The Ingestion Tool: How the AI learns about Growlity.*
echo.
echo - **Lines 31-79**: `scrapeUrl(source)`: This function can read both local text files and live websites. It uses `cheerio` to strip away HTML tags, scripts, and styles, leaving only the important text.
echo - **Lines 84-102**: `chunkText(text)`: Breaks long documents into smaller pieces (~600 words). This is crucial because AI models have a "context window" and work better with focused pieces of information.
echo - **Lines 107-115**: Generates a "vector embedding" for each piece of text.
echo - **Lines 120-168**: `runIngestion()`: The main workflow. It loops through a list of URLs (growlity.com, solutions, etc.), scrapes them, chunks the text, creates embeddings, and saves everything to **MongoDB Atlas**.
echo.
echo ---
echo.
echo ## Frontend - src/widget-main.jsx
echo *Standalone JavaScript entry point to embed the widget in any site.*
echo.
echo - **Lines 7-23**: `initWidget()`: This is a clever script. It checks if the website has a `div` for the chatbot. If not, it creates one automatically (`grow-ai-widget-root`). It then uses `createRoot` to mount the React application inside that div.
echo - **Lines 26-30**: Ensures the widget only starts after the page has finished loading.
echo.
echo ---
echo.
echo ## Frontend - src/components/ChatbotWidget.jsx
echo *The User Interface and State Management.*
echo.
echo - **Lines 1-5**: Imports React hooks (useState, useRef, useEffect) and UI components like Lucide icons.
echo - **Lines 10-25**: **States**: `isOpen` (is chat window visible), `messages` (the chat history array), `input` (text being typed), `isLoading` (is waiting for AI).
echo - **Lines 37-59**: `handleSubmit()`: 
echo   - Adds the user message to the UI instantly.
echo   - Sends the message array to the Backend API.
echo   - Updates the UI with the AI's response when it arrives.
echo - **Lines 61-90**: `handleEditStart/Save`: A premium feature allowing users to edit their previous question. The script then wipes the chat after that point and re-submits the new question to the AI.
echo - **Lines 93-228**: **The UI**:
echo   - Uses CSS classes for animations and "floating" behavior.
echo   - Uses a `Markdown` component to render AI responses with formatting (bold, lists, etc.).
echo   - Includes a "typing indicator" animation while loading.
echo.
echo ---
echo.
echo ## Summary
echo This project is a **Full-Stack RAG Application**. 
echo - It uses **React** for the UI.
echo - It uses **Node.js** for the API.
echo - It uses **MongoDB Atlas Vector Search** for searching through private documents.
echo - It uses **Google Search** for live web data fallback.
echo - It uses **OpenRouter (Gemini)** for the high-speed AI brain.
) > FULL_CODE_DOCUMENTATION.md

echo [SUCCESS] FULL_CODE_DOCUMENTATION.md has been created!
echo.
echo Starting interactive summary...
pause

cls
echo ==============================================================================
echo [STEP 1] - BACKEND ARCHITECTURE
echo ==============================================================================
echo -> server.js handles security (Helmet), traffic (RateLimit), and routes.
echo -> controllers/chatController.js is the "BRAIN".
echo -> it uses Vector Search (RAG) to find company facts.
echo -> scraper.js is the "LEARNER" - it populates the knowledge base.
echo.
pause

cls
echo ==============================================================================
echo [STEP 2] - FRONTEND ARCHITECTURE
echo ==============================================================================
echo -> widget-main.jsx allows injecting this code into ANY website.
echo -> App.jsx is the standard React entry point.
echo -> components/ChatbotWidget.jsx handle the messages, animations, and icons.
echo.
pause

cls
echo ==============================================================================
echo [COMPLETE]
echo ==============================================================================
echo I have created a file named 'FULL_CODE_DOCUMENTATION.md' in your folder.
echo You can open it to see every detail explained clearly.
echo.
echo Press any key to open the documentation...
pause > nul
start FULL_CODE_DOCUMENTATION.md
exit
