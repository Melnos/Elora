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
  Paperclip,
  X,
  FileText,
} from 'lucide-react';
import type { InferenceMode, AIRequestAttachment } from '../../lib/ai/types';

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
  const [attachments, setAttachments] = useState<AIRequestAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentConversation =
    conversations.find((c) => c.id === currentConversationId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, isGenerating]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            mimeType: file.type || 'text/plain',
            data: content,
          },
        ]);
      };
      reader.readAsText(file);
    }
    // Réinitialiser la valeur de l'input pour permettre le ré-upload
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputPrompt.trim() && attachments.length === 0) || isGenerating) return;
    const text = inputPrompt.trim();
    const currentAtts = [...attachments];
    setInputPrompt('');
    setAttachments([]);

    await sendMessage(text, {
      mode: selectedMode,
      localOnly: isLocalOnly,
      attachments: currentAtts,
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
              <span className="conv-date">{conv.lastActive}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Zone principale de conversation */}
      <main className="ai-chat-main">
        {/* Barre de contrôle du routage IA */}
        <div className="ai-routing-toolbar">
          <button
            className="btn-toggle-history-mobile"
            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
            title="Historique des conversations"
          >
            <MessageSquare size={16} />
            <span>Historique ({conversations.length})</span>
          </button>

          <div className="routing-selectors">
            {/* Sélecteur de mode d'inférence */}
            <div className="mode-selector-group">
              <label htmlFor="inference-mode" className="mode-label">
                Routage IA :
              </label>
              <select
                id="inference-mode"
                className="mode-select"
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as InferenceMode)}
              >
                <option value="prefer_on_device">⚡ Hybride auto (Priorité Nano)</option>
                <option value="only_on_device">🔒 Strictement local (Nano seul)</option>
                <option value="prefer_in_cloud">☁️ Cloud prioritaire (Gemini 3.5)</option>
                <option value="only_in_cloud">☁️ Cloud strict (Firebase AI Logic)</option>
              </select>
            </div>

            {/* Bascule confidentialité absolue */}
            <button
              type="button"
              className={`privacy-toggle-btn ${isLocalOnly ? 'active' : ''}`}
              onClick={() => setIsLocalOnly(!isLocalOnly)}
              title="Interdire tout transfert vers le cloud pour cette conversation"
            >
              <Shield size={14} />
              <span>Zéro fuite Cloud</span>
            </button>
          </div>
        </div>

        {/* Fil des messages */}
        <div className="chat-messages-scroll-area">
          {(!currentConversation || currentConversation.messages.length === 0) ? (
            <div className="chat-empty-state">
              <div className="empty-state-icon">
                <Sparkles size={32} />
              </div>
              <h2 className="empty-title">ELORA • Intelligence Personnelle</h2>
              <p className="empty-description">
                Posez une question, confiez une tâche d'organisation ou explorez vos projets. ELORA
                combine votre mémoire active locale avec la puissance de Gemini Nano et Firebase AI Logic.
              </p>
              <div className="quick-suggestions-grid">
                {quickPrompts.map((qp, idx) => (
                  <button
                    key={idx}
                    className="quick-suggestion-card"
                    onClick={() => {
                      setInputPrompt(qp);
                    }}
                  >
                    <span>{qp}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {currentConversation.messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                const isStreamingCurrent = isAssistant && !msg.content && isGenerating;

                return (
                  <div key={msg.id} className={`message-bubble-wrapper ${msg.role}`}>
                    <div className="message-author-avatar">
                      {isAssistant ? <Bot size={16} /> : <User size={16} />}
                    </div>

                    <div className="message-content-container">
                      <div className="message-header-meta">
                        <span className="author-name">
                          {isAssistant ? 'ELORA' : 'Vous'}
                        </span>
                        <span className="msg-timestamp">{msg.timestamp}</span>

                        {/* Badge certifié de la source d'inférence */}
                        {isAssistant && msg.inferenceSource && (
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

                        {isAssistant && msg.content && (
                          <button
                            className="btn-copy-msg"
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            title="Copier la réponse"
                          >
                            {copiedId === msg.id ? (
                              <Check size={13} color="var(--local-green)" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="message-text-body">
                        {isStreamingCurrent ? (
                          <div className="generating-indicator">
                            <span className="generating-dot"></span>
                            <span className="generating-dot"></span>
                            <span className="generating-dot"></span>
                            <span className="generating-label">
                              {selectedMode === 'only_on_device' || isLocalOnly
                                ? 'Inférence locale en cours (Gemini Nano)...'
                                : 'Génération en cours...'}
                            </span>
                          </div>
                        ) : (
                          msg.content.split('\n\n').map((paragraph, pIdx) => (
                            <p key={pIdx}>{paragraph}</p>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Aperçu des pièces jointes */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-[var(--color-bg-surface-elevated)] border-t border-[var(--color-border-subtle)] flex flex-wrap gap-2 items-center">
            <span className="text-xs text-[var(--color-text-muted)] font-medium">Documents joints :</span>
            {attachments.map((att, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)]"
              >
                <FileText size={12} className="text-[var(--color-accent)]" />
                <span className="truncate max-w-[140px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="p-0.5 hover:text-red-500 text-[var(--color-text-muted)]"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Compositeur de message fixe en bas */}
        <div className="ai-composer-wrapper">
          <form className="ai-composer-form" onSubmit={handleSend}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept=".txt,.md,.json,.csv,.js,.ts,.py,.html"
            />
            <button
              type="button"
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors rounded-lg"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un document texte, markdown ou code pour analyse"
            >
              <Paperclip size={18} />
            </button>

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
              disabled={(!inputPrompt.trim() && attachments.length === 0) || isGenerating}
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
