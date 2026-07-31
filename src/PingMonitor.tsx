import { useEffect, useMemo, useRef, useState } from 'react';
import type { PingSample } from './types';

const MAX_SAMPLES = 120;
const duration = (milliseconds: number) => milliseconds < 60000 ? `${Math.max(1, Math.round(milliseconds / 1000))}s` : `${Math.floor(milliseconds / 60000)}m ${Math.round((milliseconds % 60000) / 1000)}s`;

export default function PingMonitor({ host, port, onClose }: { host: string; port: number; onClose: () => void }) {
  const monitorId = useRef(crypto.randomUUID()); const [mode, setMode] = useState<'ping' | 'tcp'>('ping'); const [samples, setSamples] = useState<PingSample[]>([]);
  const outageStartRef = useRef<number | null>(null); const [downSince, setDownSince] = useState<number | null>(null); const [lastOutage, setLastOutage] = useState<number | null>(null);
  useEffect(() => {
    setSamples([]); outageStartRef.current = null; setDownSince(null); setLastOutage(null);
    const remove = window.hedge.onPingSample(sample => { if (sample.monitorId !== monitorId.current) return; setSamples(current => [...current, sample].slice(-MAX_SAMPLES)); if (!sample.reachable && outageStartRef.current === null) { outageStartRef.current = sample.timestamp; setDownSince(sample.timestamp); } else if (sample.reachable && outageStartRef.current !== null) { setLastOutage(sample.timestamp - outageStartRef.current); outageStartRef.current = null; setDownSince(null); } });
    if (mode === 'ping') void window.hedge.startPing(host, monitorId.current); else void window.hedge.startTcpMonitor(host, port, monitorId.current);
    return () => { remove(); window.hedge.stopPing(monitorId.current); };
  }, [host, port, mode]);
  const metrics = useMemo(() => {
    const latest = samples.at(-1); const reachable = latest?.reachable ?? null;
    const values = samples.flatMap(sample => sample.latencyMs === null ? [] : [sample.latencyMs]); const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; const max = Math.max(100, ...values);
    return { reachable, downSince, lastOutage, average, max };
  }, [samples, downSince, lastOutage]);
  const path = samples.map((sample, index) => { if (sample.latencyMs === null) return ''; const x = samples.length < 2 ? 0 : index / (samples.length - 1) * 600; const y = 88 - Math.min(sample.latencyMs / metrics.max, 1) * 76; const previousReachable = index > 0 && samples[index - 1].latencyMs !== null; return `${previousReachable ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ');
  const latest = samples.at(-1);
  return <section className="ping-monitor"><header><div className="monitor-mode"><button className={mode === 'ping' ? 'active' : ''} onClick={() => setMode('ping')}>Ping</button><button className={mode === 'tcp' ? 'active' : ''} onClick={() => setMode('tcp')}>TCP :{port}</button></div><div className={`ping-state ${metrics.reachable === false ? 'offline' : metrics.reachable === true ? 'online' : ''}`}><span />{metrics.reachable === null ? `Starting ${mode === 'ping' ? 'ping' : 'TCP'}…` : metrics.reachable ? 'Online' : `Unresponsive for ${duration(Date.now() - (metrics.downSince ?? Date.now()))}`}</div><div className="ping-stats"><span>Target <strong>{host}{mode === 'tcp' ? `:${port}` : ''}</strong></span><span>Now <strong>{latest?.latencyMs === null || latest?.latencyMs === undefined ? '—' : `${latest.latencyMs.toFixed(1)} ms`}</strong></span><span>Average <strong>{metrics.average === null ? '—' : `${metrics.average.toFixed(1)} ms`}</strong></span>{metrics.lastOutage !== null && <span>Last outage <strong>{duration(metrics.lastOutage)}</strong></span>}</div><button onClick={onClose} title="Close monitor">×</button></header><div className="ping-chart"><svg viewBox="0 0 600 100" preserveAspectRatio="none" aria-label={`${mode === 'ping' ? 'Ping' : 'TCP'} response graph`}><line x1="0" y1="88" x2="600" y2="88" /><line x1="0" y1="50" x2="600" y2="50" />{samples.map((sample, index) => sample.reachable ? null : <rect key={sample.timestamp} className="ping-outage" x={Math.max(0, index / Math.max(samples.length - 1, 1) * 600 - 3)} y="6" width="7" height="82" />)}<path d={path} /></svg>{samples.some(sample => !sample.reachable) && <div className="outage-label">Red bands indicate no response</div>}</div></section>;
}
