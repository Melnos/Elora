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
  Zap,
  Cloud,
  Trash2,
  Edit3,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { AIRequestAttachment } from '../../lib/ai/types';

export const AIScreen: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
    isGenerating,
    executeProposedAction,
    rejectProposedAction,
  } = useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
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
    if (['ts', 'tsx', 'js', 'jsx', 'py', 'json', 'html', 'css', 'sql'].includes(ext || '')) {
      return {
        label: ext?.toUpperCase() || 'CODE',
        icon: <FileCode size={12} className="text-[var(--color-accent)] shrink-0" />,
      };
    }
    if (['csv', 'xlsx', 'tsv'].includes(ext || '')) {
      return {
        label: 'TABLEUR',
        icon: <FileSpreadsheet size={12} className="text-[var(--color-accent)] shrink-0" />,
      };
    }
    return {
      label: ext?.toUpperCase() || 'DOC',
      icon: <FileText size={12} className="text-[var(--color-accent)] shrink-0" />,
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
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

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-[var(--color-text-main)]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-[var(--color-bg-surface-elevated)] font-mono text-[11px] text-[var(--color-accent)] border border-[var(--color-border-subtle)] break-all">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Rendu structuré haute-fidélité des messages (Code blocks, Blockquotes, Tables, Listes)
  const renderFormattedMessage = (content: string, msgId: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const segments: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockCounter = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const textBefore = content.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        segments.push(renderTextSegment(textBefore, `${msgId}-txt-${blockCounter}`));
      }

      const language = match[1] || 'texte';
      const code = match[2];
      const codeKey = `${msgId}-code-${blockCounter}`;

      segments.push(
        <div key={codeKey} className="my-3 rounded-xl overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] max-w-full min-w-0">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-bg-surface-elevated)] border-b border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-muted)] font-mono">
            <span className="font-semibold uppercase tracking-wider">{language}</span>
            <button
              onClick={() => handleCopyCode(codeKey, code)}
              className="flex items-center gap-1 hover:text-[var(--color-text-main)] transition-colors py-0.5 px-1.5 rounded cursor-pointer"
              title="Copier le code"
            >
              {copiedCodeId === codeKey ? (
                <>
                  <Check size={11} className="text-[var(--color-accent)]" />
                  <span className="text-[var(--color-accent)] font-sans">Copié</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span className="font-sans">Copier</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 sm:p-3.5 text-xs font-mono text-[var(--color-text-main)] overflow-x-auto max-w-full leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
      blockCounter++;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText.trim() || segments.length === 0) {
      segments.push(renderTextSegment(remainingText || content, `${msgId}-txt-end`));
    }

    return <div className="space-y-2 min-w-0 max-w-full">{segments}</div>;
  };

  const renderTextSegment = (text: string, keyPrefix: string) => {
    const lines = text.split('\n');
    return (
      <div key={keyPrefix} className="space-y-1 min-w-0 max-w-full">
        {lines.map((line, idx) => {
          const trimmed = line.trim();

          // Titre niveau 3
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-sm text-[var(--color-text-main)] mt-2.5 mb-1 break-words [overflow-wrap:anywhere]">
                {formatInline(line.slice(4))}
              </h4>
            );
          }

          // Titre niveau 2
          if (line.startsWith('## ')) {
            return (
              <h3 key={idx} className="font-extrabold text-base text-[var(--color-text-main)] mt-3 mb-1.5 break-words [overflow-wrap:anywhere]">
                {formatInline(line.slice(3))}
              </h3>
            );
          }

          // Citation / Bloc de réflexion
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="pl-3 py-1 my-1.5 border-l-2 border-l-[var(--color-accent)] text-xs italic text-[var(--color-text-muted)] bg-[var(--color-accent-bg)] rounded-r-lg break-words [overflow-wrap:anywhere] max-w-full">
                {formatInline(line.slice(2))}
              </blockquote>
            );
          }

          // Ligne de liste à puce
          if (trimmed.match(/^(\*|-|\d+\.)\s/)) {
            const itemText = trimmed.replace(/^(\*|-|\d+\.)\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 my-0.5 pl-1 text-xs sm:text-sm min-w-0 max-w-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0 mt-2" />
                <span className="flex-1 leading-relaxed break-words [overflow-wrap:anywhere]">{formatInline(itemText)}</span>
              </div>
            );
          }

          // Ligne vide
          if (trimmed === '') {
            return <div key={idx} className="h-1.5" />;
          }

          // Paragraphe classique
          return (
            <p key={idx} className="my-0.5 leading-relaxed text-xs sm:text-sm break-words [overflow-wrap:anywhere] max-w-full">
              {formatInline(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const quickStarters = [
    {
      title: 'Priorités du Jour',
      prompt: 'Quelles sont mes 3 priorités d\'aujourd\'hui et comment m\'organiser ?',
      icon: <Target size={14} className="text-[var(--color-accent)]" />,
    },
    {
      title: 'Stratégie Hackathon',
      prompt: 'Aide-moi à structurer mon plan d\'action pour remporter le Hackathon Firebase #BuildHybridAI.',
      icon: <Sparkles size={14} className="text-[var(--color-accent)]" />,
    },
    {
      title: 'Veille & Opportunités',
      prompt: 'Analyse mes opportunités sauvegardées et prépare un pitch de candidature sur-mesure.',
      icon: <Compass size={14} className="text-[var(--color-accent)]" />,
    },
  ];

  const contextualPrompts = [
    { label: 'Guide Firebase AI Logic', prompt: 'Résume les bonnes pratiques d\'intégration de Firebase AI Logic avec Gemini Nano et Cloud.' },
    { label: 'Objectif Hackathon', prompt: 'Quelles sont les prochaines étapes concrètes pour finaliser le projet du Hackathon ?' },
    { label: 'Priorités Planner', prompt: 'Optimise l\'ordre d\'exécution de mes tâches en cours pour ma session Deep Work.' },
  ];

  return (
    <div className="ai-workspace-container bg-[var(--color-bg-base)] w-full overflow-hidden">
      {/* Fond sombre pour fermer l'historique sur mobile */}
      {showHistoryMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-24 lg:hidden"
          onClick={() => setShowHistoryMobile(false)}
        />
      )}

      {/* Panneau latéral des discussions */}
      <aside className={`ai-threads-sidebar ${showHistoryMobile ? 'open' : ''} bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)]`}>
        <div className="threads-header p-3.5 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--color-accent)]" />
            <span className="text-xs font-bold text-[var(--color-text-main)]">Discussions</span>
          </div>
          <button
            className="p-1.5 rounded-lg hover:bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
            onClick={() => {
              createConversation();
              setShowHistoryMobile(false);
            }}
            title="Nouvelle conversation"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="threads-list flex-1 overflow-y-auto p-2.5 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`w-full group flex items-center justify-between p-2.5 rounded-xl transition-all ${
                conv.id === currentConversationId
                  ? 'bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-strong)]'
                  : 'hover:bg-[var(--color-bg-surface-elevated)] border border-transparent'
              }`}
            >
              <button
                className="flex-1 text-left min-w-0 cursor-pointer"
                onClick={() => {
                  setCurrentConversationId(conv.id);
                  setShowHistoryMobile(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conv.id === currentConversationId ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'}`} />
                  <span className="text-xs font-medium text-[var(--color-text-main)] truncate block">
                    {conv.title}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block pl-3.5">
                  {conv.lastActive}
                </span>
              </button>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-1">
                <button
                  className="p-1 rounded hover:bg-[var(--color-bg-base)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
                  title="Renommer la discussion"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newTitle = window.prompt('Nouveau titre de la discussion :', conv.title);
                    if (newTitle) renameConversation(conv.id, newTitle);
                  }}
                >
                  <Edit3 size={11} />
                </button>
                {conversations.length > 1 && (
                  <button
                    className="p-1 rounded hover:bg-rose-500/10 text-[var(--color-text-muted)] hover:text-rose-500 cursor-pointer"
                    title="Supprimer la discussion"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Supprimer cette discussion ?')) {
                        deleteConversation(conv.id);
                      }
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Surface principale de conversation */}
      <section className="ai-chat-canvas flex-1 flex flex-col h-full min-w-0 bg-[var(--color-bg-base)] relative overflow-hidden">
        {/* Barre supérieure du chat */}
        <div className="chat-top-bar p-3 px-3.5 sm:px-6 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-bg-surface)] shrink-0 gap-2">
          <button
            className="mobile-thread-toggle lg:hidden flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-main)] px-2.5 py-1 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] cursor-pointer shrink-0"
            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
          >
            <MessageSquare size={13} />
            <span>Historique ({conversations.length})</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] shrink-0">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              ELORA AI <span className="text-[10px] text-[var(--color-text-muted)] font-normal hidden sm:inline">• Assistant Hybride (Local & Cloud)</span>
            </span>
          </div>

          <button
            className="desktop-new-chat-btn hidden lg:flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors cursor-pointer shrink-0"
            onClick={() => createConversation()}
          >
            <Plus size={13} />
            <span>Nouvelle discussion</span>
          </button>
        </div>

        {/* Défilement des messages (Largeur enrichie et lecture aérée) */}
        <div className="chat-stream-viewport flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 pb-40 lg:pb-32">
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div className="max-w-2xl mx-auto my-8 sm:my-12 text-center px-2">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[var(--color-accent-bg)] text-[var(--color-accent)] flex items-center justify-center mx-auto mb-4 border border-[var(--color-accent)]/20 shadow-xs">
                <Sparkles size={26} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                Intelligence Personnelle ELORA
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-lg mx-auto mt-2 leading-relaxed">
                Connectée à vos projets, vos documents et vos opportunités. Traitement hybride confidentiel local (Gemini Nano) et Cloud (Firebase AI Logic).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 text-left">
                {quickStarters.map((starter, idx) => (
                  <button
                    key={idx}
                    className="p-3.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all flex flex-col justify-between group cursor-pointer shadow-2xs"
                    onClick={() => {
                      setInputPrompt(starter.prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-surface-elevated)] flex items-center justify-center mb-2.5">
                      {starter.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors">
                        {starter.title}
                      </h4>
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2 leading-snug">
                        {starter.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 px-1 sm:px-4">
              {currentConversation.messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                const isStreamingCurrent = isAssistant && !msg.content && isGenerating;
                const isLocalSource = msg.inferenceSource === 'on_device';

                return (
                  <div
                    key={msg.id}
                    className={`w-full min-w-0 flex items-start gap-2 sm:gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar sobre */}
                    <div className="shrink-0 mt-0.5">
                      {isAssistant ? (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[var(--color-accent-bg)] border border-[var(--color-accent)]/20 text-[var(--color-accent)] flex items-center justify-center">
                          <Bot size={15} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] flex items-center justify-center">
                          <User size={15} />
                        </div>
                      )}
                    </div>

                    {/* Bulle de Message */}
                    <div
                      className={`min-w-0 [overflow-wrap:anywhere] ${
                        msg.role === 'user'
                          ? 'max-w-[85%] sm:max-w-[78%] p-3.5 sm:p-4 rounded-2xl bg-[var(--color-text-main)] text-[var(--color-bg-base)]'
                          : 'flex-1 max-w-[calc(100%-2.25rem)] sm:max-w-[90%] lg:max-w-[88%] p-3.5 sm:p-5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2 pb-1 border-b border-[var(--color-border-subtle)]/40">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${msg.role === 'user' ? 'opacity-80' : 'text-[var(--color-accent)]'}`}>
                            {isAssistant ? 'ELORA' : 'Vous'}
                          </span>
                          {/* Badge de provenance réelle */}
                          {isAssistant && msg.inferenceSource && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] flex items-center gap-1 shrink-0">
                              {isLocalSource ? (
                                <>
                                  <Zap size={9} className="text-[var(--color-accent)]" />
                                  <span>Nano Local{msg.durationMs ? ` (${msg.durationMs}ms)` : ''}</span>
                                </>
                              ) : (
                                <>
                                  <Cloud size={9} />
                                  <span>Cloud{msg.modelName ? ` · ${msg.modelName.replace('Google Gemini (', '').replace(')', '').replace('Firebase AI Logic ', '')}` : ''}{msg.durationMs ? ` (${msg.durationMs}ms)` : ''}</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] opacity-70">
                            {msg.timestamp}
                          </span>
                          {isAssistant && msg.content && (
                            <>
                              <button
                                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                                onClick={() => handleSpeak(msg.id, msg.content)}
                                title={speakingId === msg.id ? 'Arrêter la lecture' : 'Écouter'}
                              >
                                {speakingId === msg.id ? <VolumeX size={12} className="text-[var(--color-accent)]" /> : <Volume2 size={12} />}
                              </button>
                              <button
                                className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                                onClick={() => handleCopyText(msg.id, msg.content)}
                                title="Copier"
                              >
                                {copiedId === msg.id ? <Check size={12} className="text-[var(--color-accent)]" /> : <Copy size={12} />}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-xs sm:text-sm leading-relaxed min-w-0 max-w-full">
                        {isStreamingCurrent ? (
                          <div className="flex items-center gap-2 py-1">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                            <span className="text-xs text-[var(--color-text-muted)]">ELORA formule sa réponse...</span>
                          </div>
                        ) : isAssistant ? (
                          <>
                            {renderFormattedMessage(msg.content, msg.id)}

                            {/* Sources mobilisées et citées par ContextEngine */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]/60">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">
                                  Sources mobilisées ({msg.sources.length}) :
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.sources.map((s, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-main)]"
                                      title={s.snippet || s.title}
                                    >
                                      <span className="font-semibold text-[var(--color-accent)] uppercase">
                                        [{s.type === 'doc' ? 'Doc' : s.type === 'task' ? 'Tâche' : s.type === 'goal' ? 'Objectif' : 'Source'}]
                                      </span>
                                      <span className="truncate max-w-[140px]">{s.title}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Propositions d'actions transversales (avec confirmation explicite) */}
                            {msg.proposedActions && msg.proposedActions.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]/60 space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)] block">
                                  Action transversale suggérée :
                                </span>
                                {msg.proposedActions.map((pa) => (
                                  <div
                                    key={pa.id}
                                    className="p-3 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                  >
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-bold text-[var(--color-text-main)]">
                                        {pa.title}
                                      </h5>
                                      <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                                        {pa.description}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                                      {pa.status === 'accepted' ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                                          <Check size={12} />
                                          <span>Action exécutée et persistée</span>
                                        </span>
                                      ) : pa.status === 'executing' ? (
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent-bg)] px-2.5 py-1 rounded-lg border border-[var(--color-accent)]/20 animate-pulse">
                                          <Loader2 size={12} className="animate-spin" />
                                          <span>Exécution en cours...</span>
                                        </span>
                                      ) : pa.status === 'failed' ? (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20" title={pa.errorMessage}>
                                            <AlertCircle size={12} />
                                            <span className="truncate max-w-[150px]">{pa.errorMessage || 'Échec'}</span>
                                          </span>
                                          <button
                                            type="button"
                                            className="px-2 py-0.5 rounded-lg text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] transition-colors cursor-pointer"
                                            onClick={() => executeProposedAction(pa, msg.id)}
                                          >
                                            Réessayer
                                          </button>
                                        </div>
                                      ) : pa.status === 'rejected' ? (
                                        <span className="text-[11px] text-[var(--color-text-muted)] italic px-2 py-1">
                                          Action ignorée
                                        </span>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            className="px-2.5 py-1 rounded-lg bg-[var(--color-accent-bg)] border border-[var(--color-accent)]/30 text-xs font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg-base)] transition-colors flex items-center gap-1 cursor-pointer"
                                            onClick={() => executeProposedAction(pa, msg.id)}
                                          >
                                            <Check size={12} />
                                            <span>Confirmer</span>
                                          </button>
                                          <button
                                            type="button"
                                            className="px-2 py-1 rounded-lg text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                                            onClick={() => rejectProposedAction(pa.id, msg.id)}
                                            title="Ignorer l'action"
                                          >
                                            <X size={12} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
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
          <div className="absolute bottom-[136px] lg:bottom-16 left-3 right-3 sm:left-4 sm:right-4 max-w-4xl mx-auto p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-lg z-20 flex flex-wrap gap-2 items-center min-w-0">
            <span className="text-xs font-semibold text-[var(--color-text-muted)] mr-1 shrink-0">Pièces jointes :</span>
            {attachments.map((att, i) => {
              const badge = getFileBadge(att.name);
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] max-w-full"
                >
                  {badge.icon}
                  <span className="truncate max-w-[120px] font-mono text-[11px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors ml-0.5 cursor-pointer shrink-0"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Dock de suggestions rapides contextuelles */}
        <div className="absolute bottom-[130px] lg:bottom-[68px] left-3 right-3 sm:left-4 sm:right-4 max-w-4xl mx-auto z-15 flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
          {contextualPrompts.map((cp, idx) => (
            <button
              key={idx}
              className="text-[10px] sm:text-[11px] font-medium px-2.5 sm:px-3 py-1 rounded-full bg-[var(--color-bg-surface)]/95 border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors whitespace-nowrap shadow-2xs backdrop-blur-xs cursor-pointer"
              onClick={() => {
                setInputPrompt(cp.prompt);
                textareaRef.current?.focus();
              }}
            >
              {cp.label}
            </button>
          ))}
        </div>

        {/* Compositeur épuré & accessible */}
        <div className="absolute bottom-[74px] lg:bottom-4 left-3 right-3 sm:left-4 sm:right-4 max-w-4xl mx-auto z-20 min-w-0">
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
            className="flex items-center gap-2 p-1.5 sm:p-2 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] focus-within:border-[var(--color-accent)] shadow-md transition-all min-w-0"
          >
            <button
              type="button"
              className="p-2 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-surface-elevated)] transition-all shrink-0 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un fichier"
            >
              <Paperclip size={16} />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Écrivez votre message ou déposez un fichier..."
              className="flex-1 bg-transparent py-1.5 px-2 text-xs sm:text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none resize-none max-h-28 min-w-0"
            />

            <button
              type="submit"
              disabled={(!inputPrompt.trim() && attachments.length === 0) || isGenerating}
              className="p-2.5 rounded-full bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0 flex items-center justify-center shadow-xs cursor-pointer"
              title="Envoyer"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
