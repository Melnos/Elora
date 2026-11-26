import React, { useState, useEffect, useCallback } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { loginWithEmail, signupWithEmail, loginWithGoogle, sendResetPassword, formatAuthError } from '../../lib/firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

type AuthMode = 'login' | 'signup' | 'reset';

function extractAuthErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') {
      return code.trim();
    }
  }
  return '';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMode('login');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAuthError = useCallback((err: unknown) => {
    const code = extractAuthErrorCode(err);
    const message = formatAuthError(code);
    if (!code || message === formatAuthError('')) {
      console.warn(
        '[AuthModal] Erreur d\'authentification:',
        code || (err instanceof Error ? err.message : 'Erreur inconnue')
      );
    }
    setError(message);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        onAuthSuccess?.();
        onClose();
      } else if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Veuillez renseigner votre nom complet.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas.');
          setLoading(false);
          return;
        }
        await signupWithEmail(email, password, displayName);
        onAuthSuccess?.();
        onClose();
      } else if (mode === 'reset') {
        await sendResetPassword(email);
        setSuccessMsg('Un lien de réinitialisation vous a été envoyé par email.');
      }
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onAuthSuccess?.();
      onClose();
    } catch (err: unknown) {
      handleAuthError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-2xl p-5 sm:p-8"
      >
        {/* Bouton de fermeture */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-base)] transition-colors"
          title="Fermer"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>

        {/* Titre */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center mx-auto mb-3">
            <UserIcon size={24} />
          </div>
          <h2 id="auth-modal-title" className="text-xl font-bold text-[var(--color-text-main)]">
            {mode === 'login' && 'Connexion à ELORA'}
            {mode === 'signup' && 'Créer votre profil ELORA'}
            {mode === 'reset' && 'Réinitialiser votre mot de passe'}
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {mode === 'login' && 'Accédez à votre espace d\'intelligence personnelle'}
            {mode === 'signup' && 'Synchronisez vos données et votre mémoire dans le Cloud'}
            {mode === 'reset' && 'Entrez votre email pour recevoir les instructions'}
          </p>
        </div>

        {/* Message d'erreur ou succès */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Bouton Google Auth (uniquement en login et signup) */}
        {mode !== 'reset' && (
          <>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] hover:bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] text-sm font-medium flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--color-border-subtle)]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)]">
                  ou avec votre email
                </span>
              </div>
            </div>
          </>
        )}

        {/* Formulaire Email/Password */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-display-name" className="block text-xs font-medium text-[var(--color-text-main)] mb-1">
                Nom complet
              </label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-3 text-[var(--color-text-muted)]" />
                <input
                  id="auth-display-name"
                  type="text"
                  required
                  placeholder="Jean Dupont"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[var(--color-text-main)] mb-1">
              Adresse Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-[var(--color-text-muted)]" />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="auth-password" className="text-xs font-medium text-[var(--color-text-main)]">
                  Mot de passe
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-[var(--color-accent)] hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-[var(--color-text-muted)]" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-confirm-password" className="block text-xs font-medium text-[var(--color-text-main)] mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-[var(--color-text-muted)]" />
                <input
                  id="auth-confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] text-[var(--color-text-main)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-accent)] hover:opacity-95 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-opacity mt-4 shadow disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'login' && 'Se connecter'}
                  {mode === 'signup' && 'Créer mon compte'}
                  {mode === 'reset' && 'Envoyer le lien'}
                </span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Liens de bascule de mode */}
        <div className="mt-5 text-center text-xs text-[var(--color-text-muted)]">
          {mode === 'login' && (
            <p>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-[var(--color-accent)] font-semibold hover:underline ml-1"
              >
                S'inscrire gratuitement
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p>
              Déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-[var(--color-accent)] font-semibold hover:underline ml-1"
              >
                Se connecter
              </button>
            </p>
          )}

          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-[var(--color-accent)] font-semibold hover:underline"
            >
              Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
