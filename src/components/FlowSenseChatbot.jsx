import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Layers,
  Database
} from "lucide-react";
import { sendChatMessage } from "../api";

const QUICK_PROMPTS = [
  { label: "🗄️ Query MongoDB Database Collections", query: "Show me all collections and documents in our MongoDB database" },
  { label: "📊 How is Stability Score calculated?", query: "How is the FlowSense route stability score calculated?" },
  { label: "🚨 Emergency Helplines (112 / 1033)", query: "What are the emergency helplines for road accidents and highways in India?" },
  { label: "🚑 Emergency Green Corridor Protocol", query: "How does the emergency green corridor work for ambulances?" },
  { label: "🌧️ Driving Safety in Monsoon & Fog", query: "Driving safety precautions in heavy monsoon rains and dense fog" },
  { label: "⚡ Speed Limits on Indian Highways", query: "What are the official speed limits on Indian expressways and national highways?" },
  { label: "⚠️ How to Report a Road Hazard", query: "How do I report a pothole or road hazard on FlowSense?" }
];

export default function FlowSenseChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "bot",
      text: "🤖 **Namaste! I am your FlowSense Smart City AI Copilot.**\n\nI am connected to your live **MongoDB Atlas Cloud** cluster (`flowsense` database). You can ask me about real-time route stability, live collections, emergency helplines (**112** / **1033**), weather safety, or how Traffic Police dispatch Green Corridors.\n\n*Tap any of the quick prompt chips below or type your question!*",
      time: "Just now"
    }
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  // Text to speech helper
  function speakText(text) {
    if (isMuted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const clean = text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
        .replace(/[•#*`_]/g, " ")
        .replace(/\n+/g, ". ");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // Speech synthesis unsupported or blocked
    }
  }

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
      const botText =
        res && res.success && res.reply
          ? res.reply
          : "FlowSense AI Copilot is online. For immediate road assistance, dial National Helpline **112** or NHAI Helpline **1033**.";

      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, botMsg]);
      speakText(botText);
    } catch {
      const fallbackMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: "🚨 **Emergency Assistance:** Dial **112** for all police/medical emergencies, or **1033** for NHAI Highway Assistance. You can also view the [Contact & Helpline Directory](/contact) or inspect our live records in the [MongoDB Platform](/database).",
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

  function handleCopy(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  // Render markdown-like text safely
  function formatBotMessage(text) {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Convert markdown link [text](url) to HTML <a>
      let formatted = line.replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" class="chat-inline-link">$1</a>'
      );
      // Convert **bold** to <strong>
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      // Convert `code` to <code>
      formatted = formatted.replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>');

      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");

      return (
        <span
          key={idx}
          className={`chat-line ${isBullet ? "bullet-line" : ""}`}
          dangerouslySetInnerHTML={{ __html: formatted }}
          style={{
            display: "block",
            marginBottom: line === "" ? "8px" : "3px",
            minHeight: line === "" ? "6px" : "auto"
          }}
        />
      );
    });
  }

  return (
    <>
      {/* FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <div className="chatbot-launcher-wrap">
          <button
            type="button"
            className="chatbot-launcher-btn"
            onClick={() => setIsOpen(true)}
            title="Open FlowSense Smart City AI Copilot"
          >
            <div className="bot-pulse-halo" />
            <div className="bot-icon-hex">
              <Bot size={22} className="bot-icon-anim" />
            </div>
            <div className="launcher-text-wrap">
              <span className="bot-launcher-label">AI Copilot</span>
              <span className="bot-launcher-status">Atlas Online</span>
            </div>
          </button>
        </div>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className={`chatbot-window-card ${isExpanded ? "chatbot-expanded" : ""}`}>
          {/* HEADER */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="bot-avatar-pill">
                <Bot size={18} />
              </div>
              <div className="bot-titles">
                <div className="bot-title-wrap">
                  <h4>FlowSense Smart City AI</h4>
                  <span className="live-dot" title="Connected to MongoDB Atlas" />
                </div>
                <span className="bot-subtitle">Pan-India Real-Time Mobility &amp; Safety Copilot</span>
              </div>
            </div>

            <div className="chatbot-header-actions">
              {/* MUTE / AUDIO TOGGLE */}
              <button
                type="button"
                className={`chatbot-head-btn ${!isMuted ? "head-btn-active" : ""}`}
                onClick={() => {
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (nextMuted && typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                }}
                title={isMuted ? "Enable Voice Narration" : "Mute Voice Narration"}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>

              {/* CLEAR CHAT */}
              <button
                type="button"
                className="chatbot-head-btn"
                onClick={() => {
                  setMessages([
                    {
                      id: `welcome-${Date.now()}`,
                      sender: "bot",
                      text: "🧹 **Chat thread cleared.** Ask me anything about Indian highway navigation, real-time stability scores, emergency helplines, or our live MongoDB Atlas collections!",
                      time: "Just now"
                    }
                  ]);
                }}
                title="Clear Conversation"
              >
                <Trash2 size={15} />
              </button>

              {/* EXPAND / RESTORE */}
              <button
                type="button"
                className="chatbot-head-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Restore Normal Size" : "Expand Copilot"}
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>

              {/* MINIMIZE */}
              <button
                type="button"
                className="chatbot-head-btn btn-close-chat"
                onClick={() => {
                  setIsOpen(false);
                  if (typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                }}
                title="Minimize Copilot"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* MESSAGES BODY */}
          <div className="chatbot-body">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`chat-bubble-row ${isUser ? "row-user" : "row-bot"}`}
                >
                  <div className="chat-avatar">
                    {isUser ? <User size={13} /> : <Bot size={13} />}
                  </div>
                  <div className={`chat-bubble ${isUser ? "bubble-user" : "bubble-bot"}`}>
                    <div className="bubble-text">
                      {isUser ? m.text : formatBotMessage(m.text)}
                    </div>

                    <div className="bubble-meta">
                      <span className="bubble-time">{m.time}</span>
                      {!isUser && (
                        <button
                          type="button"
                          className="bubble-copy-btn"
                          onClick={() => handleCopy(m.text, m.id)}
                          title="Copy Answer"
                        >
                          {copiedId === m.id ? (
                            <Check size={11} className="text-emerald" />
                          ) : (
                            <Copy size={11} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="chat-bubble-row row-bot">
                <div className="chat-avatar">
                  <Bot size={13} />
                </div>
                <div className="chat-bubble bubble-bot typing-bubble">
                  <div className="typing-dots-anim">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="typing-label">Analyzing FlowSense grid...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* QUICK PROMPT CHIPS */}
          <div className="chatbot-quick-chips">
            <div className="chips-scroll-wrap">
              {QUICK_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="chat-chip-btn"
                  onClick={() => handleSend(p.query)}
                  disabled={loading}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* FOOTER INPUT BAR */}
          <div className="chatbot-footer">
            <input
              type="text"
              placeholder="Ask Copilot about routes, MongoDB, helplines, police dispatch..."
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
              title="Send Message"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
