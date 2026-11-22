import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bookmark,
  Calendar,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Compass,
  Check,
  Award,
  Zap,
} from 'lucide-react';
import type { OpportunityItem } from '../../types';

export const OpportunitiesScreen: React.FC = () => {
  const {
    opportunities,
    toggleSaveOpportunity,
    addOpportunityToPlanner,
    setActiveTab,
    sendMessage,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'saved' | 'hackathon' | 'scholarship' | 'program'>('all');
  const [plannerAddedId, setPlannerAddedId] = useState<string | null>(null);

  const filteredOpportunities = opportunities.filter((opp) => {
    if (activeFilter === 'saved') return opp.saved;
    if (activeFilter === 'hackathon') return opp.type === 'hackathon';
    if (activeFilter === 'scholarship') return opp.type === 'scholarship';
    if (activeFilter === 'program') return opp.type === 'program' || opp.type === 'internship';
    return true;
  });

  const handleAskAIPrep = async (opp: OpportunityItem) => {
    setActiveTab('ai');
    await sendMessage(
      `Aide-moi à préparer ma candidature pour l'opportunité suivante : "${opp.title}" (${opp.organization}).\n\nConditions d'éligibilité :\n${opp.eligibility.map((e) => `- ${e}`).join('\n')}\n\nCompétences demandées :\n${opp.skillsRequired.map((s) => `- ${s}`).join('\n')}\n\nIdentifie mes points forts, les éléments clés à mettre en valeur et les étapes à planifier.`
    );
  };

  const handleAddToPlannerWithFeedback = (opp: OpportunityItem) => {
    addOpportunityToPlanner(opp);
    setPlannerAddedId(opp.id);
    setTimeout(() => setPlannerAddedId(null), 2500);
  };

  return (
    <div className="bento-viewport">
      {/* En-tête de la Page */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="bento-tag mb-2">
            <Compass size={13} className="text-[#FF6A00]" />
            <span>Veille Stratégique</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Opportunités & Concours
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xl">
            Bourses, hackathons et accélérateurs vérifiés, sélectionnés selon votre profil et vos compétences.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-black border border-emerald-500/25 self-start md:self-auto shadow-sm">
          <ShieldCheck size={16} />
          <span>Informations 100% Vérifiées</span>
        </div>
      </div>

      {/* Barre de Filtres de Catégorie avec Pilules Élevées et Espacées */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-6">
        <button
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-md'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('all')}
        >
          Toutes ({opportunities.length})
        </button>
        <button
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
            activeFilter === 'saved'
              ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-md'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('saved')}
        >
          <Bookmark size={13} />
          <span>Enregistrées ({opportunities.filter((o) => o.saved).length})</span>
        </button>
        <button
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
            activeFilter === 'hackathon'
              ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-md'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('hackathon')}
        >
          Hackathons
        </button>
        <button
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
            activeFilter === 'scholarship'
              ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-md'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('scholarship')}
        >
          Bourses
        </button>
        <button
          className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
            activeFilter === 'program'
              ? 'bg-gradient-to-r from-[#FF6A00] to-[#EE5A24] text-white shadow-md'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-white border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('program')}
        >
          Programmes
        </button>
      </div>

      {/* Grille Bento des Opportunités avec Couleurs et Contrastes Distincts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOpportunities.map((opp, idx) => {
          const isFeatured = idx === 0 && activeFilter === 'all';
          const isBlue = idx % 2 === 1;

          return (
            <div
              key={opp.id}
              className={`p-8 rounded-3xl flex flex-col justify-between shadow-xl transition-all duration-300 ${
                isFeatured
                  ? 'lg:col-span-2 bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-orange-500/15 border-2 border-[#FF6A00]/40 hover:shadow-2xl'
                  : isBlue
                  ? 'bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-blue-500/10 border border-blue-500/30 hover:border-blue-500'
                  : 'bg-gradient-to-br from-[var(--color-bg-surface)] via-[var(--color-bg-surface)] to-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500'
              }`}
            >
              <div>
                {/* Header de carte */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {isFeatured && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30 flex items-center gap-1 shadow-sm">
                        <Zap size={11} fill="currentColor" />
                        Opportunité en Vedette
                      </span>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)]">
                      {opp.type}
                    </span>
                    <span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      {opp.matchScore}% de compatibilité
                    </span>
                  </div>

                  <button
                    onClick={() => toggleSaveOpportunity(opp.id)}
                    className={`p-2.5 rounded-2xl transition-all cursor-pointer ${
                      opp.saved
                        ? 'text-[#FF6A00] bg-[#FF6A00]/20 border border-[#FF6A00]/30 shadow-sm'
                        : 'text-[var(--color-text-muted)] hover:text-white bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]'
                    }`}
                    title={opp.saved ? 'Retirer des favoris' : 'Enregistrer'}
                  >
                    <Bookmark size={18} fill={opp.saved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Titre & Organisation */}
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-text-main)]">
                  {opp.title}
                </h3>
                <p className="text-xs font-semibold text-[var(--color-text-muted)] mt-1.5">
                  {opp.organization} • {opp.location}
                </p>

                {/* Raison du Match (Boîte d'alignement Bento) */}
                <div className="p-4 rounded-2xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] my-5 text-xs text-[var(--color-text-main)] leading-relaxed shadow-sm">
                  <span className="font-bold text-[#FF6A00] flex items-center gap-1.5 mb-1.5 text-xs">
                    <Award size={14} />
                    Alignement ELORA :
                  </span>
                  {opp.matchReason}
                </div>

                {/* Compétences demandées */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {opp.skillsRequired.map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[11px] font-semibold px-3 py-1 rounded-xl bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pied de carte avec actions aérées */}
              <div className="pt-5 mt-4 border-t border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2 font-medium">
                  <Calendar size={14} className="text-amber-500" />
                  <span>
                    Date limite : <strong className="text-[var(--color-text-main)]">{opp.deadline}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    className="bento-btn-secondary"
                    onClick={() => handleAddToPlannerWithFeedback(opp)}
                  >
                    {plannerAddedId === opp.id ? (
                      <>
                        <Check size={14} className="text-emerald-500 stroke-[3]" />
                        <span className="text-emerald-500">Ajouté au Planner !</span>
                      </>
                    ) : (
                      <>
                        <Calendar size={14} />
                        <span>Planifier</span>
                      </>
                    )}
                  </button>

                  <button
                    className="bento-btn-primary"
                    onClick={() => handleAskAIPrep(opp)}
                  >
                    <Sparkles size={14} />
                    <span>Préparer avec ELORA</span>
                  </button>

                  <a
                    href={opp.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-white bg-[var(--color-bg-surface-elevated)] hover:border-[#FF6A00] transition-colors"
                    title="Consulter le site officiel"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
