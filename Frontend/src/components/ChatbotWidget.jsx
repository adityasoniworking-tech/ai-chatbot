import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Minimize2, Maximize2, RotateCcw, Pencil, Check, RefreshCw } from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import './ChatbotWidget.css';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api/chat';

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'model', content: 'Hello! I am Grow AI Chatbot, your professional ESG consultant. How can I help you today with sustainability, reporting, or net-zero strategy?' }
    ]);

    const handleNewChat = () => {
        setMessages([
            { role: 'model', content: 'Hello! I am Grow AI Chatbot, your professional ESG consultant. How can I help you today with sustainability, reporting, or net-zero strategy?' }
        ]);
        setInput('');
    };
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');

    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post(API_URL, {
                messages: [...messages, userMessage]
            });

            const modelMessage = { role: 'model', content: response.data.response };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'model', content: 'I apologize, but I am currently experiencing technical difficulties connecting to my knowledge base. Please try again later.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditStart = (idx, content) => {
        setEditingIndex(idx);
        setEditValue(content);
    };

    const handleSaveEdit = async (idx) => {
        if (!editValue.trim()) return;

        // Truncate history at the point of edit
        const newHistory = messages.slice(0, idx);
        const newUserMessage = { role: 'user', content: editValue.trim() };

        setMessages([...newHistory, newUserMessage]);
        setEditingIndex(null);
        setIsLoading(true);

        try {
            const response = await axios.post(API_URL, {
                messages: [...newHistory, newUserMessage]
            });

            const modelMessage = { role: 'model', content: response.data.response };
            setMessages(prev => [...prev, modelMessage]);
        } catch (error) {
            console.error('Edit save error:', error);
            setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I couldn\'t update the response. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`chatbot-container ${isExpanded && isOpen ? 'expanded' : ''}`}>
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    className="chatbot-toggle-btn"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open Chatbot"
                >
                    <MessageCircle size={24} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="chatbot-window shadow-xl border border-gray-200">
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="chatbot-header-title">
                            <div className="status-dot"></div>
                            <h3>Grow AI Chatbot</h3>
                        </div>
                        <div className="chatbot-header-actions">
                            <button
                                className="action-btn"
                                onClick={handleNewChat}
                                aria-label="New Chat"
                                title="New Chat"
                            >
                                <RotateCcw size={18} />
                            </button>
                            <button
                                className="action-btn"
                                onClick={() => setIsExpanded(!isExpanded)}
                                aria-label={isExpanded ? "Minimize" : "Expand"}
                            >
                                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                            <button
                                className="action-btn"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="chatbot-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message-wrapper ${msg.role}`}>
                                {msg.role === 'model' && (
                                    <div className="bot-avatar">G</div>
                                )}
                                <div className={`message ${msg.role} ${editingIndex === idx ? 'editing' : ''}`}>
                                    {msg.role === 'user' ? (
                                        editingIndex === idx ? (
                                            <div className="edit-container">
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(idx);
                                                        if (e.key === 'Escape') setEditingIndex(null);
                                                    }}
                                                />
                                                <div className="edit-actions">
                                                    <button onClick={() => handleSaveEdit(idx)}>
                                                        <Check size={14} /> <span>Save</span>
                                                    </button>
                                                    <button onClick={() => setEditingIndex(null)}>
                                                        <X size={14} /> <span>Cancel</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="user-text-container">
                                                {msg.content}
                                                <button
                                                    className="edit-msg-btn"
                                                    onClick={() => handleEditStart(idx, msg.content)}
                                                    title="Edit question"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="markdown-content">
                                            <Markdown>{msg.content}</Markdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="message-wrapper model">
                                <div className="bot-avatar">G</div>
                                <div className="message model typing-indicator-container">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form className="chatbot-input-area" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about ESG, BRSR, Net-Zero..."
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="send-btn"
                            aria-label="Send Message"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    <div className="chatbot-footer">
                        Powered by Growlity
                    </div>
                </div>
            )}
        </div>
    );
}
