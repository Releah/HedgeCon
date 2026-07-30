import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hedge', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data: unknown) => ipcRenderer.invoke('data:save', data),
  configureInventory: (input: unknown) => ipcRenderer.invoke('inventory:configure', input),
  readGitInventory: () => ipcRenderer.invoke('inventory:git-read'),
  writeGitInventory: (source: string) => ipcRenderer.invoke('inventory:git-write', source),
  resetLocalData: () => ipcRenderer.invoke('app:reset-local-data'),
  readClipboardText: () => ipcRenderer.invoke('clipboard:read-text'),
  writeClipboardText: (value: string) => ipcRenderer.invoke('clipboard:write-text', value),
  getRepository: () => ipcRenderer.invoke('repo:get'),
  getRepositoryStatus: () => ipcRenderer.invoke('repo:status'),
  getRepositoryFreshness: () => ipcRenderer.invoke('repo:freshness'),
  openLocalRepository: (input: unknown) => ipcRenderer.invoke('repo:open-local', input),
  cloneRepository: (input: unknown) => ipcRenderer.invoke('repo:clone', input),
  updateRepository: (input: unknown) => ipcRenderer.invoke('repo:update', input),
  commitRepository: (message: string) => ipcRenderer.invoke('repo:commit', message),
  pullRepository: () => ipcRenderer.invoke('repo:pull'),
  pushRepository: () => ipcRenderer.invoke('repo:push'),
  listWikiPages: () => ipcRenderer.invoke('wiki:list'),
  readWikiPage: (path: string) => ipcRenderer.invoke('wiki:read', path),
  writeWikiPage: (path: string, contents: string) => ipcRenderer.invoke('wiki:write', path, contents),
  createWikiPage: (section: string, name: string) => ipcRenderer.invoke('wiki:create', section, name),
  ensureSessionWikiPage: (sessionId: string, sessionName: string, host: string) => ipcRenderer.invoke('wiki:session-page', sessionId, sessionName, host),
  choosePrivateKey: () => ipcRenderer.invoke('key:choose'),
  listSshKeys: () => ipcRenderer.invoke('keys:list'),
  generateSshKey: (input: unknown) => ipcRenderer.invoke('keys:generate', input),
  importSshKey: () => ipcRenderer.invoke('keys:import'),
  copyPublicKey: (privateKeyPath: string) => ipcRenderer.invoke('keys:copy-public', privateKeyPath),
  deleteSshKey: (privateKeyPath: string) => ipcRenderer.invoke('keys:delete', privateKeyPath),
  installPublicKey: (connectionId: string, privateKeyPath: string) => ipcRenderer.invoke('keys:install', connectionId, privateKeyPath),
  removePublicKey: (connectionId: string, privateKeyPath: string) => ipcRenderer.invoke('keys:remove', connectionId, privateKeyPath),
  getInstalledPublicKeys: (connectionId: string) => ipcRenderer.invoke('keys:remote-list', connectionId),
  connect: (request: unknown) => ipcRenderer.invoke('ssh:connect', request),
  write: (id: string, data: string) => ipcRenderer.send('ssh:write', id, data),
  resize: (id: string, cols: number, rows: number) => ipcRenderer.send('ssh:resize', id, cols, rows),
  disconnect: (id: string) => ipcRenderer.send('ssh:disconnect', id),
  trustHost: (id: string, accept: boolean) => ipcRenderer.send('ssh:trust', id, accept),
  clearKnownHost: (host: string, port: number) => ipcRenderer.invoke('host-key:clear', host, port),
  clearAllKnownHosts: () => ipcRenderer.invoke('host-key:clear-all'),
  listCredentialSets: () => ipcRenderer.invoke('credentials:list'),
  saveCredentialSet: (input: unknown) => ipcRenderer.invoke('credentials:save', input),
  deleteCredentialSet: (id: string) => ipcRenderer.invoke('credentials:delete', id),
  onSshEvent: (callback: (event: unknown) => void) => {
    const listener = (_: unknown, event: unknown) => callback(event);
    ipcRenderer.on('ssh:event', listener); return () => ipcRenderer.removeListener('ssh:event', listener);
  },
  onHostKey: (callback: (event: unknown) => void) => {
    const listener = (_: unknown, event: unknown) => callback(event);
    ipcRenderer.on('ssh:host-key', listener); return () => ipcRenderer.removeListener('ssh:host-key', listener);
  },
  startPing: (host: string, monitorId: string) => ipcRenderer.invoke('ping:start', host, monitorId),
  stopPing: (id: string) => ipcRenderer.send('ping:stop', id),
  onPingSample: (callback: (sample: unknown) => void) => {
    const listener = (_: unknown, sample: unknown) => callback(sample);
    ipcRenderer.on('ping:sample', listener); return () => ipcRenderer.removeListener('ping:sample', listener);
  },
  listRemoteFiles: (id: string, path: string) => ipcRenderer.invoke('sftp:list', id, path),
  uploadRemoteFile: (id: string, remoteDirectory: string) => ipcRenderer.invoke('sftp:upload', id, remoteDirectory),
  downloadRemoteFile: (id: string, remotePath: string) => ipcRenderer.invoke('sftp:download', id, remotePath),
  uploadScpFile: (id: string, remoteDirectory: string) => ipcRenderer.invoke('scp:upload', id, remoteDirectory),
  downloadScpFile: (id: string, remotePath: string) => ipcRenderer.invoke('scp:download', id, remotePath)
});
