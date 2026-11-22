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
  Volume2,
  VolumeX,
  Bot,
  Compass,
  Target,
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
  const [speakingId, setSpeakingId] = useState<string | null>(null);
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
        icon: <FileCode size={13} className="text-blue-500" />,
        bg: 'bg-blue-500/15 text-blue-500 border border-blue-500/25',
      };
    }
    if (['csv', 'xlsx', 'tsv'].includes(ext || '')) {
      return {
        label: 'TABLEUR',
        icon: <FileSpreadsheet size={13} className="text-emerald-500" />,
        bg: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25',
      };
    }
    return {
      label: ext?.toUpperCase() || 'DOC',
      icon: <FileText size={13} className="text-amber-500" />,
      bg: 'bg-amber-500/15 text-amber-500 border border-amber-500/25',
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

  const handleSpeak = (id: string, text: string) => {
    if ('speechSynthesis' in window) {
      if (speakingId === id) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        return;
      }
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'fr-FR';
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    }
  };

  const quickStarters = [
    {
      title: 'Priorités du Jour',
      prompt: 'Quelles sont mes 3 priorités d\'aujourd\'hui et comment m\'organiser ?',
      icon: <Target size={16} className="text-[#FF6A00]" />,
    },
    {
      title: 'Stratégie Hackathon',
      prompt: 'Aide-moi à structurer mon plan d\'action pour remporter le Hackathon Firebase #BuildHybridAI.',
      icon: <Sparkles size={16} className="text-amber-500" />,
    },
    {
      title: 'Veille & Opportunités',
      prompt: 'Analyse mes opportunités sauvegardées et prépare un pitch de candidature sur-mesure.',
      icon: <Compass size={16} className="text-blue-500" />,
    },
  ];

  return (
    <div className="ai-workspace-container bg-[var(--color-bg-base)]">
      {/* Panneau latéral des discussions */}
      <aside className={`ai-threads-sidebar ${showHistoryMobile ? 'open' : ''} bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)]`}>
        <div className="threads-header p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[#FF6A00]" />
            <span className="text-sm font-bold text-[var(--color-text-main)]">Discussions</span>
          </div>
          <button
            className="p-2 rounded-xl hover:bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
            onClick={() => {
              createConversation();
              setShowHistoryMobile(false);
            }}
            title="Nouvelle conversation"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="threads-list flex-1 overflow-y-auto p-3 space-y-1.5">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer ${
                conv.id === currentConversationId
                  ? 'bg-[var(--color-bg-surface-elevated)] border border-[#FF6A00]/40 shadow-sm'
                  : 'hover:bg-[var(--color-bg-surface-elevated)] border border-transparent'
              }`}
              onClick={() => {
                setCurrentConversationId(conv.id);
                setShowHistoryMobile(false);
              }}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${conv.id === currentConversationId ? 'bg-[#FF6A00]' : 'bg-[var(--color-border-strong)]'}`} />
                <span className="text-xs font-bold text-[var(--color-text-main)] truncate block">
                  {conv.title}
                </span>
              </div>
              <span className="text-[10px] text-[var(--color-text-muted)] mt-1 block pl-4">
                {conv.lastActive}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Surface principale de conversation */}
      <section className="ai-chat-canvas flex-1 flex flex-col h-full min-w-0 bg-[var(--color-bg-base)] relative">
        {/* Barre supérieure du chat */}
        <div className="chat-top-bar p-4 px-6 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-bg-surface)] backdrop-blur-md">
          <button
            className="mobile-thread-toggle lg:hidden flex items-center gap-2 text-xs font-bold text-[var(--color-text-main)] px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] cursor-pointer"
            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
          >
            <MessageSquare size={15} />
            <span>Historique ({conversations.length})</span>
          </button>

          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-[var(--color-text-main)] flex items-center gap-1.5">
              <span>ELORA AI</span>
              <span className="text-[10px] text-[var(--color-text-muted)] font-normal hidden sm:inline">• Gemini Nano & Cloud</span>
            </span>
          </div>

          <button
            className="desktop-new-chat-btn hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-main)] hover:border-[#FF6A00] transition-colors cursor-pointer"
            onClick={() => createConversation()}
          >
            <Plus size={14} />
            <span>Nouvelle discussion</span>
          </button>
        </div>

        {/* Défilement des messages */}
        <div className="chat-stream-viewport flex-1 overflow-y-auto p-4 sm:p-6 pb-32">
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div className="max-w-2xl mx-auto my-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#FF6A00]/20 to-amber-500/20 text-[#FF6A00] flex items-center justify-center mx-auto mb-6 border border-[#FF6A00]/30 shadow-xl shadow-orange-500/10">
                <Sparkles size={40} className="animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-text-main)] tracking-tight">
                Intelligence Personnelle ELORA
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-lg mx-auto mt-2 leading-relaxed">
                Connectée à vos projets, vos documents et vos opportunités. Traitement hybride confidentiel local (Gemini Nano) et Cloud (Firebase AI Logic).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 text-left">
                {quickStarters.map((starter, idx) => (
                  <button
                    key={idx}
                    className="p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[#FF6A00] hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                    onClick={() => {
                      setInputPrompt(starter.prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-[var(--color-bg-surface-elevated)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      {starter.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--color-text-main)] group-hover:text-[#FF6A00] transition-colors">
                        {starter.title}
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-1 line-clamp-2 leading-snug">
                        {starter.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {currentConversation.messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                const isStreamingCurrent = isAssistant && !msg.content && isGenerating;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className="shrink-0 mt-1">
                      {isAssistant ? (
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#FF6A00] to-amber-500 text-white flex items-center justify-center shadow-md">
                          <Bot size={18} />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-strong)] text-[var(--color-text-main)] flex items-center justify-center shadow-sm">
                          <User size={18} />
                        </div>
                      )}
                    </div>

                    {/* Bulle de Message */}
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] p-4 sm:p-5 rounded-3xl shadow-md ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-[#2E2B27] to-[#1C1A18] text-white rounded-tr-sm border border-white/10'
                          : 'bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] rounded-tl-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${msg.role === 'user' ? 'text-amber-300' : 'text-[#FF6A00]'}`}>
                          {isAssistant ? 'ELORA' : 'Vous'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--color-text-muted)] opacity-80">
                            {msg.timestamp}
                          </span>
                          {isAssistant && msg.content && (
                            <>
                              <button
                                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                                onClick={() => handleSpeak(msg.id, msg.content)}
                                title={speakingId === msg.id ? 'Arrêter la lecture' : 'Écouter'}
                              >
                                {speakingId === msg.id ? <VolumeX size={13} className="text-[#FF6A00]" /> : <Volume2 size={13} />}
                              </button>
                              <button
                                className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                                onClick={() => handleCopyText(msg.id, msg.content)}
                                title="Copier"
                              >
                                {copiedId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {isStreamingCurrent ? (
                          <div className="flex items-center gap-2 py-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF6A00] animate-ping" />
                            <span className="text-xs font-semibold text-[var(--color-text-muted)]">ELORA formule sa réponse...</span>
                          </div>
                        ) : (
                          msg.content
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
          <div className="absolute bottom-20 left-4 right-4 max-w-3xl mx-auto p-3 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-xl z-20 flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-[var(--color-text-muted)] mr-1">Fichiers à analyser :</span>
            {attachments.map((att, i) => {
              const badge = getFileBadge(att.name);
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-medium text-[var(--color-text-main)] shadow-sm"
                >
                  {badge.icon}
                  <span className="truncate max-w-[140px] font-mono text-[11px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors ml-1 cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Compositeur flottant Apple-grade */}
        <div className="absolute bottom-5 left-4 right-4 max-w-3xl mx-auto z-20">
          {/* Input fichier caché de façon STRICTE (jamais visible sur la page) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            className="hidden"
            multiple
            accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.pdf"
          />

          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 p-2 sm:p-2.5 rounded-full bg-[var(--color-bg-surface)] border-2 border-[var(--color-border-strong)] focus-within:border-[#FF6A00] shadow-2xl backdrop-blur-xl transition-all"
          >
            <button
              type="button"
              className="p-2.5 rounded-full text-[var(--color-text-muted)] hover:text-[#FF6A00] hover:bg-[var(--color-bg-surface-elevated)] transition-all cursor-pointer shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un document ou un fichier de code"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              ref={textareaRef}
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
              className="flex-1 bg-transparent py-2 px-2 text-xs sm:text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none resize-none max-h-32"
            />

            <button
              type="submit"
              disabled={(!inputPrompt.trim() && attachments.length === 0) || isGenerating}
              className={`p-3 rounded-full text-white shadow-lg transition-all shrink-0 cursor-pointer ${
                (!inputPrompt.trim() && attachments.length === 0) || isGenerating
                  ? 'bg-neutral-600 opacity-40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] hover:shadow-orange-500/30 hover:scale-105 active:scale-95'
              }`}
              title="Envoyer à ELORA"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
