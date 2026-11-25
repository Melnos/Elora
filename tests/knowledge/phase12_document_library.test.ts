import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import {
  validateDocumentFile,
  extractDocumentTextFromBuffer,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_EXTRACTED_CHARS,
} from '../../src/lib/knowledge/documentExtractor';
import { ContextEngine } from '../../src/lib/context/ContextEngine';
import { sanitizeForFirestore } from '../../src/lib/firebase/firestore';
import type { KnowledgeDoc } from '../../src/types';

function createMinimalPdfBuffer(textContent: string): ArrayBuffer {
  const safeText = textContent.replace(/[()\\]/g, '');
  const streamBody = safeText ? `BT\n/F1 12 Tf\n72 720 Td\n(${safeText}) Tj\nET` : '';
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamBody, 'utf8')} >>\nstream\n${streamBody}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  const buf = Buffer.from(pdf, 'utf8');
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

describe('Phase 12 — Knowledge Document Management & Extraction Réelle', () => {
  it('1. Validation des formats et tailles (PDF, DOCX, TXT vs formats non supportés / trop gros)', () => {
    strictEqual(validateDocumentFile({ name: 'cours.pdf', size: 1024 }).valid, true);
    strictEqual(validateDocumentFile({ name: 'memo.docx', size: 2048 }).valid, true);
    strictEqual(validateDocumentFile({ name: 'notes.txt', size: 512 }).valid, true);
    strictEqual(validateDocumentFile({ name: 'virus.exe', size: 500 }).valid, false);
    strictEqual(validateDocumentFile({ name: 'empty.pdf', size: 0 }).valid, false);
    strictEqual(
      validateDocumentFile({ name: 'huge.pdf', size: MAX_DOCUMENT_SIZE_BYTES + 1 }).valid,
      false
    );
  });

  it('2. Extraction réelle d\'un PDF via pdfjs-dist', async () => {
    const pdfBuf = createMinimalPdfBuffer('ELORA PDF VALIDATION ZETA-2026');
    const res = await extractDocumentTextFromBuffer('test_elora.pdf', pdfBuf);
    strictEqual(res.success, true, res.error);
    strictEqual(res.pageCount, 1);
    ok(res.text.includes('ELORA PDF VALIDATION ZETA-2026'), `Texte extrait inattendu: ${res.text}`);
  });

  it('3. PDF sans couche texte (scanné/vide) échoue honnêtement sans inventer de texte', async () => {
    const emptyPdfBuf = createMinimalPdfBuffer('');
    const res = await extractDocumentTextFromBuffer('scan.pdf', emptyPdfBuf);
    strictEqual(res.success, false);
    strictEqual(res.text, '');
    ok(res.error && res.error.includes('Aucun texte extractible'));
  });

  it('4. Extraction TXT + troncature sous la limite Firestore (<= 50 000 chars)', async () => {
    const longText = 'A'.repeat(MAX_EXTRACTED_CHARS + 500);
    const buf = Buffer.from(longText, 'utf8');
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const res = await extractDocumentTextFromBuffer('long.txt', ab);
    strictEqual(res.success, true);
    strictEqual(res.truncated, true);
    ok(res.text.length < 50000);
  });

  it('5. ContextEngine exploite le contenu extrait d\'un PDF et cite la bonne source', async () => {
    const pdfBuf = createMinimalPdfBuffer('Protocole Alpha 42 pour architecture hybride ELORA');
    const extracted = await extractDocumentTextFromBuffer('rapport_alpha.pdf', pdfBuf);
    strictEqual(extracted.success, true);

    const doc: KnowledgeDoc = sanitizeForFirestore({
      id: 'doc_pdf_test',
      title: 'Rapport Alpha PDF',
      collection: 'Architecture',
      type: 'pdf',
      summary: '[Réf: REF-ALPHA-01] Rapport technique',
      keyInsights: ['Fichier source : rapport_alpha.pdf'],
      content: extracted.text,
      addedAt: '2026-11-25',
      tags: ['pdf', 'REF-ALPHA-01'],
    });

    const ctx = ContextEngine.buildContext(
      {
        prompt: 'Que dit le Rapport Alpha sur le Protocole Alpha 42 ?',
        userId: 'uid_test',
      },
      {
        profile: {
          name: 'Djima',
          email: 'd@example.com',
          roleTitle: 'Dev',
          currentObjective: 'ELORA',
          learningFocus: ['AI'],
        },
        memories: [],
        tasks: [],
        goals: [],
        docs: [doc],
        focusSessions: [],
      }
    );

    ok(
      ctx.referencedSources.some((s) => s.id === 'doc_pdf_test' && s.title === 'Rapport Alpha PDF'),
      'La source PDF doit être citée dans referencedSources'
    );
    ok(
      ctx.systemPromptBlock.includes('Protocole Alpha 42'),
      'Le contenu extrait du PDF doit être injecté dans systemPromptBlock'
    );
  });
});
