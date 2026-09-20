'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react'

const API_BASE = 'https://5icz9ihs21.execute-api.ap-south-1.amazonaws.com/Prod'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Focus input when chat opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: newMessages.slice(-20),
        }),
      })

      if (!res.ok) throw new Error('Request failed')
      const data = await res.json()
      const botMsg: Message = { role: 'assistant', content: data.reply || 'Sorry, I could not generate a response.' }
      setMessages((prev) => [...prev, botMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    await sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        aria-label={open ? 'Close chat' : 'Open chat'}
        onClick={() => setOpen(!open)}
        className="chat-fab"
      >
        <span className={`chat-fab-icon ${open ? 'chat-fab-icon-hidden' : ''}`}>
          <MessageCircle className="size-6" />
        </span>
        <span className={`chat-fab-icon ${!open ? 'chat-fab-icon-hidden' : ''}`}>
          <X className="size-6" />
        </span>
        {!open && messages.length === 0 && (
          <span className="chat-fab-badge">
            <Sparkles className="size-3" />
          </span>
        )}
      </button>

      {/* Chat panel */}
      <div className={`chat-panel ${open ? 'chat-panel-open' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-header-avatar">
              <Bot className="size-5" />
            </div>
            <div>
              <h3 className="chat-header-title">Nourish AI</h3>
              <p className="chat-header-subtitle">Ask me anything about food donation</p>
            </div>
          </div>
          <button aria-label="Close chat" onClick={() => setOpen(false)} className="chat-close-btn">
            <X className="size-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <Bot className="size-8" />
              </div>
              <h4 className="chat-welcome-title">Hi! I&apos;m the Nourish Assistant 👋</h4>
              <p className="chat-welcome-text">
                I can help you with donating food, claiming donations, and using the app. Ask me anything!
              </p>
              <div className="chat-suggestions">
                {[
                  'How do I donate food?',
                  'How can an NGO claim a donation?',
                  'What types of food can I donate?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="chat-suggestion-btn"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-bot'}`}
            >
              <div className={`chat-message-avatar ${msg.role === 'user' ? 'chat-avatar-user' : 'chat-avatar-bot'}`}>
                {msg.role === 'user' ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
              </div>
              <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message chat-message-bot">
              <div className="chat-message-avatar chat-avatar-bot">
                <Bot className="size-3.5" />
              </div>
              <div className="chat-bubble chat-bubble-bot">
                <span className="chat-typing">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question..."
            disabled={loading}
            className="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="chat-send-btn"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </>
  )
}
