import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  User,
  Plus,
  Sparkles,
  Copy,
  Check,
  MessageSquare,
  Paperclip,
  X,
  FileCode,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
import type { AIRequestAttachment } from '../../lib/ai/types';

export const AIScreen: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createConversation,
    sendMessage,
    isGenerating,
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [attachments, setAttachments] = useState<AIRequestAttachment[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentConversation =
    conversations.find((c) => c.id === currentConversationId) || conversations[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, isGenerating]);

  // Détection du format de fichier
  const getFileBadge = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'html', 'css'].includes(ext || '')) {
      return {
        label: ext?.toUpperCase() || 'CODE',
        icon: <FileCode size={12} className="text-blue-500" />,
        bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      };
    }
    if (['csv', 'xlsx', 'tsv'].includes(ext || '')) {
      return {
        label: 'TABLEUR',
        icon: <FileSpreadsheet size={12} className="text-emerald-500" />,
        bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      };
    }
    return {
      label: ext?.toUpperCase() || 'DOC',
      icon: <FileText size={12} className="text-amber-500" />,
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    };
  };

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
      attachments: currentAtts,
    });
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Quelles sont mes 3 priorités d\'aujourd\'hui et comment m\'organiser ?',
    'Aide-moi à structurer mon plan d\'action pour mon objectif principal.',
    'Analyse mes opportunités sauvegardées et prépare un pitch de candidature.',
  ];

  return (
    <div className="ai-workspace-container">
      {/* Panneau latéral des discussions */}
      <aside className={`ai-threads-sidebar ${showHistoryMobile ? 'open' : ''}`}>
        <div className="threads-header">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--color-accent)]" />
            <span className="text-sm font-bold text-[var(--color-text-main)]">Discussions</span>
          </div>
          <button
            className="p-1.5 rounded-xl hover:bg-[var(--color-bg-surface)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-colors"
            onClick={() => {
              createConversation();
              setShowHistoryMobile(false);
            }}
            title="Nouvelle conversation"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="threads-list">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className={`thread-item-btn ${conv.id === currentConversationId ? 'active' : ''}`}
              onClick={() => {
                setCurrentConversationId(conv.id);
                setShowHistoryMobile(false);
              }}
            >
              <span className="thread-title-text">{conv.title}</span>
              <span className="thread-date-text">{conv.lastActive}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Surface principale de conversation */}
      <section className="ai-chat-canvas">
        {/* Barre supérieure épurée du chat */}
        <div className="chat-top-bar">
          <button
            className="mobile-thread-toggle"
            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
            title="Afficher les discussions"
          >
            <MessageSquare size={16} />
            <span>Historique ({conversations.length})</span>
          </button>

          <div className="chat-status-pill">
            <span className="status-indicator-dot" />
            <span className="text-xs font-semibold text-[var(--color-text-main)]">ELORA AI</span>
          </div>

          <button
            className="desktop-new-chat-btn"
            onClick={() => createConversation()}
          >
            <Plus size={14} />
            <span>Nouvelle discussion</span>
          </button>
        </div>

        {/* Défilement des messages */}
        <div className="chat-stream-viewport">
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div className="chat-welcome-state">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center mx-auto mb-4 border border-[var(--color-accent)]/20 shadow-sm">
                <Sparkles size={28} />
              </div>
              <h2 className="text-2xl font-extrabold text-[var(--color-text-main)] tracking-tight">
                Comment puis-je vous aider aujourd'hui ?
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto mt-2 leading-relaxed">
                ELORA connecte vos projets, vos documents et vos objectifs pour vous offrir un accompagnement sur mesure.
              </p>

              <div className="quick-starters-grid">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="quick-starter-pill"
                    onClick={() => {
                      setInputPrompt(prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="conversation-flow">
              {currentConversation.messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                const isStreamingCurrent = isAssistant && !msg.content && isGenerating;

                return (
                  <div key={msg.id} className={`dialogue-row ${msg.role}`}>
                    <div className="dialogue-avatar">
                      {isAssistant ? (
                        <div className="w-8 h-8 rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex items-center justify-center border border-[var(--color-accent)]/20">
                          <Sparkles size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] flex items-center justify-center border border-[var(--color-border-subtle)]">
                          <User size={16} />
                        </div>
                      )}
                    </div>

                    <div className="dialogue-card">
                      <div className="dialogue-card-header">
                        <span className="author-label">{isAssistant ? 'ELORA' : 'Vous'}</span>
                        <span className="timestamp-label">{msg.timestamp}</span>

                        {isAssistant && msg.content && (
                          <button
                            className="btn-copy-bubble"
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            title="Copier la réponse"
                          >
                            {copiedId === msg.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="dialogue-body">
                        {isStreamingCurrent ? (
                          <div className="flex items-center gap-2 py-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                            <span className="text-xs text-[var(--color-text-muted)]">ELORA formule sa réponse...</span>
                          </div>
                        ) : (
                          msg.content.split('\n\n').map((p, idx) => (
                            <p key={idx} className="mb-2 last:mb-0 leading-relaxed text-sm">
                              {p}
                            </p>
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

        {/* Fichiers joints en attente d'envoi */}
        {attachments.length > 0 && (
          <div className="attachments-staging-strip">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">Pièces jointes :</span>
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => {
                const badge = getFileBadge(att.name);
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-xs font-medium text-[var(--color-text-main)] shadow-sm"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="truncate max-w-[130px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors ml-1"
                    >
                      <X size={13} />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Compositeur flottant */}
        <div className="floating-composer-shell">
          <form className="floating-composer-form" onSubmit={handleSend}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              className="hidden"
              multiple
              accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.pdf"
            />
            <button
              type="button"
              className="composer-action-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un document ou un fichier de code"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
              className="composer-input-area"
              rows={1}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Écrivez votre message ou déposez un fichier..."
            />

            <button
              type="submit"
              className="composer-send-btn"
              disabled={(!inputPrompt.trim() && attachments.length === 0) || isGenerating}
              title="Envoyer"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
