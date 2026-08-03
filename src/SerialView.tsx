import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import type { SerialEvent, Session, UiSettings } from './types';
import { refreshTerminalPatternDecorations } from './terminalPatterns';

export default function SerialView({ session, active = true }: { session: Session; active?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<Partial<UiSettings>>((() => { try { return JSON.parse(localStorage.getItem('hedgecon-ui-settings') || '{}'); } catch { return {}; } })());
  useEffect(() => { const update = (event: Event) => { settingsRef.current = (event as CustomEvent<UiSettings>).detail; }; window.addEventListener('hedgecon:ui-settings', update); return () => window.removeEventListener('hedgecon:ui-settings', update); }, []);
  useEffect(() => {
    if (!hostRef.current || !session.serialPath) return;
    const settings = settingsRef.current;
    const terminal = new Terminal({ cursorBlink: true, convertEol: false, theme: { background: settings.terminalDefault || '#080c12', foreground: settings.terminalForeground || '#d7e0ea' }, fontFamily: "'Cascadia Code', Consolas, monospace", fontSize: 13 });
    const fit = new FitAddon(); terminal.loadAddon(fit); terminal.open(hostRef.current); fit.fit(); terminal.focus();
    const connectionId = crypto.randomUUID(); const input = terminal.onData(data => window.hedge.writeSerial(connectionId, data));
    const remove = window.hedge.onSerialEvent((event: SerialEvent) => { if (event.connectionId !== connectionId) return; if (event.type === 'data') terminal.write(event.data, () => refreshTerminalPatternDecorations(terminal, settingsRef.current.terminalPatterns, event.data)); else if (event.type === 'status') terminal.writeln(`\x1b[38;2;103;215;178m${event.data}\x1b[0m`); else terminal.writeln(`\r\n\x1b[38;2;232;126;126m${event.data}\x1b[0m`); });
    void window.hedge.connectSerial({ connectionId, path: session.serialPath, baudRate: session.serialBaudRate || 9600, dataBits: session.serialDataBits || 8, stopBits: session.serialStopBits || 1, parity: session.serialParity || 'none' }).catch(error => terminal.writeln(`\r\n\x1b[38;2;232;126;126m${error instanceof Error ? error.message : String(error)}\x1b[0m`));
    const resize = new ResizeObserver(() => fit.fit()); resize.observe(hostRef.current);
    return () => { resize.disconnect(); input.dispose(); remove(); window.hedge.disconnectSerial(connectionId); terminal.dispose(); };
  }, [session]);
  useEffect(() => { if (active) hostRef.current?.querySelector<HTMLElement>('.xterm-helper-textarea')?.focus(); }, [active]);
  return <section className="terminal-panel"><header><div><span className="status-dot" /><strong>{session.name}</strong><small>{session.serialPath} · {session.serialBaudRate || 9600} baud</small></div></header><div ref={hostRef} className="terminal" /></section>;
}
