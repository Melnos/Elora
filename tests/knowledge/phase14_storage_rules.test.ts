import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import {
  extractStoragePathFromInsights,
  STORAGE_PATH_PREFIX,
} from '../../src/lib/firebase/storage';

describe('Phase 14A — Firebase Storage Rules & Knowledge Path Helpers', () => {
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
});
