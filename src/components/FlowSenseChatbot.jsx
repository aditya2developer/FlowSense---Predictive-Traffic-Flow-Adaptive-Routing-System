import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  HelpCircle,
  PhoneCall,
  ShieldCheck,
  Minimize2,
  Trash2,
  ChevronRight
} from "lucide-react";
import { sendChatMessage } from "../api";

const QUICK_PROMPTS = [
  "🚨 National Emergency Helplines (112 / 1033)",
  "📊 How is the Stability Score calculated?",
  "🌧️ Driving safety in heavy monsoon / fog",
  "🚑 How does Emergency Green Corridor work?",
  "🛣️ Speed limits on Indian National Highways",
  "📝 How to report a pothole or hazard?"
];

export default function FlowSenseChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "bot",
      text: "👋 **Namaste! I am your FlowSense Smart City AI Copilot.**\n\nI can assist you with real-time route stability, Pan-India highway navigation, emergency helplines, weather safety tips, and reporting road hazards across all Indian cities and states. How can I help you today?",
      time: "Just now"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(textToSend) {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendChatMessage(query);
      const botText = res.success && res.reply ? res.reply : "I am connected to the FlowSense Pan-India grid. For immediate assistance, dial National Emergency Helpline **112** or NHAI Highway Helpline **1033**.";

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: "🚨 **Emergency Contacts:** Dial **112** for all emergencies, or **1033** for NHAI Highway Assistance. You can also visit our [Contact & Helpline Directory](/contact).",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatBotMessage(text) {
    // Basic Markdown format helper for bold, bullet points, linebreaks
    const parts = text.split("\n").map((line, idx) => {
      // Process bold **text**
      const formattedLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      return (
        <span
          key={idx}
          dangerouslySetInnerHTML={{ __html: formattedLine }}
          style={{ display: "block", marginBottom: line === "" ? "8px" : "2px" }}
        />
      );
    });
    return parts;
  }

  return (
    <>
      {/* FLOATING CHATBOT LAUNCHER BUTTON (Bottom-Right) */}
      {!isOpen && (
        <div className="chatbot-launcher-wrap">
          <button
            type="button"
            className="chatbot-launcher-btn"
            onClick={() => setIsOpen(true)}
            title="Open FlowSense AI Smart City Copilot"
          >
            <div className="bot-pulse-halo" />
            <Bot size={22} className="bot-icon-anim" />
            <span className="bot-launcher-label">AI Copilot</span>
          </button>
        </div>
      )}

      {/* FLOATING CHAT WINDOW */}
      {isOpen && (
        <div className="chatbot-window-card">
          {/* HEADER */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="bot-avatar-pill">
                <Bot size={18} />
              </div>
              <div>
                <div className="bot-title-wrap">
                  <h4>FlowSense Smart City Copilot</h4>
                  <span className="live-dot" />
                </div>
                <span className="bot-subtitle">Pan-India Real-Time Highway &amp; Safety AI</span>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-head-btn"
                onClick={() => setMessages([{
                  id: "welcome-1",
                  sender: "bot",
                  text: "Chat cleared. Ask me anything about Indian roads, real-time stability scores, emergency helplines, or traffic police operations!",
                  time: "Just now"
                }])}
                title="Clear Chat"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                className="chatbot-head-btn"
                onClick={() => setIsOpen(false)}
                title="Minimize Chat"
              >
                <Minimize2 size={15} />
              </button>
            </div>
          </div>

          {/* MESSAGES THREAD */}
          <div className="chatbot-body">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble-row ${m.sender === "user" ? "row-user" : "row-bot"}`}
              >
                <div className="chat-avatar">
                  {m.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`chat-bubble ${m.sender === "user" ? "bubble-user" : "bubble-bot"}`}>
                  <div className="bubble-text">
                    {m.sender === "bot" ? formatBotMessage(m.text) : m.text}
                  </div>
                  <span className="bubble-time">{m.time}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-bubble-row row-bot">
                <div className="chat-avatar"><Bot size={14} /></div>
                <div className="chat-bubble bubble-bot typing-bubble">
                  <span className="dot-typing" />
                  <span className="dot-typing" />
                  <span className="dot-typing" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div className="chatbot-quick-chips">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="chat-chip-btn"
                onClick={() => handleSend(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
          </div>

          {/* INPUT BAR */}
          <div className="chatbot-footer">
            <input
              type="text"
              placeholder="Ask anything about routes, weather, helplines, traffic rules..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              type="button"
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
