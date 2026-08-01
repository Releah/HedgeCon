import { FormEvent, useMemo, useState } from 'react';
import type { CommandMacro, Folder, Session } from './types';

const variables = (template: string) => [...new Set([...template.matchAll(/{{\s*([a-zA-Z_][\w.-]*)\s*}}/g)].map(match => match[1]))];
const ancestorIds = (folderId: string | null, folders: Folder[]) => { const ids = new Set<string>(); let current = folderId; while (current && !ids.has(current)) { ids.add(current); current = folders.find(folder => folder.id === current)?.parentId || null; } return ids; };

export default function MacroBoard({ session, macros, folders, onPaste, onClose, onManage }: { session: Session; macros: CommandMacro[]; folders: Folder[]; onPaste: (command: string) => void; onClose: () => void; onManage: () => void }) {
  const [query, setQuery] = useState(''); const [running, setRunning] = useState<CommandMacro | null>(null);
  const ancestors = useMemo(() => ancestorIds(session.folderId, folders), [session.folderId, folders]);
  const favourites = useMemo(() => macros.filter(macro => macro.folderIds.some(id => ancestors.has(id)) || macro.platforms.includes(session.platform || 'unspecified')), [macros, ancestors, session.platform]);
  const results = useMemo(() => macros.filter(macro => `${macro.name} ${macro.description || ''} ${macro.command}`.toLowerCase().includes(query.trim().toLowerCase())), [macros, query]);
  const shown = query ? results : favourites;
  const choose = (macro: CommandMacro) => variables(macro.command).length ? setRunning(macro) : onPaste(macro.command);
  return <aside className="macro-panel"><header><div><small>COMMANDS</small><strong>{session.name}</strong></div><div><button onClick={onManage} title="Manage macros">⚙</button><button onClick={onClose} title="Close macros">×</button></div></header><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search macros..." /><div className="macro-panel-label">{query ? 'RESULTS' : 'FAVOURITES'}</div><div className="macro-panel-grid">{shown.map(macro => <button key={macro.id} onClick={() => choose(macro)}><strong>{macro.name}</strong><small>{macro.description || macro.command}</small></button>)}{!shown.length && <p>{query ? 'No matching macros.' : 'No favourites for this session. Search all macros above or manage the library.'}</p>}</div>{running && <MacroRunDialog macro={running} onCancel={() => setRunning(null)} onRun={command => { onPaste(command); setRunning(null); }} />}</aside>;
}

function MacroRunDialog({ macro, onCancel, onRun }: { macro: CommandMacro; onCancel: () => void; onRun: (command: string) => void }) {
  const names = variables(macro.command); const [values, setValues] = useState<Record<string, string>>({});
  const submit = (event: FormEvent) => { event.preventDefault(); const rendered = macro.command.replace(/{{\s*([a-zA-Z_][\w.-]*)\s*}}/g, (_match, name: string) => values[name] || ''); onRun(rendered); };
  return <div className="overlay"><form className="dialog macro-run-dialog" onSubmit={submit}><div className="dialog-title"><div><small>MACRO VARIABLES</small><h2>{macro.name}</h2></div><button type="button" className="icon-button" onClick={onCancel}>×</button></div><p className="hint">Enter the values to insert into this command.</p>{names.map((name, index) => <label key={name}>{name.replaceAll('_', ' ')}<input autoFocus={index === 0} required value={values[name] || ''} onChange={event => setValues({ ...values, [name]: event.target.value })} /></label>)}<div className="macro-preview"><small>PREVIEW</small><code>{macro.command.replace(/{{\s*([a-zA-Z_][\w.-]*)\s*}}/g, (_match, name: string) => values[name] || `{{ ${name} }}`)}</code></div><div className="actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button className="primary">Paste command</button></div></form></div>;
}
