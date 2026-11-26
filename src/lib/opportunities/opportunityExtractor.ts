import type { GoalItem, MemoryItem, OpportunityItem, UserProfile } from '../../types';
import type { WebSearchSource } from '../ai/types';

export function normalizeOpportunityUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((p) =>
      u.searchParams.delete(p)
    );
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase();
  } catch {
    return (url || '').trim().replace(/\/+$/, '').toLowerCase();
  }
}

export function isOpportunityExpired(
  deadline: string,
  todayIso: string = new Date().toISOString().split('T')[0]
): boolean {
  const clean = (deadline || '').trim();
  if (!clean) return false;
  const isoMatch = clean.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return isoMatch[1] < todayIso;
  }
  const frMatch = clean.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (frMatch) {
    const iso = `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
    return iso < todayIso;
  }
  return false;
}

export function deduplicateOpportunities(
  existing: OpportunityItem[],
  incoming: OpportunityItem[]
): { added: OpportunityItem[]; merged: OpportunityItem[] } {
  const seenUrls = new Set(
    existing.map((o) => normalizeOpportunityUrl(o.officialUrl)).filter(Boolean)
  );
  const seenTitles = new Set(
    existing.map((o) => `${o.title.trim().toLowerCase()}::${o.organization.trim().toLowerCase()}`)
  );

  const added: OpportunityItem[] = [];
  for (const item of incoming) {
    const normUrl = normalizeOpportunityUrl(item.officialUrl);
    const normTitle = `${item.title.trim().toLowerCase()}::${item.organization.trim().toLowerCase()}`;
    if ((normUrl && seenUrls.has(normUrl)) || seenTitles.has(normTitle)) {
      continue;
    }
    if (normUrl) seenUrls.add(normUrl);
    seenTitles.add(normTitle);
    added.push(item);
  }

  return {
    added,
    merged: [...added, ...existing],
  };
}

function normalizeOpportunityType(raw?: string): OpportunityItem['type'] {
  const v = (raw || '').toLowerCase();
  if (v.includes('hack')) return 'hackathon';
  if (v.includes('stage') || v.includes('intern') || v.includes('emploi') || v.includes('job')) {
    return 'internship';
  }
  if (v.includes('bours') || v.includes('scholar')) return 'scholarship';
  if (v.includes('concour') || v.includes('compet')) return 'competition';
  return 'program';
}

function tryParseJsonArray(text: string): Array<Record<string, unknown>> {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text.trim();
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start === -1 || end <= start) return [];
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Transforme uniquement les résultats vérifiés issus de Google Search Grounding en objets OpportunityItem.
 * Ne fabrique jamais d'URL : chaque opportunité doit disposer d'une URL http(s) réelle
 * présente dans webSources (groundingChunks) ou explicitement vérifiable, et non expirée.
 */
export function extractOpportunitiesFromWebResponse(
  text: string,
  webSources: WebSearchSource[] = [],
  todayIso: string = new Date().toISOString().split('T')[0]
): Omit<OpportunityItem, 'id' | 'saved'>[] {
  const validWebUrls = new Set(
    webSources
      .map((s) => s.url?.trim())
      .filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)))
      .map((u) => normalizeOpportunityUrl(u))
  );

  const parsedItems = tryParseJsonArray(text);
  const results: Omit<OpportunityItem, 'id' | 'saved'>[] = [];

  for (const raw of parsedItems) {
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const officialUrl = typeof raw.officialUrl === 'string' ? raw.officialUrl.trim() : '';
    if (!title || title.length < 4 || !/^https?:\/\//i.test(officialUrl)) continue;

    // Si des webSources grounding sont fournies, privilégier/vérifier que l'URL est issue du grounding
    // ou correspond à un domaine présent dans webSources
    const normUrl = normalizeOpportunityUrl(officialUrl);
    if (validWebUrls.size > 0 && !validWebUrls.has(normUrl)) {
      const urlHost = (() => {
        try {
          return new URL(officialUrl).hostname;
        } catch {
          return '';
        }
      })();
      const hostMatched = Array.from(validWebUrls).some((wu) => urlHost && wu.includes(urlHost));
      if (!hostMatched) continue;
    }

    const deadline =
      typeof raw.deadline === 'string' && raw.deadline.trim()
        ? raw.deadline.trim()
        : 'À vérifier sur le site officiel';
    if (isOpportunityExpired(deadline, todayIso)) continue;

    results.push({
      title: title.slice(0, 140),
      organization:
        typeof raw.organization === 'string' && raw.organization.trim()
          ? raw.organization.trim().slice(0, 100)
          : 'Source Web vérifiée',
      type: normalizeOpportunityType(typeof raw.type === 'string' ? raw.type : title),
      deadline,
      location:
        typeof raw.location === 'string' && raw.location.trim()
          ? raw.location.trim().slice(0, 80)
          : 'En ligne / International',
      isVerified: true,
      matchScore: typeof raw.matchScore === 'number' ? Math.min(100, Math.max(0, Math.round(raw.matchScore))) : 75,
      matchReason:
        typeof raw.matchReason === 'string' && raw.matchReason.trim()
          ? raw.matchReason.trim().slice(0, 220)
          : 'Opportunité issue d’une recherche Web vérifiée.',
      eligibility: Array.isArray(raw.eligibility)
        ? raw.eligibility.map(String).filter(Boolean).slice(0, 4)
        : ['Vérifier les critères sur le site officiel'],
      skillsRequired: Array.isArray(raw.skillsRequired)
        ? raw.skillsRequired.map(String).filter(Boolean).slice(0, 5)
        : [],
      officialUrl,
    });
  }

  // Repli déterministe si le modèle n'a pas produit de JSON mais que Google Search Grounding a renvoyé des sources Web réelles
  if (results.length === 0 && webSources.length > 0) {
    for (const src of webSources.slice(0, 5)) {
      if (!src.url || !/^https?:\/\//i.test(src.url)) continue;
      const title = (src.title || src.url).trim();
      let host = 'Web';
      try {
        host = new URL(src.url).hostname.replace(/^www\./, '');
      } catch {
        // Ignore
      }
      results.push({
        title: title.slice(0, 140),
        organization: host,
        type: normalizeOpportunityType(title),
        deadline: 'À vérifier sur le site officiel',
        location: 'En ligne',
        isVerified: true,
        matchScore: 70,
        matchReason: 'Source Web réelle trouvée via Google Search Grounding.',
        eligibility: ['Consulter la page officielle'],
        skillsRequired: [],
        officialUrl: src.url,
      });
    }
  }

  return results;
}

export function buildOpportunitySearchPrompt(
  customQuery: string,
  profile: UserProfile,
  memories: MemoryItem[],
  goals: GoalItem[]
): string {
  const todayIso = new Date().toISOString().split('T')[0];
  const focusParts: string[] = [];
  if (profile.roleTitle && profile.roleTitle !== 'Étudiant(e)') {
    focusParts.push(`Profil : ${profile.roleTitle}`);
  }
  if (profile.currentObjective?.trim()) {
    focusParts.push(`Objectif : ${profile.currentObjective.trim()}`);
  }
  if (profile.learningFocus?.length > 0) {
    focusParts.push(`Domaines : ${profile.learningFocus.join(', ')}`);
  }
  const activeMems = memories
    .filter((m) => (m.status === 'active' || m.status === 'temporary') && m.enabledForAI)
    .slice(0, 4)
    .map((m) => `${m.key}: ${m.value}`);
  if (activeMems.length > 0) {
    focusParts.push(`Souvenirs : ${activeMems.join(' ; ')}`);
  }
  if (goals.length > 0) {
    focusParts.push(`Objectifs actifs : ${goals.slice(0, 2).map((g) => g.title).join(', ')}`);
  }

  const userQuery = customQuery.trim() || 'hackathons, concours, bourses, stages ou programmes ouverts actuellement';
  const contextLine =
    focusParts.length > 0
      ? `Contexte disponible : ${focusParts.join(' | ')}.`
      : `Profil étudiant général (adapte la recherche même sans profil complet).`;

  return [
    `Date du jour : ${todayIso}.`,
    `Recherche Internet demandée : ${userQuery}.`,
    contextLine,
    `Utilise Google Search Grounding pour trouver uniquement des opportunités réelles et actuellement ouvertes (ou dont la date limite >= ${todayIso}). Exclue toute opportunité expirée et n'invente aucune URL.`,
    `Retourne un tableau JSON dans un bloc \`\`\`json ... \`\`\` contenant jusqu'à 5 objets avec exactement les champs : title, organization, type ("hackathon" | "internship" | "scholarship" | "competition" | "program"), deadline (YYYY-MM-DD ou "À vérifier"), location, eligibility (tableau de chaînes), skillsRequired (tableau de chaînes), matchReason, officialUrl (URL complète issue de la recherche).`,
  ].join('\n');
}
