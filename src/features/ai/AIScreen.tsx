import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  Bot,
  User,
  Cpu,
  Cloud,
  Plus,
  Sparkles,
  Shield,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react';
import type { InferenceMode } from '../../lib/ai/types';

export const AIScreen: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createConversation,
    sendMessage,
    isGenerating,
    caps,
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedMode, setSelectedMode] = useState<InferenceMode>('prefer_on_device');
  const [isLocalOnly, setIsLocalOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentConversation =
    conversations.find((c) => c.id === currentConversationId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, isGenerating]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isGenerating) return;
    const text = inputPrompt.trim();
    setInputPrompt('');
    await sendMessage(text, {
      mode: selectedMode,
      localOnly: isLocalOnly,
    });
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Quelles sont mes priorités immédiates et comment les organiser ?',
    'Explique la synergie entre Gemini Nano local et Firebase AI Logic cloud.',
    'Aide-moi à préparer ma candidature pour le hackathon #BuildHybridAI.',
  ];

  return (
    <div className="ai-chat-layout">
      {/* Colonne latérale d'historique des discussions */}
      <aside className={`ai-history-panel ${showHistoryMobile ? 'open' : ''}`}>
        <div className="history-header">
          <div className="flex-align-center gap-2">
            <MessageSquare size={16} className="icon-gold" />
            <span className="history-title">Conversations</span>
          </div>
          <button
            className="btn-new-chat"
            onClick={() => {
              createConversation();
              setShowHistoryMobile(false);
            }}
            title="Démarrer une nouvelle discussion"
          >
            <Plus size={16} />
            <span>Nouveau</span>
          </button>
        </div>

        <div className="conversation-list">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className={`conversation-tab-btn ${conv.id === currentConversationId ? 'active' : ''}`}
              onClick={() => {
                setCurrentConversationId(conv.id);
                setShowHistoryMobile(false);
              }}
            >
              <div className="conv-title-row">
                <span className="conv-title-text">{conv.title}</span>
              </div>
              <span className="conv-date">{conv.lastActive} • {conv.messages.length} msg</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Zone principale de conversation */}
      <main className="ai-main-chat">
        {/* Barre de contrôle du moteur en haut du chat */}
        <div className="ai-controls-bar">
          <button
            className="btn-toggle-history-mobile"
            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
          >
            <MessageSquare size={16} />
            <span>Historique</span>
          </button>

          <div className="engine-selector-group">
            <label className="engine-label">Mode d'inférence :</label>
            <select
              className="engine-select"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as InferenceMode)}
            >
              <option value="prefer_on_device">Auto Hybride (Priorité Local)</option>
              <option value="only_on_device">Strictement Local (Gemini Nano)</option>
              <option value="only_in_cloud">Cloud Exclusif (Firebase AI Logic)</option>
            </select>
          </div>

          <button
            className={`btn-privacy-toggle ${isLocalOnly ? 'active' : ''}`}
            onClick={() => setIsLocalOnly(!isLocalOnly)}
            title="Empêche tout envoi au Cloud, même si le modèle local échoue"
          >
            <Shield size={14} />
            <span className="hide-on-xs">{isLocalOnly ? 'Mode Confidentiel Actif' : 'Confidentiel (Local seul)'}</span>
          </button>
        </div>

        {/* Fil de discussion */}
        <div className="ai-messages-scroll-area">
          {(!currentConversation || currentConversation.messages.length === 0) ? (
            <div className="ai-empty-chat-hero">
              <div className="ai-avatar-large">
                <Sparkles size={28} />
              </div>
              <h2 className="ai-empty-title">Bonjour, je suis ELORA.</h2>
              <p className="ai-empty-desc">
                Votre intelligence personnelle hybride. Posez-moi une question sur vos projets,
                vos documents ou votre organisation.
              </p>

              <div className="quick-suggestions-grid">
                {quickPrompts.map((q, idx) => (
                  <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() => {
                      setInputPrompt(q);
                    }}
                  >
                    <span>"{q}"</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-stream">
              {currentConversation.messages.map((msg) => (
                <div key={msg.id} className={`message-bubble-wrapper ${msg.role}`}>
                  <div className="message-author-avatar">
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  <div className="message-content-container">
                    <div className="message-header-meta">
                      <span className="author-name">
                        {msg.role === 'user' ? 'Vous' : 'ELORA'}
                      </span>
                      <span className="msg-timestamp">{msg.timestamp}</span>

                      {/* Badge certifié de la source d'inférence */}
                      {msg.role === 'assistant' && msg.inferenceSource && (
                        <span className={`inference-tag ${msg.inferenceSource}`}>
                          {msg.inferenceSource === 'on_device' ? (
                            <>
                              <Cpu size={12} />
                              <span>ON-DEVICE</span>
                            </>
                          ) : (
                            <>
                              <Cloud size={12} />
                              <span>CLOUD</span>
                            </>
                          )}
                          {msg.durationMs !== undefined && (
                            <span className="duration-pill">• {msg.durationMs}ms</span>
                          )}
                        </span>
                      )}

                      {msg.role === 'assistant' && (
                        <button
                          className="btn-copy-msg"
                          onClick={() => handleCopyText(msg.id, msg.content)}
                          title="Copier la réponse"
                        >
                          {copiedId === msg.id ? <Check size={13} color="var(--local-green)" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>

                    <div className="message-text-body">
                      {msg.content.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {isGenerating && (
                <div className="message-bubble-wrapper assistant">
                  <div className="message-author-avatar">
                    <Bot size={16} />
                  </div>
                  <div className="message-content-container">
                    <div className="generating-indicator">
                      <span className="generating-dot"></span>
                      <span className="generating-dot"></span>
                      <span className="generating-dot"></span>
                      <span className="generating-label">
                        {selectedMode === 'only_on_device' || isLocalOnly
                          ? 'Inférence locale en cours (Gemini Nano)...'
                          : 'ELORA réfléchit...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Compositeur de message fixe en bas */}
        <div className="ai-composer-wrapper">
          <form className="ai-composer-form" onSubmit={handleSend}>
            <textarea
              className="ai-composer-textarea"
              rows={1}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Écrivez votre message à ELORA..."
            />
            <button
              type="submit"
              className="btn-send-message"
              disabled={!inputPrompt.trim() || isGenerating}
              title="Envoyer le message"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="composer-footer-note">
            <span>
              {caps?.onDeviceStatus === 'readily'
                ? '⚡ Gemini Nano actif localement'
                : '☁️ Firebase AI Logic connecté (Cloud)'}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
