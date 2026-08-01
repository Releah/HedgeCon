import { useEffect, useMemo, useRef, useState } from 'react';
import type { PingSample } from './types';

const LIVE_SAMPLES = 120;
const MAX_RECORDED_SAMPLES = 18_000;
const MAX_DRAWN_SAMPLES = 1_200;
const DEFAULT_HEIGHT = 176;
const ranges = [
  { id: 'max', label: 'Max', milliseconds: null },
  { id: '4h', label: '4h', milliseconds: 4 * 60 * 60 * 1000 },
  { id: '1h', label: '1h', milliseconds: 60 * 60 * 1000 },
  { id: '30m', label: '30m', milliseconds: 30 * 60 * 1000 },
  { id: '5m', label: '5m', milliseconds: 5 * 60 * 1000 },
  { id: 'live', label: 'Live', milliseconds: 0 },
] as const;
type RangeId = typeof ranges[number]['id'];

const duration = (milliseconds: number) => milliseconds < 60000 ? `${Math.max(1, Math.round(milliseconds / 1000))}s` : `${Math.floor(milliseconds / 60000)}m ${Math.round((milliseconds % 60000) / 1000)}s`;

export default function PingMonitor({ host, port, onClose }: { host: string; port: number; onClose: () => void }) {
  const monitorId = useRef(crypto.randomUUID());
  const [mode, setMode] = useState<'ping' | 'tcp'>('ping');
  const [range, setRange] = useState<RangeId>('live');
  const [samples, setSamples] = useState<PingSample[]>([]);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const outageStartRef = useRef<number | null>(null);
  const [downSince, setDownSince] = useState<number | null>(null);
  const [lastOutage, setLastOutage] = useState<number | null>(null);

  useEffect(() => {
    setSamples([]); outageStartRef.current = null; setDownSince(null); setLastOutage(null);
    const remove = window.hedge.onPingSample(sample => {
      if (sample.monitorId !== monitorId.current) return;
      setSamples(current => [...current, sample].slice(-MAX_RECORDED_SAMPLES));
      if (!sample.reachable && outageStartRef.current === null) { outageStartRef.current = sample.timestamp; setDownSince(sample.timestamp); }
      else if (sample.reachable && outageStartRef.current !== null) { setLastOutage(sample.timestamp - outageStartRef.current); outageStartRef.current = null; setDownSince(null); }
    });
    if (mode === 'ping') void window.hedge.startPing(host, monitorId.current); else void window.hedge.startTcpMonitor(host, port, monitorId.current);
    return () => { remove(); window.hedge.stopPing(monitorId.current); };
  }, [host, port, mode]);

  const visibleSamples = useMemo(() => {
    if (range === 'live') return samples.slice(-LIVE_SAMPLES);
    const selected = ranges.find(option => option.id === range);
    if (!selected?.milliseconds) return samples;
    const cutoff = (samples.at(-1)?.timestamp ?? Date.now()) - selected.milliseconds;
    return samples.filter(sample => sample.timestamp >= cutoff);
  }, [range, samples]);
  const drawnSamples = useMemo(() => {
    if (visibleSamples.length <= MAX_DRAWN_SAMPLES) return visibleSamples;
    const stride = Math.ceil(visibleSamples.length / MAX_DRAWN_SAMPLES);
    const reduced = visibleSamples.filter((_sample, index) => index % stride === 0);
    const latest = visibleSamples.at(-1);
    if (latest && reduced.at(-1) !== latest) reduced.push(latest);
    return reduced;
  }, [visibleSamples]);
  const metrics = useMemo(() => {
    const latest = samples.at(-1); const reachable = latest?.reachable ?? null;
    const values = visibleSamples.flatMap(sample => sample.latencyMs === null ? [] : [sample.latencyMs]);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    return { reachable, downSince, lastOutage, average, max: Math.max(100, ...values) };
  }, [samples, visibleSamples, downSince, lastOutage]);
  const path = drawnSamples.map((sample, index) => {
    if (sample.latencyMs === null) return '';
    const x = drawnSamples.length < 2 ? 0 : index / (drawnSamples.length - 1) * 600;
    const y = 88 - Math.min(sample.latencyMs / metrics.max, 1) * 76;
    const previousReachable = index > 0 && drawnSamples[index - 1].latencyMs !== null;
    return `${previousReachable ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const latest = samples.at(-1);

  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY; const startHeight = height;
    const panel = event.currentTarget.parentElement; const parentHeight = panel?.parentElement?.clientHeight ?? 600;
    const maximum = Math.max(DEFAULT_HEIGHT, Math.floor(parentHeight * .7));
    document.body.classList.add('resizing-monitor');
    const move = (pointer: PointerEvent) => setHeight(Math.max(125, Math.min(maximum, startHeight + startY - pointer.clientY)));
    const finish = () => { document.body.classList.remove('resizing-monitor'); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish); window.removeEventListener('pointercancel', finish); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish); window.addEventListener('pointercancel', finish);
  };

  return <section className="ping-monitor" style={{ flexBasis: height }}>
    <div className="ping-monitor-divider" onPointerDown={beginResize} title="Drag to resize monitor" />
    <header>
      <div className="monitor-mode"><button className={mode === 'ping' ? 'active' : ''} onClick={() => setMode('ping')}>Ping</button><button className={mode === 'tcp' ? 'active' : ''} onClick={() => setMode('tcp')}>TCP :{port}</button></div>
      <div className={`ping-state ${metrics.reachable === false ? 'offline' : metrics.reachable === true ? 'online' : ''}`}><span />{metrics.reachable === null ? `Starting ${mode === 'ping' ? 'ping' : 'TCP'}…` : metrics.reachable ? 'Online' : `Unresponsive for ${duration(Date.now() - (metrics.downSince ?? Date.now()))}`}</div>
      <div className="ping-stats"><span>Target <strong>{host}{mode === 'tcp' ? `:${port}` : ''}</strong></span><span>Now <strong>{latest?.latencyMs === null || latest?.latencyMs === undefined ? '—' : `${latest.latencyMs.toFixed(1)} ms`}</strong></span><span>Average <strong>{metrics.average === null ? '—' : `${metrics.average.toFixed(1)} ms`}</strong></span>{metrics.lastOutage !== null && <span>Last outage <strong>{duration(metrics.lastOutage)}</strong></span>}</div>
      <div className="monitor-range" aria-label="Monitor time range">{ranges.map(option => <button key={option.id} className={range === option.id ? 'active' : ''} onClick={() => setRange(option.id)} title={option.id === 'max' ? 'All samples recorded by this monitor' : option.id === 'live' ? `Latest ${LIVE_SAMPLES} samples` : `Last ${option.label}`}>{option.label}</button>)}</div>
      <button onClick={onClose} title="Close monitor">×</button>
    </header>
    <div className="ping-chart"><svg viewBox="0 0 600 100" preserveAspectRatio="none" aria-label={`${mode === 'ping' ? 'Ping' : 'TCP'} response graph`}><line x1="0" y1="88" x2="600" y2="88" /><line x1="0" y1="50" x2="600" y2="50" />{drawnSamples.map((sample, index) => sample.reachable ? null : <rect key={`${sample.timestamp}-${index}`} className="ping-outage" x={Math.max(0, index / Math.max(drawnSamples.length - 1, 1) * 600 - 3)} y="6" width="7" height="82" />)}<path d={path} /></svg>{visibleSamples.some(sample => !sample.reachable) && <div className="outage-label">Red bands indicate no response</div>}</div>
  </section>;
}
