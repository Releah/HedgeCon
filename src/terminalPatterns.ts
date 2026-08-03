import type { TerminalPattern } from './types';
import type { IDecoration, Terminal } from '@xterm/xterm';

const ansi = /(\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\)))/g;
const rgb = (hex: string) => { const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff'; return [1, 3, 5].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16)); };
export const validTerminalPattern = (pattern: string) => { if (!pattern.trim() || pattern.length > 256) return false; try { new RegExp(pattern, 'giu'); return true; } catch { return false; } };
export function highlightTerminalText(text: string, patterns: TerminalPattern[] = []) {
  const active = patterns.filter(rule => rule.enabled && validTerminalPattern(rule.pattern)).slice(0, 50);
  if (!active.length) return text;
  return active.reduce((output, rule) => output.split(ansi).map(part => { if (part.startsWith('\x1b')) return part; const [red, green, blue] = rgb(rule.colour); return part.replace(new RegExp(rule.pattern, 'giu'), match => `\x1b[38;2;${red};${green};${blue}m${match}\x1b[39m`); }).join(''), text);
}

const lineDecorations = new WeakMap<Terminal, Map<number, IDecoration[]>>();
export function refreshTerminalPatternDecorations(terminal: Terminal, patterns: TerminalPattern[] = [], touchedText = '') {
  const active = patterns.filter(rule => rule.enabled && validTerminalPattern(rule.pattern)).slice(0, 50); const cursorLine = terminal.buffer.active.baseY + terminal.buffer.active.cursorY; const affected = Math.max(2, (touchedText.match(/\n/g)?.length || 0) + Math.ceil(touchedText.length / Math.max(1, terminal.cols)) + 2); const firstLine = Math.max(0, cursorLine - Math.min(200, affected)); const stored = lineDecorations.get(terminal) || new Map<number, IDecoration[]>(); lineDecorations.set(terminal, stored);
  for (let lineNumber = firstLine; lineNumber <= cursorLine; lineNumber += 1) { stored.get(lineNumber)?.forEach(decoration => decoration.dispose()); stored.delete(lineNumber); if (!active.length) continue; const line = terminal.buffer.active.getLine(lineNumber)?.translateToString(true) || ''; const decorations: IDecoration[] = []; for (const rule of active) { const expression = new RegExp(rule.pattern, 'giu'); for (const match of line.matchAll(expression)) { if (match.index === undefined || !match[0].length) continue; const marker = terminal.registerMarker(lineNumber - cursorLine); if (!marker) continue; const decoration = terminal.registerDecoration({ marker, x: match.index, width: Math.max(1, [...match[0]].length), foregroundColor: /^#[0-9a-f]{6}$/i.test(rule.colour) ? rule.colour : '#ffffff', layer: 'top' }); if (decoration) decorations.push(decoration); else marker.dispose(); } } if (decorations.length) stored.set(lineNumber, decorations); }
}
