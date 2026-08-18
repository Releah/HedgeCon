import { FormEvent, useEffect, useState } from 'react';
import type { DeviceIdentity, Session, SshTunnel } from './types';

export default function SshToolsPanel({ connectionId, session, onDetect, onClose }: { connectionId: string; session: Session; onDetect: () => Promise<DeviceIdentity>; onClose: () => void }) {
  const identity = session.detectedIdentity;
  const [tunnels, setTunnels] = useState<SshTunnel[]>([]);
  const [type, setType] = useState<'local' | 'socks'>('local');
  const [localPort, setLocalPort] = useState(0);
  const [targetHost, setTargetHost] = useState(session.host);
  const [targetPort, setTargetPort] = useState(443);
  const [message, setMessage] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [testingTunnelId, setTestingTunnelId] = useState<string>();
  const refresh = () => window.hedge.listTunnels(connectionId).then(setTunnels).catch(() => setTunnels([]));
  useEffect(() => { void refresh(); const timer = window.setInterval(refresh, 2000); return () => window.clearInterval(timer); }, [connectionId]);

  const testTunnel = async (tunnel: SshTunnel) => {
    setMessage(''); setTestingTunnelId(tunnel.id);
    try { const result = await window.hedge.testSocksTunnel(tunnel.id, targetHost.trim(), targetPort); setMessage(`Verified: ${targetHost}:${targetPort} is reachable through 127.0.0.1:${tunnel.localPort} (${result.latencyMs} ms).`); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setTestingTunnelId(undefined); }
  };
  const start = async (event: FormEvent) => {
    event.preventDefault(); setMessage('');
    try {
      const tunnel = await window.hedge.startTunnel(connectionId, { type, localPort, ...(type === 'local' ? { targetHost, targetPort } : {}) });
      setTunnels(current => [...current, tunnel]);
      if (type === 'socks') await testTunnel(tunnel);
      else setMessage(`Local tunnel listening on 127.0.0.1:${tunnel.localPort}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
  };

  return <aside className="ssh-tools-panel"><header><div><small>SSH CONNECTION</small><h3>Device & tunnels</h3></div><button className="icon-button" onClick={onClose} aria-label="Close SSH tools">×</button></header>
    <section className="remembered-device"><small>REMEMBERED DEVICE</small><strong>{identity?.product || 'Unknown device'}</strong><span>{[identity?.hostname, identity?.vendor, identity?.version].filter(Boolean).join(' · ') || 'No confirmed profile has been saved.'}</span><em>{identity?.platform || 'unspecified'}</em><button className="secondary detect-device-button" disabled={!connectionId || detecting} onClick={async () => { setDetecting(true); setMessage('Running bounded read-only device detection…'); try { const result = await onDetect(); setMessage(result.platform === 'unspecified' ? 'HedgeCon could not identify this device from the available output.' : 'Detection complete. Review the device details to continue.'); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setDetecting(false); } }}>{detecting ? 'Detecting…' : identity ? 'Refresh profile' : 'Detect device'}</button><small className="detect-device-hint">Runs read-only commands. On restricted devices they may appear in the terminal.</small></section>
    <section><div className="ssh-tools-heading"><div><strong>Active tunnels</strong><small>Available only on this computer.</small></div></div>{tunnels.map(tunnel => <div className="tunnel-row" key={tunnel.id}><div><strong>127.0.0.1:{tunnel.localPort}</strong><small>{tunnel.type === 'socks' ? 'SOCKS5 proxy' : `→ ${tunnel.targetHost}:${tunnel.targetPort}`} · {tunnel.connections} active</small></div><div className="tunnel-actions">{tunnel.type === 'socks' && <button type="button" disabled={testingTunnelId === tunnel.id} onClick={() => void testTunnel(tunnel)}>{testingTunnelId === tunnel.id ? 'Testing…' : 'Test'}</button>}<button className="danger-button" onClick={async () => { await window.hedge.stopTunnel(tunnel.id); void refresh(); }}>Stop</button></div></div>)}{!tunnels.length && <p className="hint">No tunnels are running through this SSH connection.</p>}</section>
    <form onSubmit={start}><div className="tunnel-type"><button type="button" className={type === 'local' ? 'active' : ''} onClick={() => setType('local')}>Local forward</button><button type="button" className={type === 'socks' ? 'active' : ''} onClick={() => { setType('socks'); if (localPort === 0) setLocalPort(1080); }}>SOCKS5 proxy</button></div><label>Local port<input type="number" min="0" max="65535" value={localPort} onChange={event => setLocalPort(Number(event.target.value))} /><small>{type === 'socks' ? 'Defaults to the standard SOCKS port, but you can choose another fixed port.' : 'Use 0 to select an available port automatically.'}</small></label><div className="tunnel-target"><label>{type === 'socks' ? 'Test destination' : 'Destination host'}<input required value={targetHost} onChange={event => setTargetHost(event.target.value)} /></label><label>Port<input required type="number" min="1" max="65535" value={targetPort} onChange={event => setTargetPort(Number(event.target.value))} /></label></div>{type === 'socks' && <small className="field-note">The destination is used only to verify the proxy. The running SOCKS5 tunnel can carry other SSH sessions too.</small>}<button className="primary" disabled={!connectionId}>Start {type === 'socks' ? 'and verify' : 'tunnel'}</button></form>{message && <div className="ssh-tools-message" role="status"><span>{message}</span><button type="button" onClick={() => setMessage('')} aria-label="Dismiss message">×</button></div>}
  </aside>;
}
