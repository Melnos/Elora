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
  Square,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';
import type { AIRequestAttachment } from '../../lib/ai/types';
import {
  formatConversationRelativeDate,
  MAX_CONVERSATION_TITLE_LENGTH,
} from '../../lib/conversations/conversationUtils';
import { extractDocumentText } from '../../lib/knowledge/documentExtractor';
import { useToast } from '../../components/ui/ToastProvider';
import { FormattedMarkdownMessage } from './markdownRenderer';

export const AIScreen: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createConversation,
    deleteConversation,
    renameConversation,
    sendMessage,
    cancelGeneration,
    isGenerating,
    executeProposedAction,
    rejectProposedAction,
    caps,
    knowledgeDocs,
    tasks,
    setActiveTab,
  } = useApp();
  const { showToast } = useToast();

  const [inputPrompt, setInputPrompt] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);
  const [attachments, setAttachments] = useState<AIRequestAttachment[]>([]);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteConvId, setConfirmDeleteConvId] = useState<string | null>(null);
  const [, setRelativeTimeTick] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const isUserNearBottomRef = useRef(true);

  const currentConversation =
    conversations.find((c) => c.id === currentConversationId) || conversations[0];

  const handleViewportScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 120;
    isUserNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom && (currentConversation?.messages.length || 0) > 0);
  };

  useEffect(() => {
    if (isUserNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isGenerating ? 'auto' : 'smooth',
      });
    }
  }, [currentConversation?.messages, isGenerating]);

  // Auto-redimensionnement vertical du champ de saisie (compact -> 120px max)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputPrompt]);

  // Arrête la synthèse vocale si l'utilisateur quitte l'écran IA
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Rafraîchit automatiquement les dates relatives (« À l'instant », « Il y a 1 min »...) toutes les 30s
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRelativeTimeTick((tick) => tick + 1);
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();
      const isRichDoc =
        lower.endsWith('.pdf') ||
        lower.endsWith('.docx') ||
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (isRichDoc) {
        const result = await extractDocumentText(file);
        if (result.success && result.text) {
          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              mimeType: 'text/plain',
              data: result.text,
            },
          ]);
        } else {
          showToast(result.error || `Impossible d'extraire le texte de ${file.name}.`, 'error');
        }
        continue;
      }

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
    input.value = '';
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
    isUserNearBottomRef.current = true;
    setShowScrollToBottom(false);

    await sendMessage(text, {
      attachments: currentAtts,
    });
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Impossible de copier dans le presse-papiers.', 'error');
    }
  };

  const handleCopyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      showToast('Impossible de copier le bloc de code.', 'error');
    }
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
      title: 'Planifier ma semaine',
      prompt: 'Aide-moi à planifier ma semaine d\'étude et à prioriser mes révisions.',
      icon: <Target size={14} className="text-[var(--color-accent)]" />,
    },
    {
      title: 'Synthétiser un cours',
      prompt: 'Aide-moi à synthétiser un cours et à en dégager les notions essentielles.',
      icon: <Sparkles size={14} className="text-[var(--color-accent)]" />,
    },
    {
      title: 'Préparer un examen',
      prompt: 'Aide-moi à préparer un examen avec un plan de révision et des exercices ciblés.',
      icon: <Compass size={14} className="text-[var(--color-accent)]" />,
    },
  ];

  // Suggestions contextuelles discrètes (affichées uniquement à l'état vide, adaptées aux données réelles)
  const discreetSuggestions = [
    ...(knowledgeDocs[0]
      ? [
          {
            label: `Résumer « ${knowledgeDocs[0].title.slice(0, 26)} »`,
            prompt: `Fais-moi une fiche de synthèse claire du document "${knowledgeDocs[0].title}".`,
          },
        ]
      : []),
    ...(tasks.find((t) => !t.completed)
      ? [
          {
            label: 'Prioriser mes tâches',
            prompt: 'Aide-moi à prioriser mes tâches en cours pour cette semaine.',
          },
        ]
      : []),
    {
      label: 'Quiz rapide (5 questions)',
      prompt: 'Teste mes connaissances avec un quiz progressif de 5 questions sur mon sujet d\'étude.',
    },
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

        <div className="threads-list flex-1 overflow-y-auto p-2.5 pb-24 lg:pb-3 space-y-1">
          {conversations.map((conv) => {
            const isEditing = editingConvId === conv.id;
            const isConfirmingDelete = confirmDeleteConvId === conv.id;
            const relativeDate = formatConversationRelativeDate(conv);

            return (
              <div
                key={conv.id}
                className={`w-full group flex items-center justify-between p-2.5 rounded-xl transition-all ${
                  conv.id === currentConversationId
                    ? 'bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-strong)]'
                    : 'hover:bg-[var(--color-bg-surface-elevated)] border border-transparent'
                }`}
              >
                {isEditing ? (
                  <form
                    className="flex-1 flex items-center gap-1 min-w-0"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editingTitle.trim()) {
                        renameConversation(conv.id, editingTitle);
                      }
                      setEditingConvId(null);
                    }}
                  >
                    <input
                      type="text"
                      autoFocus
                      maxLength={MAX_CONVERSATION_TITLE_LENGTH}
                      aria-label="Nouveau titre de la discussion"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setEditingConvId(null);
                      }}
                      className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border-strong)] text-xs text-[var(--color-text-main)]"
                    />
                    <button
                      type="submit"
                      aria-label="Valider le titre"
                      className="p-1 rounded bg-[var(--color-accent)] text-white cursor-pointer shrink-0"
                    >
                      <Check size={11} />
                    </button>
                    <button
                      type="button"
                      aria-label="Annuler le renommage"
                      onClick={() => setEditingConvId(null)}
                      className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer shrink-0"
                    >
                      <X size={11} />
                    </button>
                  </form>
                ) : isConfirmingDelete ? (
                  <div className="flex-1 flex items-center justify-between gap-1.5 min-w-0">
                    <span className="text-[11px] font-semibold text-rose-500 truncate">
                      Supprimer ?
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label="Confirmer la suppression"
                        onClick={() => {
                          deleteConversation(conv.id);
                          setConfirmDeleteConvId(null);
                        }}
                        className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-semibold cursor-pointer"
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        aria-label="Annuler la suppression"
                        onClick={() => setConfirmDeleteConvId(null)}
                        className="px-2 py-0.5 rounded bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-main)] cursor-pointer"
                      >
                        Non
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex-1 text-left min-w-0 cursor-pointer"
                      onClick={() => {
                        setCurrentConversationId(conv.id);
                        setShowHistoryMobile(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            conv.id === currentConversationId
                              ? 'bg-[var(--color-accent)]'
                              : 'bg-[var(--color-border-strong)]'
                          }`}
                        />
                        <span className="text-xs font-medium text-[var(--color-text-main)] truncate block">
                          {conv.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block pl-3.5">
                        {relativeDate}
                      </span>
                    </button>

                    <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-1">
                      <button
                        type="button"
                        className="p-1.5 rounded hover:bg-[var(--color-bg-base)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer"
                        title="Renommer la discussion"
                        aria-label={`Renommer ${conv.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteConvId(null);
                          setEditingConvId(conv.id);
                          setEditingTitle(conv.title);
                        }}
                      >
                        <Edit3 size={12} />
                      </button>
                      {conversations.length > 1 && (
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-rose-500/10 text-[var(--color-text-muted)] hover:text-rose-500 cursor-pointer"
                          title="Supprimer la discussion"
                          aria-label={`Supprimer ${conv.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConvId(null);
                            setConfirmDeleteConvId(conv.id);
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Surface principale de conversation */}
      <section className="ai-chat-canvas flex-1 flex flex-col h-full min-w-0 bg-[var(--color-bg-base)] relative overflow-hidden">
        {/* Barre supérieure du chat */}
        <div className="chat-top-bar p-2.5 px-3 sm:px-6 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-bg-surface)] shrink-0 gap-2">
          <button
            type="button"
            className="mobile-thread-toggle lg:hidden flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-main)] px-2.5 py-1 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] cursor-pointer shrink-0"
            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
          >
            <MessageSquare size={13} />
            <span>Historique ({conversations.length})</span>
          </button>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] min-w-0 max-w-full">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--color-text-main)] truncate">
              {currentConversation?.title || 'ELORA AI'}
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] font-normal hidden sm:inline shrink-0">
              • {caps?.onDeviceStatus === 'readily' ? 'Hybride (Local & Cloud)' : 'Cloud'}
            </span>
          </div>

          <button
            type="button"
            className="desktop-new-chat-btn hidden lg:flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors cursor-pointer shrink-0"
            onClick={() => createConversation()}
          >
            <Plus size={13} />
            <span>Nouvelle discussion</span>
          </button>
        </div>

        {/* Défilement des messages (scroll intelligent, sans chevauchement) */}
        <div
          ref={viewportRef}
          onScroll={handleViewportScroll}
          className="chat-stream-viewport flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        >
          {!currentConversation || currentConversation.messages.length === 0 ? (
            <div className="max-w-2xl mx-auto my-4 sm:my-10 text-center px-2">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--color-accent-bg)] text-[var(--color-accent)] flex items-center justify-center mx-auto mb-3 border border-[var(--color-accent)]/20 shadow-xs">
                <Sparkles size={24} />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-[var(--color-text-main)] tracking-tight">
                Intelligence Personnelle ELORA
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-text-muted)] max-w-lg mx-auto mt-1.5 leading-relaxed">
                Connectée à vos objectifs, vos documents de cours et votre planning pour vous aider à synthétiser, réviser et vous organiser.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-6 text-left">
                {quickStarters.map((starter, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="p-3 sm:p-3.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all flex flex-col justify-between group cursor-pointer shadow-2xs"
                    onClick={() => {
                      setInputPrompt(starter.prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    <div className="w-7 h-7 rounded-lg bg-[var(--color-bg-surface-elevated)] flex items-center justify-center mb-2">
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

              {/* Suggestions contextuelles discrètes (état vide uniquement) */}
              {discreetSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                  {discreetSuggestions.map((sg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                      onClick={() => {
                        setInputPrompt(sg.prompt);
                        textareaRef.current?.focus();
                      }}
                    >
                      {sg.label}
                    </button>
                  ))}
                </div>
              )}
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
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--color-border-subtle)]/40 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${msg.role === 'user' ? 'opacity-80' : 'text-[var(--color-accent)]'}`}>
                            {isAssistant ? 'ELORA' : 'Vous'}
                          </span>
                          {/* Séparation nette : Mode Cloud/Local vs Modèle */}
                          {isAssistant && msg.inferenceSource && (
                            <>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] inline-flex items-center gap-1 shrink-0">
                                {isLocalSource ? (
                                  <>
                                    <Zap size={9} className="text-[var(--color-accent)]" />
                                    <span>Local</span>
                                  </>
                                ) : (
                                  <>
                                    <Cloud size={9} />
                                    <span>Cloud</span>
                                  </>
                                )}
                              </span>
                              {msg.modelName && (
                                <span className="text-[9px] font-mono text-[var(--color-text-muted)] truncate max-w-[180px]">
                                  {msg.modelName.replace('Google Gemini (', '').replace(')', '').replace('Firebase AI Logic ', '')}
                                  {msg.durationMs ? ` · ${msg.durationMs}ms` : ''}
                                </span>
                              )}
                            </>
                          )}
                          {isAssistant && msg.fallbackOccurred && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 inline-flex items-center gap-1 shrink-0"
                              title={msg.fallbackReason || 'Bascule transparente vers le Cloud'}
                            >
                              <span>↩ Repli Cloud</span>
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] opacity-70 shrink-0">
                          {msg.timestamp}
                        </span>
                      </div>

                      <div className="text-xs sm:text-sm leading-relaxed min-w-0 max-w-full">
                        {isStreamingCurrent ? (
                          <div className="flex items-center gap-2 py-1">
                            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-ping" />
                            <span className="text-xs text-[var(--color-text-muted)]">ELORA formule sa réponse...</span>
                          </div>
                        ) : isAssistant ? (
                          <>
                            <FormattedMarkdownMessage
                              content={msg.content}
                              msgId={msg.id}
                              copiedCodeId={copiedCodeId}
                              onCopyCode={handleCopyCode}
                            />

                            {/* Barre d'actions dédiée sur les réponses assistant */}
                            {msg.content && (
                              <div className="mt-3 pt-2 border-t border-[var(--color-border-subtle)]/40 flex items-center gap-2">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-surface-elevated)] transition-colors cursor-pointer"
                                  onClick={() => handleCopyText(msg.id, msg.content)}
                                >
                                  {copiedId === msg.id ? (
                                    <>
                                      <Check size={12} className="text-[var(--color-accent)]" />
                                      <span className="text-[var(--color-accent)]">Copié</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={12} />
                                      <span>Copier</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-surface-elevated)] transition-colors cursor-pointer"
                                  onClick={() => handleSpeak(msg.id, msg.content)}
                                >
                                  {speakingId === msg.id ? (
                                    <>
                                      <VolumeX size={12} className="text-[var(--color-accent)]" />
                                      <span className="text-[var(--color-accent)]">Arrêter</span>
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 size={12} />
                                      <span>Écouter</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {/* Sources mobilisées et citées par ContextEngine (cliquables) */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-3 pt-2.5 border-t border-[var(--color-border-subtle)]/60">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">
                                  Sources mobilisées ({msg.sources.length}) :
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {msg.sources.map((s, sIdx) => {
                                    const badgeLabel =
                                      s.type === 'doc'
                                        ? 'Doc'
                                        : s.type === 'task'
                                          ? 'Tâche'
                                          : s.type === 'goal'
                                            ? 'Objectif'
                                            : s.type === 'opportunity'
                                              ? 'Opport.'
                                              : 'Source';
                                    const hasExternalUrl =
                                      typeof s.url === 'string' &&
                                      (s.url.startsWith('https://') || s.url.startsWith('http://'));

                                    if (hasExternalUrl) {
                                      return (
                                        <a
                                          key={sIdx}
                                          href={s.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-[10px] text-[var(--color-text-main)] transition-colors"
                                          title={s.snippet || s.title}
                                        >
                                          <span className="font-semibold text-[var(--color-accent)] uppercase">
                                            [{badgeLabel}]
                                          </span>
                                          <span className="truncate max-w-[140px]">{s.title}</span>
                                          <ExternalLink size={10} className="text-[var(--color-accent)] shrink-0" />
                                        </a>
                                      );
                                    }

                                    const targetTab =
                                      s.type === 'doc'
                                        ? 'knowledge'
                                        : s.type === 'task'
                                          ? 'planner'
                                          : s.type === 'goal'
                                            ? 'progress'
                                            : s.type === 'opportunity'
                                              ? 'opportunities'
                                              : null;

                                    return targetTab ? (
                                      <button
                                        key={sIdx}
                                        type="button"
                                        onClick={() => setActiveTab(targetTab)}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] text-[10px] text-[var(--color-text-main)] transition-colors cursor-pointer"
                                        title={s.snippet || s.title}
                                      >
                                        <span className="font-semibold text-[var(--color-accent)] uppercase">
                                          [{badgeLabel}]
                                        </span>
                                        <span className="truncate max-w-[140px]">{s.title}</span>
                                      </button>
                                    ) : (
                                      <span
                                        key={sIdx}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-main)]"
                                        title={s.snippet || s.title}
                                      >
                                        <span className="font-semibold text-[var(--color-accent)] uppercase">
                                          [{badgeLabel}]
                                        </span>
                                        <span className="truncate max-w-[140px]">{s.title}</span>
                                      </span>
                                    );
                                  })}
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
                          <div className="space-y-2">
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {msg.attachments.map((att, aIdx) => (
                                  <span
                                    key={aIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-bg-base)]/15 border border-[var(--color-bg-base)]/25 text-[10px] font-mono"
                                  >
                                    <FileText size={11} />
                                    <span className="truncate max-w-[150px]">{att.name}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {msg.content && (
                              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                            )}
                          </div>
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

        {/* Bouton discret pour revenir en bas si l'utilisateur lit d'anciens messages */}
        {showScrollToBottom && (
          <div className="relative flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={() => {
                isUserNearBottomRef.current = true;
                setShowScrollToBottom(false);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="pointer-events-auto -mt-10 mb-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] shadow-md text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
            >
              <ArrowDown size={13} className="text-[var(--color-accent)]" />
              <span>Revenir en bas</span>
            </button>
          </div>
        )}

        {/* Compositeur en flux flex (compact, redimensionnable, sans chevauchement) */}
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 sm:px-6 py-2.5">
          <div className="max-w-4xl mx-auto flex flex-col gap-2 min-w-0">
            {/* Fichiers joints en attente d'envoi */}
            {attachments.length > 0 && (
              <div className="p-2 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex flex-wrap gap-1.5 items-center min-w-0">
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)] mr-1 shrink-0">
                  Pièces jointes :
                </span>
                {attachments.map((att, i) => {
                  const badge = getFileBadge(att.name);
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-main)] max-w-full"
                    >
                      {badge.icon}
                      <span className="truncate max-w-[120px] font-mono text-[11px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        aria-label={`Retirer ${att.name}`}
                        className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors ml-0.5 cursor-pointer shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              className="hidden"
              multiple
              accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.pdf,.docx"
            />

            <form
              onSubmit={handleSend}
              className="flex items-end gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-strong)] focus-within:border-[var(--color-accent)] shadow-sm transition-all min-w-0"
            >
              <button
                type="button"
                className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-surface-elevated)] transition-all shrink-0 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Joindre un fichier (PDF, DOCX, TXT, code...)"
                aria-label="Joindre un fichier"
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
                placeholder="Écrivez votre message ou joignez un fichier..."
                className="flex-1 bg-transparent py-1.5 px-1.5 text-xs sm:text-sm text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] focus:outline-none resize-none max-h-[120px] overflow-y-auto min-w-0 leading-snug"
              />

              {isGenerating ? (
                <button
                  type="button"
                  onClick={cancelGeneration}
                  className="p-2.5 rounded-full bg-[var(--color-text-main)] text-[var(--color-bg-base)] hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center shadow-xs cursor-pointer"
                  title="Arrêter la génération"
                  aria-label="Arrêter la génération"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() && attachments.length === 0}
                  className="p-2.5 rounded-full bg-[var(--color-accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0 flex items-center justify-center shadow-xs cursor-pointer"
                  title="Envoyer"
                  aria-label="Envoyer"
                >
                  <Send size={15} />
                </button>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};
