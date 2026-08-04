import type { IDecoration, IMarker, Terminal } from '@xterm/xterm';
import type { TerminalPattern } from './types';

const MAX_PATTERN_LENGTH = 256;
const MAX_RULES = 25;
const MAX_LINES_PER_UPDATE = 120;
const MAX_DECORATIONS_PER_LINE = 100;

export function terminalPatternError(pattern: string) {
  if (!pattern.trim()) return 'Enter a regular expression.';
  if (pattern.length > MAX_PATTERN_LENGTH) return `Keep the expression below ${MAX_PATTERN_LENGTH} characters.`;
  if (/\r|\n|\0/.test(pattern)) return 'Terminal patterns must match within a single line.';
  let expression: RegExp;
  try { expression = new RegExp(pattern, 'giu'); } catch (error) { return error instanceof SyntaxError ? error.message.replace(/^Invalid regular expression:\s*/i, '') : 'The expression could not be compiled.'; }
  if (expression.test('')) return 'The expression must not match an empty string.';
  const nestedQuantifier = /\((?:[^()\\]|\\.)*(?:\*|\+|\{\d+(?:,\d*)?\})(?:[^()\\]|\\.)*\)\s*(?:\*|\+|\{\d+(?:,\d*)?\})/;
  if (nestedQuantifier.test(pattern)) return 'Avoid nested repetition such as (text+)+; it can freeze a live terminal.';
  return null;
}

export const validTerminalPattern = (pattern: string) => terminalPatternError(pattern) === null;

type StoredDecoration = { decoration: IDecoration; marker: IMarker };
const lineDecorations = new WeakMap<Terminal, Map<number, StoredDecoration[]>>();
const disposeDecorations = (items: StoredDecoration[] | undefined) => items?.forEach(({ decoration, marker }) => { decoration.dispose(); marker.dispose(); });

function highlightingExpression(pattern: string) {
  // Rules colour matching fragments within a rendered terminal line. Treat a
  // pair of outer anchors as boundaries around that fragment, rather than the
  // shell prompt and every other character xterm keeps on the same line.
  const fragment = pattern.startsWith('^') && pattern.endsWith('$') && !pattern.endsWith('\\$') ? pattern.slice(1, -1) : pattern;
  return new RegExp(fragment, 'giu');
}

export function refreshTerminalPatternDecorations(terminal: Terminal, patterns: TerminalPattern[] = [], touchedText = '') {
  const active = patterns.flatMap(rule => {
    if (!rule.enabled || terminalPatternError(rule.pattern)) return [];
    try { return [{ rule, expression: highlightingExpression(rule.pattern) }]; } catch { return []; }
  }).slice(0, MAX_RULES);
  const cursorLine = terminal.buffer.active.baseY + terminal.buffer.active.cursorY;
  const affected = Math.max(2, (touchedText.match(/\n/g)?.length || 0) + Math.ceil(touchedText.length / Math.max(1, terminal.cols)) + 2);
  const firstLine = Math.max(0, cursorLine - Math.min(MAX_LINES_PER_UPDATE, affected));
  const stored = lineDecorations.get(terminal) || new Map<number, StoredDecoration[]>(); lineDecorations.set(terminal, stored);
  for (let lineNumber = firstLine; lineNumber <= cursorLine; lineNumber += 1) {
    disposeDecorations(stored.get(lineNumber)); stored.delete(lineNumber);
    if (!active.length || terminal.cols < 1) continue;
    const line = terminal.buffer.active.getLine(lineNumber)?.translateToString(true) || '';
    const decorations: StoredDecoration[] = []; let matchCount = 0;
    for (const { rule, expression } of active) {
      expression.lastIndex = 0;
      try {
        for (const match of line.matchAll(expression)) {
          if (match.index === undefined || !match[0].length || matchCount >= MAX_DECORATIONS_PER_LINE) break;
          const x = Math.min(terminal.cols - 1, Math.max(0, Array.from(line.slice(0, match.index)).length));
          const width = Math.min(terminal.cols - x, Math.max(1, Array.from(match[0]).length));
          const marker = terminal.registerMarker(lineNumber - cursorLine); if (!marker) continue;
          const decoration = terminal.registerDecoration({ marker, x, width, foregroundColor: /^#[0-9a-f]{6}$/i.test(rule.colour) ? rule.colour : '#ffffff', layer: 'top' });
          if (decoration) { decorations.push({ decoration, marker }); matchCount += 1; } else marker.dispose();
        }
      } catch { /* A failed rule must never interrupt terminal rendering. */ }
      if (matchCount >= MAX_DECORATIONS_PER_LINE) break;
    }
    if (decorations.length) stored.set(lineNumber, decorations);
  }
  if (active.length && terminal.rows > 0) terminal.refresh(0, terminal.rows - 1);
}
