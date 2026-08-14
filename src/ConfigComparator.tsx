import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

type Source = { name: string; text: string; connectionId: string };
type Connection = { id: string; name: string; host: string; platform: string };
type Row = { left?: string; right?: string; kind: 'same' | 'changed' | 'left' | 'right' };

const ansi = /\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -\/]*[@-~]/g;
const volatile = /(?:uptime|current time|last (?:changed|login|configuration change)|generated (?:at|on)|time source|load average|packets? (?:input|output)|bytes? (?:input|output)|\b(?:input|output) rate\b)/i;

function clean(text: string, options: { whitespace: boolean; blanks: boolean; volatile: boolean }) {
  let lines = text.replace(ansi, '').replace(/\r/g, '').split('\n');
  if (options.volatile) lines = lines.filter(line => !volatile.test(line));
  if (options.whitespace) lines = lines.map(line => line.trim().replace(/\s+/g, ' '));
  if (options.blanks) lines = lines.filter(line => line.trim());
  return lines;
}

function align(left: string[], right: string[]): Row[] {
  const rows: Row[] = []; let a = 0; let b = 0; const window = 35;
  while (a < left.length || b < right.length) {
    if (left[a] === right[b]) { rows.push({ left: left[a++], right: right[b++], kind: 'same' }); continue; }
    let leftJump = -1; let rightJump = -1;
    for (let offset = 1; offset <= window && (a + offset < left.length || b + offset < right.length); offset += 1) {
      if (leftJump < 0 && a + offset < left.length && left[a + offset] === right[b]) leftJump = offset;
      if (rightJump < 0 && b + offset < right.length && right[b + offset] === left[a]) rightJump = offset;
      if (leftJump >= 0 || rightJump >= 0) break;
    }
    if (leftJump >= 0 && (rightJump < 0 || leftJump <= rightJump)) { rows.push({ left: left[a++], kind: 'left' }); continue; }
    if (rightJump >= 0) { rows.push({ right: right[b++], kind: 'right' }); continue; }
    rows.push({ left: left[a++], right: right[b++], kind: 'changed' });
  }
  return rows;
}

export default function ConfigComparator({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'files' | 'live'>('files');
  const [sources, setSources] = useState<[Source, Source]>([{ name: 'Configuration A', text: '', connectionId: '' }, { name: 'Configuration B', text: '', connectionId: '' }]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [command, setCommand] = useState('show running-config');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [options, setOptions] = useState({ whitespace: false, blanks: true, volatile: true });
  const [sourceSplit, setSourceSplit] = useState(() => Math.max(20, Math.min(80, Number(localStorage.getItem('hedgecon-compare-source-split')) || 50)));
  const [sourceHeight, setSourceHeight] = useState(() => Math.max(120, Math.min(520, Number(localStorage.getItem('hedgecon-compare-source-height')) || 215)));
  const sourceSplitRef = useRef(sourceSplit); const sourceHeightRef = useRef(sourceHeight);
  useEffect(() => { if (mode === 'live') void window.hedge.listCompareConnections().then(setConnections).catch(error => setMessage(String(error))); }, [mode]);
  const update = (index: 0 | 1, patch: Partial<Source>) => setSources(current => { const next: [Source, Source] = [{ ...current[0] }, { ...current[1] }]; next[index] = { ...next[index], ...patch }; return next; });
  const rows = useMemo(() => align(clean(sources[0].text, options), clean(sources[1].text, options)), [sources, options]);
  const differences = rows.filter(row => row.kind !== 'same').length;
  const openFile = async (index: 0 | 1) => { try { const result = await window.hedge.openCompareText(); if (result) update(index, { name: result.name, text: result.contents }); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } };
  const capture = async () => { if (!sources[0].connectionId || !sources[1].connectionId) return setMessage('Choose two active SSH sessions.'); setBusy(true); setMessage('Capturing read-only output from both sessions…'); try { const [left, right] = await Promise.all(sources.map(source => window.hedge.captureCompareText(source.connectionId, command))); setSources(current => [{ ...current[0], text: left }, { ...current[1], text: right }]); setMessage('Capture complete. Output is held in memory only.'); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); } };
  const beginSourceResize = (event: ReactPointerEvent<HTMLDivElement>) => { const container = event.currentTarget.parentElement; if (!container) return; const rect = container.getBoundingClientRect(); const move = (pointer: PointerEvent) => { const value = Math.max(20, Math.min(80, ((pointer.clientX - rect.left) / rect.width) * 100)); sourceSplitRef.current = value; setSourceSplit(value); }; const finish = () => { localStorage.setItem('hedgecon-compare-source-split', String(sourceSplitRef.current)); window.removeEventListener('pointermove', move); document.body.classList.remove('resizing-compare-horizontal'); }; document.body.classList.add('resizing-compare-horizontal'); window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish, { once: true }); };
  const beginHeightResize = (event: ReactPointerEvent<HTMLDivElement>) => { const startY = event.clientY; const start = sourceHeight; const move = (pointer: PointerEvent) => { const maximum = Math.max(120, window.innerHeight - 330); const value = Math.max(120, Math.min(maximum, start + pointer.clientY - startY)); sourceHeightRef.current = value; setSourceHeight(value); }; const finish = () => { localStorage.setItem('hedgecon-compare-source-height', String(sourceHeightRef.current)); window.removeEventListener('pointermove', move); document.body.classList.remove('resizing-compare-vertical'); }; document.body.classList.add('resizing-compare-vertical'); window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish, { once: true }); };
  return <div className="compare-screen" style={{ '--compare-source-split': `${sourceSplit}%`, '--compare-source-height': `${sourceHeight}px` } as CSSProperties}>
    <header className="compare-header"><div><small>CONFIGURATION TOOLS</small><h1>Compare</h1><p>Compare pasted text, local files, or live read-only output without saving device configurations.</p></div><button className="secondary" onClick={onClose}>Close</button></header>
    <div className="compare-toolbar">
      <div className="mode-tabs"><button className={mode === 'files' ? 'active' : ''} onClick={() => setMode('files')}>Files / pasted text</button><button className={mode === 'live' ? 'active' : ''} onClick={() => setMode('live')}>Live SSH sessions</button></div>
      <div className="compare-options"><label><input type="checkbox" checked={options.whitespace} onChange={event => setOptions({ ...options, whitespace: event.target.checked })} /> Ignore whitespace</label><label><input type="checkbox" checked={options.blanks} onChange={event => setOptions({ ...options, blanks: event.target.checked })} /> Ignore blank lines</label><label title="Filters timestamps, uptime, last-change details and traffic counters"><input type="checkbox" checked={options.volatile} onChange={event => setOptions({ ...options, volatile: event.target.checked })} /> Ignore volatile lines</label></div>
    </div>
    {mode === 'live' && <section className="compare-live"><div className="compare-live-selectors">{([0, 1] as const).map(index => <label key={index}>Session {index ? 'B' : 'A'}<select value={sources[index].connectionId} onChange={event => { const connection = connections.find(item => item.id === event.target.value); update(index, { connectionId: event.target.value, name: connection ? `${connection.name} · ${connection.host}` : sources[index].name }); }}><option value="">Select an active SSH session</option>{connections.map(connection => <option key={connection.id} value={connection.id}>{connection.name} · {connection.host}</option>)}</select></label>)}</div><label>Read-only command<input value={command} onChange={event => setCommand(event.target.value)} /></label><button className="primary" disabled={busy} onClick={capture}>{busy ? 'Capturing…' : 'Capture and compare'}</button><small>Supports network show/display/get commands and read-only Unix inspection commands including ls, pwd, cat, head, tail, stat, df and du. Shell operators and redirection are blocked.</small></section>}
    {message && <button className="compare-message" onClick={() => setMessage('')} title="Dismiss">{message}</button>}
    <section className="compare-editors">{([0, 1] as const).map(index => <Fragment key={index}>{index === 1 && <div className="compare-source-resizer" role="separator" aria-orientation="vertical" aria-label="Resize comparison sources" onPointerDown={beginSourceResize} />}<div><header><input value={sources[index].name} onChange={event => update(index, { name: event.target.value })} />{mode === 'files' && <button className="secondary" onClick={() => openFile(index)}>Open file</button>}</header><textarea spellCheck={false} value={sources[index].text} onChange={event => update(index, { text: event.target.value })} placeholder={`Paste configuration ${index ? 'B' : 'A'} here…`} /></div></Fragment>)}</section>
    <div className="compare-height-resizer" role="separator" aria-orientation="horizontal" aria-label="Resize source and difference panels" onPointerDown={beginHeightResize} />
    <div className="compare-summary"><strong>{differences === 0 && (sources[0].text || sources[1].text) ? 'Configurations match' : `${differences} differing row${differences === 1 ? '' : 's'}`}</strong><span>{rows.length} rows compared · Smart filters never reorder configuration lines</span></div>
    <section className="compare-diff"><div className="compare-diff-head"><span>{sources[0].name}</span><span>{sources[1].name}</span></div>{rows.map((row, index) => <div className={`compare-row ${row.kind}`} key={`${index}-${row.left}-${row.right}`}><code><i>{row.left !== undefined ? index + 1 : ''}</i>{row.left ?? ''}</code><code><i>{row.right !== undefined ? index + 1 : ''}</i>{row.right ?? ''}</code></div>)}</section>
  </div>;
}
