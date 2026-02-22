import ChatbotWidget from './components/ChatbotWidget'
import './App.css'

function App() {
  return (
    <div className="app-container">
      {/* 
        This is a standalone setup for the Grow AI Chatbot.
        The widget is a floating component by default.
      */}
      <ChatbotWidget />
    </div>
  )
}

export default App
