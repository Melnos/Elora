import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bookmark,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Bot,
  ShieldCheck,
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

  const filteredOpportunities = opportunities.filter((opp) => {
    if (activeFilter === 'saved') return opp.saved;
    if (activeFilter === 'hackathon') return opp.type === 'hackathon';
    if (activeFilter === 'scholarship') return opp.type === 'scholarship';
    if (activeFilter === 'program') return opp.type === 'program' || opp.type === 'internship';
    return true;
  });

  const handleAskAIPrep = async (opp: OpportunityItem) => {
    setActiveTab('ai');
    await sendMessage(`Aide-moi à préparer ma candidature pour l'opportunité suivante : "${opp.title}" (${opp.organization}).\n\nConditions d'éligibilité :\n${opp.eligibility.map((e) => `- ${e}`).join('\n')}\n\nCompétences demandées :\n${opp.skillsRequired.map((s) => `- ${s}`).join('\n')}\n\nIdentifie mes points forts, les éléments clés à mettre en valeur et les étapes à planifier.`);
  };

  return (
    <div className="page-container opportunities-page">
      {/* En-tête */}
      <div className="section-header-row">
        <div>
          <h1 className="page-main-title">Opportunités & Concours Vérifiés</h1>
          <p className="page-main-desc">
            Bourses, hackathons et programmes d'excellence alignés sur votre profil. Aucune donnée inventée : sources officielles garanties.
          </p>
        </div>

        <div className="verified-shield-badge">
          <ShieldCheck size={16} />
          <span>Informations 100% Vérifiées</span>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="opportunities-filters-bar">
        <div className="filter-pills-list">
          <button
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            Toutes ({opportunities.length})
          </button>
          <button
            className={`filter-btn ${activeFilter === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveFilter('saved')}
          >
            <Bookmark size={14} />
            <span>Enregistrées ({opportunities.filter((o) => o.saved).length})</span>
          </button>
          <button
            className={`filter-btn ${activeFilter === 'hackathon' ? 'active' : ''}`}
            onClick={() => setActiveFilter('hackathon')}
          >
            Hackathons
          </button>
          <button
            className={`filter-btn ${activeFilter === 'scholarship' ? 'active' : ''}`}
            onClick={() => setActiveFilter('scholarship')}
          >
            Bourses
          </button>
          <button
            className={`filter-btn ${activeFilter === 'program' ? 'active' : ''}`}
            onClick={() => setActiveFilter('program')}
          >
            Programmes
          </button>
        </div>
      </div>

      {/* Grille d'opportunités */}
      <div className="opportunities-grid">
        {filteredOpportunities.map((opp) => (
          <div key={opp.id} className="opportunity-card-full">
            <div className="opp-card-header">
              <div className="opp-type-badge-group">
                <span className="opp-category-badge">{opp.type.toUpperCase()}</span>
                {opp.isVerified && (
                  <span className="opp-verified-pill" title="Source et dates vérifiées">
                    <CheckCircle2 size={12} />
                    Vérifié
                  </span>
                )}
              </div>

              <button
                className={`btn-bookmark ${opp.saved ? 'saved' : ''}`}
                onClick={() => toggleSaveOpportunity(opp.id)}
                title={opp.saved ? 'Retirer des favoris' : 'Enregistrer'}
              >
                <Bookmark size={18} />
              </button>
            </div>

            <h3 className="opportunity-title">{opp.title}</h3>
            <p className="opportunity-org">{opp.organization} • {opp.location}</p>

            <div className="opp-match-box">
              <div className="flex-align-center gap-1 mb-1">
                <Sparkles size={14} className="icon-gold" />
                <strong className="text-sm">Pertinence profil : {opp.matchScore}%</strong>
              </div>
              <p className="opp-match-reason">{opp.matchReason}</p>
            </div>

            <div className="opp-details-block">
              <h4 className="detail-subtitle">Compétences recherchées :</h4>
              <div className="skills-tags-row">
                {opp.skillsRequired.map((skill) => (
                  <span key={skill} className="skill-chip">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="opportunity-footer">
              <div className="deadline-box">
                <Calendar size={14} />
                <span>Date limite : <strong>{opp.deadline}</strong></span>
              </div>

              <div className="opp-actions-row">
                <button
                  className="btn-add-planner-sm"
                  onClick={() => {
                    addOpportunityToPlanner(opp);
                    alert(`Échéance "${opp.title}" ajoutée à votre Planner !`);
                  }}
                  title="Ajouter la date limite à mes priorités"
                >
                  <Calendar size={14} />
                  <span>Ajouter au Planner</span>
                </button>

                <button
                  className="btn-ai-prep-sm"
                  onClick={() => handleAskAIPrep(opp)}
                >
                  <Bot size={14} />
                  <span>Préparer dossier</span>
                </button>

                <a
                  href={opp.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-external-link"
                  title="Accéder au site officiel"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
