import { createRoot } from 'react-dom/client';
import React from 'react';
import ChatbotWidget from './components/ChatbotWidget';
import './components/ChatbotWidget.css';

// This script will automatically create a container and render the widget
const initWidget = () => {
    // 1. Create container if it doesn't exist
    let container = document.getElementById('grow-ai-widget-root');
    if (!container) {
        container = document.createElement('div');
        container.id = 'grow-ai-widget-root';
        document.body.appendChild(container);
    }

    // 2. Render React app
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <ChatbotWidget />
        </React.StrictMode>
    );
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
} else {
    initWidget();
}
