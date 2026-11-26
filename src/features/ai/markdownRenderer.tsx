import React from 'react';
import { Copy, Check } from 'lucide-react';

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatInlineMarkdown(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-[var(--color-text-main)]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[var(--color-bg-surface-elevated)] font-mono text-[11px] text-[var(--color-accent)] border border-[var(--color-border-subtle)] break-all"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, rawUrl] = linkMatch;
      if (isSafeHttpUrl(rawUrl)) {
        return (
          <a
            key={idx}
            href={rawUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80 break-all"
          >
            {label}
          </a>
        );
      }
      return label;
    }

    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}

function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return false;
  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function renderTextSegment(text: string, keyPrefix: string): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Détection tableau Markdown (en-tête + ligne séparateur |---|)
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparatorRow(lines[i + 1])
    ) {
      const headers = parseTableRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]));
        i++;
      }

      nodes.push(
        <div
          key={`${keyPrefix}-tbl-${i}`}
          className="my-2.5 overflow-x-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] max-w-full"
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--color-bg-surface-elevated)] border-b border-[var(--color-border-subtle)]">
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-3 py-2 font-bold text-[var(--color-text-main)] whitespace-nowrap">
                    {formatInlineMarkdown(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-[var(--color-border-subtle)]/60">
                  {headers.map((_, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-[var(--color-text-main)] align-top">
                      {formatInlineMarkdown(row[cIdx] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith('### ')) {
      nodes.push(
        <h4 key={`${keyPrefix}-${i}`} className="font-bold text-sm text-[var(--color-text-main)] mt-2.5 mb-1 break-words [overflow-wrap:anywhere]">
          {formatInlineMarkdown(line.slice(4))}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      nodes.push(
        <h3 key={`${keyPrefix}-${i}`} className="font-extrabold text-base text-[var(--color-text-main)] mt-3 mb-1.5 break-words [overflow-wrap:anywhere]">
          {formatInlineMarkdown(line.slice(3))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      nodes.push(
        <h2 key={`${keyPrefix}-${i}`} className="font-extrabold text-base sm:text-lg text-[var(--color-text-main)] mt-3 mb-1.5 break-words [overflow-wrap:anywhere]">
          {formatInlineMarkdown(line.slice(2))}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('> ')) {
      nodes.push(
        <blockquote
          key={`${keyPrefix}-${i}`}
          className="pl-3 py-1 my-1.5 border-l-2 border-l-[var(--color-accent)] text-xs italic text-[var(--color-text-muted)] bg-[var(--color-accent-bg)] rounded-r-lg break-words [overflow-wrap:anywhere] max-w-full"
        >
          {formatInlineMarkdown(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      nodes.push(
        <div key={`${keyPrefix}-${i}`} className="flex items-start gap-2 my-0.5 pl-1 text-xs sm:text-sm min-w-0 max-w-full">
          <span className="font-semibold text-[var(--color-accent)] shrink-0 tabular-nums">
            {orderedMatch[1]}.
          </span>
          <span className="flex-1 leading-relaxed break-words [overflow-wrap:anywhere]">
            {formatInlineMarkdown(orderedMatch[2])}
          </span>
        </div>
      );
      i++;
      continue;
    }

    if (trimmed.match(/^(\*|-)\s+/)) {
      const itemText = trimmed.replace(/^(\*|-)\s+/, '');
      nodes.push(
        <div key={`${keyPrefix}-${i}`} className="flex items-start gap-2 my-0.5 pl-1 text-xs sm:text-sm min-w-0 max-w-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0 mt-2" />
          <span className="flex-1 leading-relaxed break-words [overflow-wrap:anywhere]">
            {formatInlineMarkdown(itemText)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    if (trimmed === '') {
      nodes.push(<div key={`${keyPrefix}-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    nodes.push(
      <p key={`${keyPrefix}-${i}`} className="my-0.5 leading-relaxed text-xs sm:text-sm break-words [overflow-wrap:anywhere] max-w-full">
        {formatInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return (
    <div key={keyPrefix} className="space-y-1 min-w-0 max-w-full">
      {nodes}
    </div>
  );
}

interface FormattedMessageProps {
  content: string;
  msgId: string;
  copiedCodeId: string | null;
  onCopyCode: (codeKey: string, code: string) => void;
}

export const FormattedMarkdownMessage: React.FC<FormattedMessageProps> = ({
  content,
  msgId,
  copiedCodeId,
  onCopyCode,
}) => {
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blockCounter = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      segments.push(renderTextSegment(textBefore, `${msgId}-txt-${blockCounter}`));
    }

    const language = match[1] || 'texte';
    const code = match[2];
    const codeKey = `${msgId}-code-${blockCounter}`;

    segments.push(
      <div
        key={codeKey}
        className="my-3 rounded-xl overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] max-w-full min-w-0"
      >
        <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--color-bg-surface-elevated)] border-b border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-muted)] font-mono">
          <span className="font-semibold uppercase tracking-wider">{language}</span>
          <button
            type="button"
            onClick={() => onCopyCode(codeKey, code)}
            className="flex items-center gap-1 hover:text-[var(--color-text-main)] transition-colors py-0.5 px-1.5 rounded cursor-pointer"
            title="Copier le code"
          >
            {copiedCodeId === codeKey ? (
              <>
                <Check size={11} className="text-[var(--color-accent)]" />
                <span className="text-[var(--color-accent)] font-sans">Copié</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span className="font-sans">Copier</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3 sm:p-3.5 text-xs font-mono text-[var(--color-text-main)] overflow-x-auto max-w-full leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
    blockCounter++;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText.trim() || segments.length === 0) {
    segments.push(renderTextSegment(remainingText || content, `${msgId}-txt-end`));
  }

  return <div className="space-y-2 min-w-0 max-w-full">{segments}</div>;
};
