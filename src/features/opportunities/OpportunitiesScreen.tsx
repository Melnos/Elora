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
} from 'lucide-react';
import type { OpportunityItem } from '../../types';

export const OpportunitiesScreen: React.FC = () => {
  const {
    opportunities,
    matchedOpportunities,
    toggleSaveOpportunity,
    addOpportunityToPlanner,
    setActiveTab,
    sendMessage,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'saved' | 'hackathon' | 'scholarship' | 'program'>('all');
  const [plannerAddedId, setPlannerAddedId] = useState<string | null>(null);

  const displayList = matchedOpportunities.length > 0 ? matchedOpportunities : opportunities;

  const filteredOpportunities = displayList.filter((opp) => {
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="bento-tag mb-2">
            <Compass size={13} className="text-[var(--color-accent)]" />
            <span>Veille Stratégique</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text-main)] tracking-tight">
            Opportunités & Concours
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-xl">
            Bourses, hackathons et accélérateurs vérifiés, sélectionnés selon votre profil et vos compétences.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-xs font-semibold border border-[var(--color-accent)]/20 self-start md:self-auto">
          <ShieldCheck size={14} />
          <span>Sélection curatée</span>
        </div>
      </div>

      {/* Barre de Filtres */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
        <button
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] border border-transparent shadow-sm'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('all')}
        >
          Toutes ({opportunities.length})
        </button>
        <button
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'saved'
              ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] border border-transparent shadow-sm'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('saved')}
        >
          <Bookmark size={12} />
          <span>Enregistrées ({opportunities.filter((o) => o.saved).length})</span>
        </button>
        <button
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'hackathon'
              ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] border border-transparent shadow-sm'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('hackathon')}
        >
          Hackathons
        </button>
        <button
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'scholarship'
              ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] border border-transparent shadow-sm'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('scholarship')}
        >
          Bourses
        </button>
        <button
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'program'
              ? 'bg-[var(--color-text-main)] text-[var(--color-bg-base)] border border-transparent shadow-sm'
              : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border-subtle)]'
          }`}
          onClick={() => setActiveFilter('program')}
        >
          Programmes
        </button>
      </div>

      {/* Grille des Opportunités */}
      {filteredOpportunities.length === 0 ? (
        <div className="rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-8 text-center space-y-2.5">
          <Compass size={28} className="text-[var(--color-accent)] mx-auto opacity-80" />
          <h3 className="text-sm font-bold text-[var(--color-text-main)]">
            {activeFilter === 'saved'
              ? 'Aucune opportunité sauvegardée pour le moment'
              : 'Aucune opportunité vérifiée disponible pour le moment'}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
            {activeFilter === 'saved'
              ? 'Vos opportunités enregistrées apparaîtront ici dès que vous en ajouterez à vos favoris.'
              : 'ELORA n\'affiche aucune recommandation fictive ou non vérifiée. Complétez votre objectif et vos domaines d\'étude dans les Paramètres ou préparez vos candidatures avec l\'assistant IA.'}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredOpportunities.map((opp, idx) => {
          const isFeatured = idx === 0 && activeFilter === 'all';

          return (
            <div
              key={opp.id}
              className={`p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] flex flex-col justify-between transition-all ${
                isFeatured ? 'lg:col-span-2 border-l-2 border-l-[var(--color-accent)]' : ''
              }`}
            >
              <div>
                {/* Header de carte */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {isFeatured && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]/20 flex items-center gap-1">
                        <Award size={11} />
                        Opportunité en Vedette
                      </span>
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)]">
                      {opp.type}
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--color-accent)] font-mono">
                      {opp.matchScore}% de compatibilité
                    </span>
                  </div>

                  <button
                    onClick={() => toggleSaveOpportunity(opp.id)}
                    className={`p-1.5 rounded-lg transition-all ${
                      opp.saved
                        ? 'text-[var(--color-accent)] bg-[var(--color-accent-bg)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                    }`}
                    title={opp.saved ? 'Retirer des favoris' : 'Enregistrer'}
                  >
                    <Bookmark size={16} fill={opp.saved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Titre & Organisation */}
                <h3 className="text-lg font-bold text-[var(--color-text-main)]">
                  {opp.title}
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {opp.organization} • {opp.location}
                </p>

                {/* Raison du Match */}
                <div className="p-3 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] my-4 text-xs text-[var(--color-text-main)] leading-relaxed">
                  <span className="font-semibold text-[var(--color-accent)] block mb-1">
                    Alignement ELORA :
                  </span>
                  {opp.matchReason}
                </div>

                {/* Compétences demandées */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {opp.skillsRequired.map((s, sIdx) => (
                    <span
                      key={sIdx}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pied de carte avec actions */}
              <div className="pt-4 mt-3 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                  <Calendar size={13} />
                  <span>
                    Date limite : <strong className="text-[var(--color-text-main)]">{opp.deadline}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <button
                    className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-main)] hover:border-[var(--color-border-strong)] transition-colors flex items-center gap-1.5"
                    onClick={() => handleAddToPlannerWithFeedback(opp)}
                  >
                    {plannerAddedId === opp.id ? (
                      <>
                        <Check size={13} className="text-[var(--color-accent)]" />
                        <span className="text-[var(--color-accent)]">Ajouté !</span>
                      </>
                    ) : (
                      <>
                        <Calendar size={13} />
                        <span>Planifier</span>
                      </>
                    )}
                  </button>

                  <button
                    className="bento-btn-primary flex-1 sm:flex-initial justify-center py-1.5 px-3.5 text-xs text-center"
                    onClick={() => handleAskAIPrep(opp)}
                  >
                    <Sparkles size={13} />
                    <span>Préparer avec ELORA</span>
                  </button>

                  <a
                    href={opp.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-[var(--color-bg-surface-elevated)] transition-colors shrink-0 flex items-center justify-center"
                    title="Consulter le site officiel"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
