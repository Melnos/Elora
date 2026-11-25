/**
 * ELORA - Extracteur réel de documents Knowledge
 * Formats pris en charge : PDF (.pdf), Word (.docx), Texte/Markdown/CSV/JSON (.txt, .md, .csv, .json).
 *
 * RÈGLE D'HONNÊTETÉ : Ne jamais prétendre analyser un format non supporté
 * ni fabriquer du contenu lorsqu'un PDF est scanné / vide.
 */

import type { KnowledgeDoc } from '../../types';

export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo
export const MAX_EXTRACTED_CHARS = 45_000; // Compatible avec la limite 50 000 chars de firestore.rules

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export interface DocumentValidationResult {
  valid: boolean;
  ext?: SupportedExtension;
  formatLabel?: string;
  docType?: KnowledgeDoc['type'];
  error?: string;
}

export interface DocumentExtractionResult {
  success: boolean;
  text: string;
  charCount: number;
  pageCount?: number;
  truncated: boolean;
  error?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : '';
}

export function validateDocumentFile(file: {
  name: string;
  size: number;
  type?: string;
}): DocumentValidationResult {
  const ext = getFileExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension)) {
    return {
      valid: false,
      error: `Format non pris en charge (${ext || 'inconnu'}). Formats acceptés : PDF, DOCX, TXT, MD, CSV, JSON.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: 'Le fichier sélectionné est vide (0 octet).',
    };
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: `Fichier trop volumineux (${formatFileSize(file.size)}). Taille maximale autorisée : 15 Mo.`,
    };
  }

  const typedExt = ext as SupportedExtension;
  const formatMap: Record<SupportedExtension, { label: string; docType: KnowledgeDoc['type'] }> = {
    '.pdf': { label: 'PDF', docType: 'pdf' },
    '.docx': { label: 'DOCX', docType: 'notes' },
    '.txt': { label: 'TXT', docType: 'notes' },
    '.md': { label: 'Markdown', docType: 'notes' },
    '.csv': { label: 'CSV', docType: 'research' },
    '.json': { label: 'JSON', docType: 'research' },
  };

  return {
    valid: true,
    ext: typedExt,
    formatLabel: formatMap[typedExt].label,
    docType: formatMap[typedExt].docType,
  };
}

function finalizeExtractedText(raw: string, pageCount?: number): DocumentExtractionResult {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) {
    return {
      success: false,
      text: '',
      charCount: 0,
      pageCount,
      truncated: false,
      error:
        'Aucun texte extractible détecté dans ce document (fichier vide ou PDF scanné sous forme d\'image sans couche texte).',
    };
  }

  const truncated = normalized.length > MAX_EXTRACTED_CHARS;
  const text = truncated
    ? `${normalized.slice(0, MAX_EXTRACTED_CHARS)}\n\n[... Contenu tronqué à ${MAX_EXTRACTED_CHARS} caractères pour respecter la limite Firestore ...]`
    : normalized;

  return {
    success: true,
    text,
    charCount: normalized.length,
    pageCount,
    truncated,
  };
}

export async function extractDocumentTextFromBuffer(
  fileName: string,
  buffer: ArrayBuffer
): Promise<DocumentExtractionResult> {
  const validation = validateDocumentFile({ name: fileName, size: buffer.byteLength });
  if (!validation.valid || !validation.ext) {
    return {
      success: false,
      text: '',
      charCount: 0,
      truncated: false,
      error: validation.error || 'Format non pris en charge.',
    };
  }

  try {
    if (
      validation.ext === '.txt' ||
      validation.ext === '.md' ||
      validation.ext === '.csv' ||
      validation.ext === '.json'
    ) {
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      return finalizeExtractedText(decoded);
    }

    if (validation.ext === '.docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return finalizeExtractedText(result.value || '');
    }

    if (validation.ext === '.pdf') {
      const pdfjs =
        typeof window === 'undefined'
          ? await import('pdfjs-dist/legacy/build/pdf.mjs')
          : await import('pdfjs-dist');
      if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      }
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        verbosity: 0,
      });
      const pdf = await loadingTask.promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = (content.items as Array<{ str?: string }>)
          .map((it) => it.str || '')
          .join(' ')
          .trim();
        if (pageText) pages.push(pageText);
      }
      return finalizeExtractedText(pages.join('\n\n'), pdf.numPages);
    }

    return {
      success: false,
      text: '',
      charCount: 0,
      truncated: false,
      error: 'Format non pris en charge.',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      text: '',
      charCount: 0,
      truncated: false,
      error: `Impossible d'extraire le texte du document : ${msg}`,
    };
  }
}

export async function extractDocumentText(file: File): Promise<DocumentExtractionResult> {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    return {
      success: false,
      text: '',
      charCount: 0,
      truncated: false,
      error: validation.error,
    };
  }
  const buffer = await file.arrayBuffer();
  return extractDocumentTextFromBuffer(file.name, buffer);
}
