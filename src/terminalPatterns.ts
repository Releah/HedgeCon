import type { TerminalPattern } from './types';

const ansi = /(\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\)))/g;
const rgb = (hex: string) => { const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff'; return [1, 3, 5].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16)); };
export const validTerminalPattern = (pattern: string) => { if (!pattern.trim() || pattern.length > 256) return false; try { new RegExp(pattern, 'giu'); return true; } catch { return false; } };
export function highlightTerminalText(text: string, patterns: TerminalPattern[] = []) {
  const active = patterns.filter(rule => rule.enabled && validTerminalPattern(rule.pattern)).slice(0, 50);
  if (!active.length) return text;
  return active.reduce((output, rule) => output.split(ansi).map(part => { if (part.startsWith('\x1b')) return part; const [red, green, blue] = rgb(rule.colour); return part.replace(new RegExp(rule.pattern, 'giu'), match => `\x1b[38;2;${red};${green};${blue}m${match}\x1b[39m`); }).join(''), text);
}
