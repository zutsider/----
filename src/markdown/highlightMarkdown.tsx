import { Fragment, type ReactNode } from 'react';

interface InlineRule {
  className: string;
  pattern: RegExp;
}

const inlineRules: InlineRule[] = [
  { className: 'md-code', pattern: /`[^`\n]+`/ },
  { className: 'md-link', pattern: /\[[^\]\n]+\]\([^)]+\)/ },
  { className: 'md-strong', pattern: /(\*\*[^*\n]+\*\*|__[^_\n]+__)/ },
  { className: 'md-emphasis', pattern: /(\*[^*\n]+\*|_[^_\n]+_)/ }
];

function lineClassName(line: string): string {
  if (/^#{1,6}\s/.test(line)) return 'md-heading';
  if (/^>\s?/.test(line)) return 'md-quote';
  if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) return 'md-list';
  if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line)) return 'md-task';
  if (/^\s*\|.*\|\s*$/.test(line)) return 'md-table';
  if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return 'md-rule';
  return 'md-text';
}

function renderInline(text: string, prefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    let bestMatch: { rule: InlineRule; match: RegExpExecArray } | null = null;

    for (const rule of inlineRules) {
      const match = rule.pattern.exec(remaining);
      if (!match) continue;
      if (!bestMatch || match.index < bestMatch.match.index) {
        bestMatch = { rule, match };
      }
    }

    if (!bestMatch) {
      nodes.push(remaining);
      break;
    }

    const { rule, match } = bestMatch;
    if (match.index > 0) nodes.push(remaining.slice(0, match.index));
    nodes.push(
      <span className={rule.className} key={`${prefix}-${key}`}>
        {match[0]}
      </span>
    );
    remaining = remaining.slice(match.index + match[0].length);
    key += 1;
  }

  return nodes;
}

export function highlightMarkdown(text: string): ReactNode {
  const lines = text.split('\n');

  return lines.map((line, index) => (
    <Fragment key={index}>
      <span className={lineClassName(line)}>{renderInline(line, `line-${index}`)}</span>
      {index < lines.length - 1 ? '\n' : null}
    </Fragment>
  ));
}
