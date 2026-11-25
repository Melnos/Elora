import { describe, it, beforeEach } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  extractStoragePathFromInsights,
  STORAGE_PATH_PREFIX,
  uploadKnowledgeFile,
  resetStorageAvailabilityCache,
} from '../../src/lib/firebase/storage';

describe('Phase 14A — Firebase Storage Optionnel, Rules & Compatibilité', () => {
  beforeEach(() => {
    resetStorageAvailabilityCache();
  });

  it('1. extractStoragePathFromInsights gère les anciens documents sans chemin Storage et les nouveaux documents', () => {
    strictEqual(extractStoragePathFromInsights(undefined), null);
    strictEqual(extractStoragePathFromInsights(['Document importé']), null);
    strictEqual(
      extractStoragePathFromInsights([
        'Fichier source : cours.pdf',
        `${STORAGE_PATH_PREFIX}users/uid_123/knowledge/doc_1/cours.pdf`,
      ]),
      'users/uid_123/knowledge/doc_1/cours.pdf'
    );
  });

  it('2. Audit statique storage.rules : isolation stricte, MIME PDF/DOCX/TXT, taille 15 Mo et default-deny', () => {
    const rules = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf-8');
    ok(rules.includes('request.auth != null && request.auth.uid != null'), 'Authentification requise');
    ok(rules.includes('request.auth.uid == userId'), 'Isolation stricte par userId');
    ok(rules.includes('15 * 1024 * 1024'), 'Limite de taille 15 Mo');
    ok(rules.includes("matches('application/pdf')"), 'MIME PDF autorisé');
    ok(rules.includes('wordprocessingml'), 'MIME DOCX autorisé');
    ok(rules.includes("matches('text/.*')"), 'MIME texte autorisé');
    ok(
      /match\s+\/\{allPaths=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/.test(rules),
      'Default-deny maintenu'
    );
  });

  it('3. Bucket non provisionné (404) : désactive proprement Storage sans simuler d\'upload ni bloquer', async () => {
    let fetchCalls = 0;
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetchCalls++;
      return { status: 404 } as Response;
    }) as typeof fetch;

    try {
      const fakeFile = new File(['hello'], 'cours.pdf', { type: 'application/pdf' });
      const res1 = await uploadKnowledgeFile('uid_1', 'doc_1', fakeFile);
      strictEqual(res1.status, 'not_provisioned');
      strictEqual(res1.storagePath, undefined);
      ok(res1.message.includes('non archivé dans le cloud'));

      // Deuxième appel : utilise le cache de session sans relancer de requête Storage
      const res2 = await uploadKnowledgeFile('uid_1', 'doc_2', fakeFile);
      strictEqual(res2.status, 'not_provisioned');
      strictEqual(fetchCalls, 1);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
