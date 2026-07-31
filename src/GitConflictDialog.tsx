import { useEffect, useState } from 'react';
import type { GitConflict } from './types';

type Props = {
  conflicts: GitConflict[];
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onResolve: (resolutions: Array<{ path: string; contents: string }>) => void;
};

export default function GitConflictDialog({ conflicts, busy, error, onCancel, onResolve }: Props) {
  const [active, setActive] = useState(0);
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [resolved, setResolved] = useState<Set<string>>(() => new Set());
  useEffect(() => { setResolutions(Object.fromEntries(conflicts.map(conflict => [conflict.path, conflict.merged]))); setResolved(new Set()); setActive(0); }, [conflicts]);
  const conflict = conflicts[active];
  if (!conflict) return null;
  const setCurrent = (contents: string, markResolved = true) => { setResolutions(current => ({ ...current, [conflict.path]: contents })); if (markResolved) setResolved(current => new Set(current).add(conflict.path)); };
  return <div className="overlay git-conflict-overlay"><section className="git-conflict-dialog"><header><div><small>COLLABORATION CONFLICT</small><h2>Review changes from the server</h2><p>Another person changed {conflicts.length === 1 ? 'this file' : `${conflicts.length} files`} after your last sync. Nothing has been pushed yet.</p></div><button className="icon-button" disabled={busy} onClick={onCancel}>×</button></header><div className="git-conflict-body"><nav>{conflicts.map((item, index) => <button key={item.path} className={index === active ? 'active' : ''} onClick={() => setActive(index)}><strong>{resolved.has(item.path) ? '✓ ' : ''}{item.path.split('/').pop()}</strong><small>{item.path}</small></button>)}</nav><main><div className="git-conflict-actions"><strong>{conflict.path}</strong><button className="secondary" onClick={() => setCurrent(conflict.ours)}>Keep my version</button><button className="secondary" onClick={() => setCurrent(conflict.theirs)}>Keep server version</button><button className="secondary" onClick={() => setCurrent(conflict.merged, false)}>Show both</button></div><textarea spellCheck={false} value={resolutions[conflict.path] ?? conflict.merged} onChange={event => setCurrent(event.target.value)} /><p>Edit the result above if needed. Conflict markers are provided so both versions remain visible until you decide.</p></main></div>{error && <p className="git-conflict-error">{error}</p>}<footer><button className="secondary" disabled={busy} onClick={onCancel}>Cancel without merging</button><button className="primary" disabled={busy || resolved.size !== conflicts.length} onClick={() => onResolve(conflicts.map(item => ({ path: item.path, contents: resolutions[item.path] ?? item.merged })))}>{busy ? 'Merging and pushing...' : resolved.size === conflicts.length ? 'Merge resolved files & push' : `Resolve all files (${resolved.size}/${conflicts.length})`}</button></footer></section></div>;
}
