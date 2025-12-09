
import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { createChatSession } from '../services/geminiService';
import { Feature, ChatMessage } from '../types';
import { Send, Bot, User, X, Sparkles, Mic, Trash2, Clipboard } from 'lucide-react';

interface AIChatPanelProps {
  feature: Feature;
  onClose: () => void;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({ feature, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = createChatSession(feature.id);
    setChatSession(session);
    setMessages([{
      role: 'model',
      text: "Hi! I'm your NFSU Content Assistant. Need help drafting a Newsletter post or a Job description?",
      timestamp: Date.now()
    }]);
  }, [feature.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string = inputText) => {
    if (!text.trim() || !chatSession) return;

    const userMsg: ChatMessage = { role: 'user', text: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg.text });
      setMessages(prev => [...prev, { role: 'model', text: result.text || "Error", timestamp: Date.now() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection error.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-brand-dark text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Bot size={24} className="text-brand-orange" />
            <h2 className="font-bold text-lg">Content Assistant</h2>
          </div>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-brand-dark text-white rounded-br-none' : 'bg-white shadow-sm rounded-bl-none text-slate-700'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-xs text-slate-400 p-2">Drafting...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="E.g., Write a post about the Forensic Science seminar..."
              className="flex-1 p-3 bg-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-brand-orange/50"
            />
            <button onClick={() => handleSend()} className="p-3 bg-brand-orange text-white rounded-xl hover:bg-orange-600"><Send size={20}/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatPanel;
