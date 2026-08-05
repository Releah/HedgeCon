import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { CommandMacro, Folder, MacroFolder, Session } from './types';

const variables = (template: string) => [...new Set([...template.matchAll(/{{\s*([a-zA-Z_][\w.-]*)\s*}}/g)].map(match => match[1]))];
const sessionVariables = (session: Session): Record<string, string> => ({
  username: session.username,
  'credential.username': session.username,
  host: session.host,
  'session.host': session.host,
  session_name: session.name,
  'session.name': session.name,
  port: String(session.port),
  ssh_port: String(session.port),
  ...(session.privateKeyPath ? { private_key_path: session.privateKeyPath, 'credential.private_key_path': session.privateKeyPath } : {}),
  ...(session.webUrl ? { web_url: session.webUrl } : {}),
  ...(session.rdpPort ? { rdp_port: String(session.rdpPort) } : {}),
  ...(session.vncPort ? { vnc_port: String(session.vncPort) } : {}),
});
const renderTemplate = (template: string, values: Record<string, string>) => template.replace(/{{\s*([a-zA-Z_][\w.-]*)\s*}}/g, (_match, name: string) => values[name] ?? '');
const ancestorIds = (folderId: string | null, folders: Folder[]) => { const ids = new Set<string>(); let current = folderId; while (current && !ids.has(current)) { ids.add(current); current = folders.find(folder => folder.id === current)?.parentId || null; } return ids; };
const macroChildren = (folders: MacroFolder[], parentId: string | null) => folders.filter(folder => (folder.parentId ?? null) === parentId);

export default function MacroBoard({ session, macros, macroFolders, folders, onPaste, onClose, onManage }: { session: Session; macros: CommandMacro[]; macroFolders: MacroFolder[]; folders: Folder[]; onPaste: (command: string, runImmediately: boolean) => void; onClose: () => void; onManage: () => void }) {
  const [query, setQuery] = useState(''); const [running, setRunning] = useState<CommandMacro | null>(null);
  const storageKey = `hedgecon-macro-board-collapsed:${session.folderId || 'unfiled'}`;
  const [collapsed, setCollapsed] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch { return new Set(); } });
  useEffect(() => localStorage.setItem(storageKey, JSON.stringify([...collapsed])), [storageKey, collapsed]);
  const ancestors = useMemo(() => ancestorIds(session.folderId, folders), [session.folderId, folders]);
  const builtIns = useMemo(() => sessionVariables(session), [session]);
  const favourites = useMemo(() => macros.filter(macro => { const mode = macro.targetMode ?? (macro.folderIds.length ? 'folders' : macro.platforms.length ? 'platforms' : 'folders'); if (mode === 'folders') return macro.allFolders === true || (!macro.folderIds.length && macro.allFolders !== false) || macro.folderIds.some(id => ancestors.has(id)); const platform = session.platform || session.detectedIdentity?.platform || 'unspecified'; return platform !== 'unspecified' && (macro.allPlatforms === true || macro.platforms.includes(platform)); }), [macros, ancestors, session.platform, session.detectedIdentity]);
  const visible = useMemo(() => (query ? macros : favourites).filter(macro => `${macro.name} ${macro.description || ''} ${macro.command}`.toLowerCase().includes(query.trim().toLowerCase())), [macros, favourites, query]);
  const choose = (macro: CommandMacro) => variables(macro.command).some(name => builtIns[name] === undefined) ? setRunning(macro) : onPaste(renderTemplate(macro.command, builtIns), Boolean(macro.runImmediately));
  const macroButton = (macro: CommandMacro) => <button className="macro-command-row" key={macro.id} onClick={() => choose(macro)}><span>›_</span><div><strong>{macro.name}{macro.runImmediately ? ' ↵' : ''}</strong><small>{macro.description || macro.command}</small></div></button>;
  const folderHasContent = (folderId: string, seen = new Set<string>()): boolean => { if (seen.has(folderId)) return false; if (visible.some(macro => macro.macroFolderId === folderId)) return true; return macroChildren(macroFolders, folderId).some(folder => folderHasContent(folder.id, new Set(seen).add(folderId))); };
  const renderFolders = (parentId: string | null = null, depth = 0, seen = new Set<string>()): JSX.Element[] => macroChildren(macroFolders, parentId).flatMap(folder => { if (seen.has(folder.id) || !folderHasContent(folder.id)) return []; const open = query ? true : !collapsed.has(folder.id); const childFolders = renderFolders(folder.id, depth + 1, new Set(seen).add(folder.id)); const childMacros = visible.filter(macro => macro.macroFolderId === folder.id); return [<section className="macro-session-folder" key={folder.id}><button className="macro-session-folder-row" style={{ paddingLeft: `${7 + depth * 13}px` }} title={folder.name} onClick={() => setCollapsed(current => { const next = new Set(current); if (next.has(folder.id)) next.delete(folder.id); else next.add(folder.id); return next; })}><span>{open ? '▾' : '▸'}</span><strong>{folder.name}</strong></button>{open && <div>{childMacros.map(macroButton)}{childFolders}</div>}</section>]; });
  const unfiled = visible.filter(macro => !macro.macroFolderId || !macroFolders.some(folder => folder.id === macro.macroFolderId));
  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => { event.preventDefault(); const root = event.currentTarget.closest<HTMLElement>('.macro-panel-root'); if (!root) return; const startX = event.clientX; const startWidth = root.getBoundingClientRect().width; const move = (pointer: PointerEvent) => { const width = Math.max(220, Math.min(520, startWidth - (pointer.clientX - startX))); root.style.width = `${width}px`; root.style.flexBasis = `${width}px`; }; const finish = () => { localStorage.setItem('hedgecon-macro-panel-width', String(Math.round(root.getBoundingClientRect().width))); window.removeEventListener('pointermove', move); document.body.classList.remove('resizing-macros'); }; document.body.classList.add('resizing-macros'); window.addEventListener('pointermove', move); window.addEventListener('pointerup', finish, { once: true }); };
  return <aside className="macro-panel"><div className="macro-panel-divider" onPointerDown={beginResize} /><header><div><small>MACROS</small><strong>{session.name}</strong></div><div><button onClick={onManage}>⚙</button><button onClick={onClose}>×</button></div></header><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search macros..." /><div className="macro-panel-label">{query ? 'RESULTS' : 'FAVOURITES'}</div><div className="macro-session-tree">{unfiled.map(macroButton)}{renderFolders()}{!visible.length && <p>{query ? 'No matching macros.' : 'No favourites for this session. Search all macros or manage the library.'}</p>}</div>{running && <MacroRunDialog macro={running} builtIns={builtIns} onCancel={() => setRunning(null)} onRun={command => { onPaste(command, Boolean(running.runImmediately)); setRunning(null); }} />}</aside>;
}

function MacroRunDialog({ macro, builtIns, onCancel, onRun }: { macro: CommandMacro; builtIns: Record<string, string>; onCancel: () => void; onRun: (command: string) => void }) {
  const names = variables(macro.command).filter(name => builtIns[name] === undefined); const [values, setValues] = useState<Record<string, string>>({});
  const resolved = { ...builtIns, ...values };
  const submit = (event: FormEvent) => { event.preventDefault(); onRun(renderTemplate(macro.command, resolved)); };
  return <div className="overlay"><form className="dialog macro-run-dialog" onSubmit={submit}><div className="dialog-title"><div><small>MACRO VARIABLES</small><h2>{macro.name}</h2></div><button type="button" className="icon-button" onClick={onCancel}>×</button></div>{names.map((name, index) => <label key={name}>{name.replaceAll('_', ' ')}<input autoFocus={index === 0} required value={values[name] || ''} onChange={event => setValues({ ...values, [name]: event.target.value })} /></label>)}<div className="macro-preview"><small>PREVIEW</small><code>{macro.command.replace(/{{\s*([a-zA-Z_][\w.-]*)\s*}}/g, (_match, name: string) => resolved[name] || `{{ ${name} }}`)}</code></div><div className="actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary">{macro.runImmediately ? 'Run command' : 'Paste command'}</button></div></form></div>;
}
