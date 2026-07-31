import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, safeStorage, session as electronSession, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { ChildProcess, execFile } from 'node:child_process';
import { isIP, Socket } from 'node:net';
import { Client, ClientChannel, SFTPWrapper } from 'ssh2';
import git from 'isomorphic-git';
import gitHttp from 'isomorphic-git/http/node';
import { autoUpdater, type ProgressInfo, type UpdateInfo } from 'electron-updater';

type StoredCredential = { id: string; name: string; username: string; authMethod: 'password' | 'privateKey'; privateKeyPath?: string; encryptedSecret?: string };
type GitRepository = { localPath: string; remoteUrl?: string; branch: string; authorName: string; authorEmail: string; username?: string; encryptedToken?: string };
type InventorySettings = { configured: boolean; mode: 'local' | 'git'; repositoryPath?: string };
type UpdateSettings = { automaticChecks: boolean; branch: 'main' | 'experimental' };
type StoredData = { folders: unknown[]; sessions: unknown[]; uiSettings?: unknown; credentialProfileMappings: Record<string, string>; knownHosts: Record<string, string>; credentialSets: StoredCredential[]; repository?: GitRepository; inventorySettings: InventorySettings; updateSettings: UpdateSettings };
type UpdateStatus = { status: 'unsupported' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'current' | 'error'; currentVersion: string; availableVersion?: string; progress?: number; releaseNotes?: string; message?: string; portable: boolean; activeConnections: number };
type SecureStorageStatus = { available: boolean; secure: boolean; backend: string; message: string };
type SshKeyInfo = { name: string; privateKeyPath: string; publicKey?: string; fingerprint?: string; source: 'managed' | 'discovered' };
const defaults: StoredData = { folders: [], sessions: [], credentialProfileMappings: {}, knownHosts: {}, credentialSets: [], inventorySettings: { configured: false, mode: 'local' }, updateSettings: { automaticChecks: true, branch: 'main' } };
let stored: StoredData = defaults;
function dataPath() { return path.join(app.getPath('userData'), 'sessions.json'); }
function backupDataPath() { return `${dataPath()}.bak`; }
function parseStore(source: string) {
  const parsed = JSON.parse(source) as Partial<StoredData>;
  const next: StoredData = { folders: Array.isArray(parsed.folders) ? parsed.folders : [], sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [], credentialProfileMappings: parsed.credentialProfileMappings && typeof parsed.credentialProfileMappings === 'object' && !Array.isArray(parsed.credentialProfileMappings) ? parsed.credentialProfileMappings : {}, knownHosts: parsed.knownHosts && typeof parsed.knownHosts === 'object' && !Array.isArray(parsed.knownHosts) ? parsed.knownHosts : {}, credentialSets: Array.isArray(parsed.credentialSets) ? parsed.credentialSets : [], repository: parsed.repository && typeof parsed.repository === 'object' ? parsed.repository : undefined, inventorySettings: parsed.inventorySettings?.configured ? parsed.inventorySettings : { configured: false, mode: 'local' }, updateSettings: { automaticChecks: parsed.updateSettings?.automaticChecks !== false, branch: parsed.updateSettings?.branch === 'experimental' ? 'experimental' : 'main' } };
  next.uiSettings = parsed.uiSettings; return next;
}
function readStore() {
  try { stored = parseStore(fs.readFileSync(dataPath(), 'utf8')); }
  catch { try { stored = parseStore(fs.readFileSync(backupDataPath(), 'utf8')); writeStore(); } catch { stored = { ...defaults }; } }
}
function writeStore() { const target = dataPath(); const temporary = `${target}.tmp`; fs.mkdirSync(path.dirname(target), { recursive: true }); if (fs.existsSync(target)) fs.copyFileSync(target, backupDataPath()); fs.writeFileSync(temporary, JSON.stringify(stored, null, 2), { mode: 0o600 }); try { fs.renameSync(temporary, target); } catch { fs.rmSync(target, { force: true }); fs.renameSync(temporary, target); } }
const starterWiki: Record<string, string> = {
  'wiki/general/index.md': '# HedgeCon Wiki\n\nUse this area for shared operational notes, standards, links, and procedures.\n',
  'vendors/juniper/common-commands.md': '# Juniper Junos — Common Commands\n\n## System\n\n```text\nshow version\nshow system uptime\nshow chassis hardware\n```\n\n## Interfaces\n\n```text\nshow interfaces terse\nshow interfaces extensive <interface>\n```\n\n## Configuration\n\n```text\nshow configuration | display set\nshow | compare\ncommit check\n```\n',
  'vendors/cisco/common-commands.md': '# Cisco IOS/NX-OS — Common Commands\n\n## System\n\n```text\nshow version\nshow inventory\nshow logging\n```\n\n## Interfaces\n\n```text\nshow interfaces status\nshow interfaces counters errors\n```\n\n## Configuration\n\n```text\nshow running-config\nshow startup-config\n```\n',
  'vendors/linux/common-commands.md': '# Linux — Common Commands\n\n## System\n\n```bash\nuname -a\nuptime\nsystemctl --failed\n```\n\n## Networking\n\n```bash\nip address\nip route\nss -tulpn\n```\n',
  'configs/.gitkeep': ''
};
function repositoryMeta() { const repository = stored.repository; return repository ? { localPath: repository.localPath, remoteUrl: repository.remoteUrl, branch: repository.branch, authorName: repository.authorName, authorEmail: repository.authorEmail, username: repository.username, hasToken: Boolean(repository.encryptedToken) } : null; }
function getRepository() { const repository = stored.repository; if (!repository) throw new Error('No Git repository is configured.'); if (!fs.existsSync(path.join(repository.localPath, '.git'))) throw new Error('The configured Git repository is no longer available.'); return repository; }
function secureStorageStatus(): SecureStorageStatus {
  const available = safeStorage.isEncryptionAvailable();
  const backend = process.platform === 'linux' ? safeStorage.getSelectedStorageBackend() : process.platform === 'win32' ? 'dpapi' : process.platform === 'darwin' ? 'keychain' : 'unknown';
  const secure = available && backend !== 'basic_text' && backend !== 'unknown';
  const message = secure ? `Secrets are protected by ${backend}.` : backend === 'basic_text' ? 'Linux has no usable system keyring. HedgeCon will not save or decrypt passwords, passphrases, or access tokens while Electron is using its insecure basic_text fallback.' : 'Secure operating-system credential storage is unavailable. HedgeCon will not save or decrypt secrets.';
  return { available, secure, backend, message };
}
function requireSecureStorage(kind: string) { const status = secureStorageStatus(); if (!status.secure) throw new Error(`${kind} cannot be stored or used securely. ${status.message}`); }
function persistentWikiDefaultPath() { return path.join(app.getPath('documents'), 'HedgeCon Wiki'); }
function assertPersistentRepositoryLocation(directory: string) {
  const resolved = path.resolve(directory); const installRoot = path.resolve(path.dirname(process.execPath));
  const compare = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value;
  const candidate = compare(resolved); const installation = compare(installRoot);
  if (candidate === installation || candidate.startsWith(`${installation}${path.sep}`)) throw new Error(`The Wiki cannot be stored inside the HedgeCon installation folder because application updates replace that directory. Choose a persistent location such as ${persistentWikiDefaultPath()}.`);
  return resolved;
}
function gitAuth(repository: GitRepository) { if (!repository.encryptedToken) return undefined; requireSecureStorage('The saved Git token'); const token = safeStorage.decryptString(Buffer.from(repository.encryptedToken, 'base64')); return () => ({ username: repository.username || token, password: token }); }
function safeRepoPath(relativePath: string) { const repository = getRepository(); if (typeof relativePath !== 'string' || !relativePath || relativePath.length > 4096 || path.isAbsolute(relativePath) || relativePath.includes('\0')) throw new Error('Invalid repository path.'); const root = path.resolve(repository.localPath); const target = path.resolve(root, relativePath); const compare = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value; if (!compare(target).startsWith(`${compare(root)}${path.sep}`)) throw new Error('Repository path escapes the workspace.'); let cursor = root; for (const segment of path.relative(root, target).split(path.sep)) { cursor = path.join(cursor, segment); if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Symbolic links are not allowed in managed Wiki paths.'); } return target; }
function seedRepository(directory: string) { for (const [relativePath, contents] of Object.entries(starterWiki)) { const target = path.join(directory, ...relativePath.split('/')); if (fs.existsSync(target)) continue; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, contents, 'utf8'); } }
async function stageAll(repository: GitRepository) { const matrix = await git.statusMatrix({ fs, dir: repository.localPath }); for (const [filepath, , workdirStatus] of matrix) { if (workdirStatus === 0) await git.remove({ fs, dir: repository.localPath, filepath }); else await git.add({ fs, dir: repository.localPath, filepath }); } }
async function gitStatus() { const repository = getRepository(); const matrix = await git.statusMatrix({ fs, dir: repository.localPath }); let lastCommit: { oid: string; message: string; author: string; timestamp: number } | null = null; try { const [entry] = await git.log({ fs, dir: repository.localPath, depth: 1 }); if (entry) lastCommit = { oid: entry.oid, message: entry.commit.message.trim(), author: entry.commit.author.name, timestamp: entry.commit.author.timestamp }; } catch { /* Empty repositories have no log. */ } return { repository: repositoryMeta(), changedFiles: matrix.filter(([, head, workdir, stage]) => head !== workdir || workdir !== stage).map(([filepath, head, workdir, stage]) => ({ filepath, head, workdir, stage })), lastCommit }; }
async function commitRepository(repository: GitRepository, message: string) { await stageAll(repository); const matrix = await git.statusMatrix({ fs, dir: repository.localPath }); if (!matrix.some(([, head, workdir, stage]) => head !== workdir || workdir !== stage)) return null; return git.commit({ fs, dir: repository.localPath, message, author: { name: repository.authorName, email: repository.authorEmail } }); }
async function resolveRefIfPresent(repository: GitRepository, ref: string) { try { return await git.resolveRef({ fs, dir: repository.localPath, ref }); } catch { return undefined; } }
type PendingConflict = { path: string; base: string; ours: string; theirs: string; merged: string };
function conflictText(pathname: string, ours: string, theirs: string) { return `<<<<<<< My version (${pathname})\n${ours}${ours.endsWith('\n') ? '' : '\n'}=======\n${theirs}${theirs.endsWith('\n') ? '' : '\n'}>>>>>>> Server version\n`; }
async function fetchRepository(repository: GitRepository) { const localRef = `refs/heads/${repository.branch}`; const localBefore = await resolveRefIfPresent(repository, localRef); try { await git.fetch({ fs, http: gitHttp, dir: repository.localPath, remote: 'origin', ref: repository.branch, singleBranch: true, prune: true, onAuth: gitAuth(repository) }); } catch (error) { if (!localBefore || !/ref|branch|head|commit|not found/i.test(error instanceof Error ? error.message : String(error))) throw error; } return { local: await resolveRefIfPresent(repository, localRef), remote: await resolveRefIfPresent(repository, `refs/remotes/origin/${repository.branch}`) }; }
async function inspectMerge(repository: GitRepository) {
  const conflicts: PendingConflict[] = [];
  await git.merge({ fs, dir: repository.localPath, ours: repository.branch, theirs: `remotes/origin/${repository.branch}`, dryRun: true, author: { name: repository.authorName, email: repository.authorEmail }, mergeDriver: async ({ path: pathname, contents }) => { const [base = '', ours = '', theirs = ''] = contents; conflicts.push({ path: pathname, base, ours, theirs, merged: conflictText(pathname, ours, theirs) }); return { cleanMerge: true, mergedText: ours }; } });
  return conflicts;
}
async function mergeRemote(repository: GitRepository, resolutions?: Map<string, string>) {
  const report = await git.merge({ fs, dir: repository.localPath, ours: repository.branch, theirs: `remotes/origin/${repository.branch}`, author: { name: repository.authorName, email: repository.authorEmail }, message: `Merge origin/${repository.branch} into ${repository.branch}`, ...(resolutions ? { mergeDriver: async ({ path: pathname }: { path: string }) => { const contents = resolutions.get(pathname); if (contents === undefined) return { cleanMerge: false, mergedText: '' }; return { cleanMerge: true, mergedText: contents }; } } : {}) });
  // isomorphic-git updates the merge commit and index but does not refresh every
  // affected worktree file. The repository is verified clean before this operation,
  // so refresh it from the new merge commit to avoid leaving phantom local changes.
  await git.checkout({ fs, dir: repository.localPath, ref: repository.branch, force: true });
  return report;
}
async function guardedPush(repository: GitRepository) {
  const before = await fetchRepository(repository);
  if (!before.local || !before.remote || before.local === before.remote || await git.isDescendent({ fs, dir: repository.localPath, oid: before.local, ancestor: before.remote })) { await git.push({ fs, http: gitHttp, dir: repository.localPath, remote: 'origin', ref: repository.branch, onAuth: gitAuth(repository) }); return { outcome: 'pushed' as const, status: await gitStatus(), sync: 'none' as const }; }
  if (await git.isDescendent({ fs, dir: repository.localPath, oid: before.remote, ancestor: before.local })) { await mergeRemote(repository); await git.push({ fs, http: gitHttp, dir: repository.localPath, remote: 'origin', ref: repository.branch, onAuth: gitAuth(repository) }); return { outcome: 'pushed' as const, status: await gitStatus(), sync: 'fast-forward' as const }; }
  const conflicts = await inspectMerge(repository);
  if (conflicts.length) return { outcome: 'conflicts' as const, localOid: before.local, remoteOid: before.remote, conflicts };
  await mergeRemote(repository); await git.push({ fs, http: gitHttp, dir: repository.localPath, remote: 'origin', ref: repository.branch, onAuth: gitAuth(repository) }); return { outcome: 'pushed' as const, status: await gitStatus(), sync: 'merged' as const };
}
function validateRepositoryInput(input: any) {
  if (!input || typeof input.authorName !== 'string' || !input.authorName.trim() || input.authorName.length > 200 || typeof input.authorEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.authorEmail) || (input.remoteUrl && (typeof input.remoteUrl !== 'string' || input.remoteUrl.length > 2048 || !/^https:\/\//i.test(input.remoteUrl))) || (input.username && (typeof input.username !== 'string' || input.username.length > 255)) || (input.token && (typeof input.token !== 'string' || input.token.length > 16_384))) throw new Error('Enter a valid author name, email address, and HTTPS repository URL.');
}
function storeRepository(input: any, localPath: string, branch: string) {
  validateRepositoryInput(input);
  const previous = stored.repository;
  let encryptedToken = previous?.localPath === localPath ? previous.encryptedToken : undefined;
  if (input.clearToken) encryptedToken = undefined;
  if (input.token) { requireSecureStorage('The Git token'); encryptedToken = safeStorage.encryptString(input.token).toString('base64'); }
  stored.repository = { localPath, remoteUrl: input.remoteUrl?.trim() || undefined, branch, authorName: input.authorName.trim(), authorEmail: input.authorEmail.trim(), username: input.username?.trim() || undefined, encryptedToken };
  writeStore();
  return stored.repository;
}
async function configureOrigin(repository: GitRepository) {
  try { await git.deleteRemote({ fs, dir: repository.localPath, remote: 'origin' }); } catch { /* The remote may not exist yet. */ }
  if (!repository.remoteUrl) return;
  await git.addRemote({ fs, dir: repository.localPath, remote: 'origin', url: repository.remoteUrl, force: true });
}
function wikiPageTitle(contents: string, filename: string) { return contents.match(/^#\s+(.+)$/m)?.[1]?.trim() || filename.replace(/\.md$/i, '').replace(/[-_]/g, ' '); }
function listMarkdownPages(repository: GitRepository) {
  const pages: Array<{ path: string; title: string; section: 'general' | 'sessions' | 'vendors' }> = [];
  const roots: Array<{ relative: string; section: 'general' | 'sessions' | 'vendors' }> = [{ relative: 'wiki/general', section: 'general' }, { relative: 'wiki/sessions', section: 'sessions' }, { relative: 'vendors', section: 'vendors' }];
  for (const root of roots) { const absolute = path.join(repository.localPath, ...root.relative.split('/')); if (!fs.existsSync(absolute)) continue; const pending = [absolute]; while (pending.length) { const directory = pending.pop()!; for (const entry of fs.readdirSync(directory, { withFileTypes: true }).slice(0, 2000)) { if (entry.isSymbolicLink()) continue; const full = path.join(directory, entry.name); if (entry.isDirectory()) pending.push(full); else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md') && fs.statSync(full).size <= 2 * 1024 * 1024) { const relative = path.relative(repository.localPath, full).split(path.sep).join('/'); const contents = fs.readFileSync(full, 'utf8'); pages.push({ path: relative, title: wikiPageTitle(contents, entry.name), section: root.section }); } } } }
  return pages.sort((a, b) => a.section.localeCompare(b.section) || a.title.localeCompare(b.title));
}
function wikiRoot(section: 'general' | 'vendors') { return section === 'general' ? 'wiki/general' : 'vendors'; }
function wikiSlug(name: string) { if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('Enter a valid name.'); const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); if (!slug) throw new Error('Enter a name containing letters or numbers.'); return slug; }
function validateWikiFolder(section: 'general' | 'vendors', requested?: string) { const root = wikiRoot(section); const relative = (requested || root).replace(/\\/g, '/').replace(/\/+$/, ''); if (relative !== root && !relative.startsWith(`${root}/`)) throw new Error('The target folder is outside this Wiki section.'); const absolute = safeRepoPath(relative); if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) throw new Error('The target Wiki folder no longer exists.'); return { relative, absolute }; }
function listWikiFolders(repository: GitRepository) { const folders: Array<{ path: string; name: string; section: 'general' | 'vendors' }> = []; for (const section of ['general', 'vendors'] as const) { const root = wikiRoot(section); const absoluteRoot = path.join(repository.localPath, ...root.split('/')); if (!fs.existsSync(absoluteRoot)) continue; const pending = [absoluteRoot]; while (pending.length) { const directory = pending.pop()!; for (const entry of fs.readdirSync(directory, { withFileTypes: true }).slice(0, 2000)) { if (!entry.isDirectory() || entry.isSymbolicLink()) continue; const full = path.join(directory, entry.name); const relative = path.relative(repository.localPath, full).split(path.sep).join('/'); folders.push({ path: relative, name: entry.name.replace(/[-_]/g, ' '), section }); pending.push(full); } } } return folders.sort((a, b) => a.path.localeCompare(b.path)); }
function managedKeysPath() { return path.join(app.getPath('userData'), 'keys'); }
function sshField(value: Buffer) { const length = Buffer.alloc(4); length.writeUInt32BE(value.length); return Buffer.concat([length, value]); }
function base64UrlBuffer(value: string) { return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }
function sshMpint(value: Buffer) { let bytes = value; while (bytes.length > 1 && bytes[0] === 0) bytes = bytes.subarray(1); if (bytes[0] & 0x80) bytes = Buffer.concat([Buffer.from([0]), bytes]); return sshField(bytes); }
function publicKeyFromRsa(key: crypto.KeyObject, comment: string) { const jwk = key.export({ format: 'jwk' }); if (!jwk.e || !jwk.n) throw new Error('Could not export the generated RSA public key.'); const blob = Buffer.concat([sshField(Buffer.from('ssh-rsa')), sshMpint(base64UrlBuffer(jwk.e)), sshMpint(base64UrlBuffer(jwk.n))]); return `ssh-rsa ${blob.toString('base64')} ${comment}`.trim(); }
function publicFingerprint(publicKey: string) { const encoded = publicKey.trim().split(/\s+/)[1]; if (!encoded) return undefined; return `SHA256:${crypto.createHash('sha256').update(Buffer.from(encoded, 'base64')).digest('base64').replace(/=+$/, '')}`; }
function keyInfo(privateKeyPath: string, source: 'managed' | 'discovered'): SshKeyInfo { const publicPath = `${privateKeyPath}.pub`; const publicKey = fs.existsSync(publicPath) && fs.statSync(publicPath).size <= 64 * 1024 ? fs.readFileSync(publicPath, 'utf8').trim() : undefined; return { name: path.basename(privateKeyPath), privateKeyPath, publicKey, fingerprint: publicKey ? publicFingerprint(publicKey) : undefined, source }; }
function assertManagedOrDiscoveredKey(privateKeyPath: string) { if (typeof privateKeyPath !== 'string' || privateKeyPath.length > 4096) throw new Error('Invalid key path.'); const resolved = path.resolve(privateKeyPath); const comparable = process.platform === 'win32' ? resolved.toLowerCase() : resolved; const roots = [path.resolve(managedKeysPath()), path.resolve(app.getPath('home'), '.ssh')].map(root => process.platform === 'win32' ? root.toLowerCase() : root); if (!roots.some(root => comparable.startsWith(`${root}${path.sep}`))) throw new Error('Key is outside the managed SSH key locations.'); const stats = fs.statSync(resolved); if (!stats.isFile() || stats.size > 1024 * 1024) throw new Error('Invalid private key file.'); return resolved; }
const connections = new Map<string, { client: Client; stream?: ClientChannel; sftp?: SFTPWrapper }>();
const pendingTrust = new Map<string, (accepted: boolean) => void>();
const pingMonitors = new Map<string, { stopped: boolean; timer?: NodeJS.Timeout; child?: ChildProcess; socket?: Socket }>();
let mainWindow: BrowserWindow | null = null;
const releaseUrl = 'https://github.com/Releah/HedgeCon/releases/latest';
const portableBuild = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
let updateStatus: UpdateStatus = { status: 'idle', currentVersion: app.getVersion(), portable: portableBuild, activeConnections: 0 };

function releaseNotesText(info: UpdateInfo) { if (typeof info.releaseNotes === 'string') return info.releaseNotes.slice(0, 20_000); if (Array.isArray(info.releaseNotes)) return info.releaseNotes.map(note => `${note.version}: ${note.note ?? ''}`).join('\n\n').slice(0, 20_000); return undefined; }
function publishUpdateStatus(patch: Partial<UpdateStatus>) { updateStatus = { ...updateStatus, ...patch, currentVersion: app.getVersion(), portable: portableBuild, activeConnections: connections.size }; mainWindow?.webContents.send('update:status', updateStatus); return updateStatus; }
function configureUpdates() {
  if (!app.isPackaged || portableBuild) { publishUpdateStatus({ status: 'unsupported', message: portableBuild ? 'Portable builds notify you about releases but must be updated manually.' : 'Automatic updates are available in packaged builds.' }); return; }
  autoUpdater.autoDownload = false; autoUpdater.autoInstallOnAppQuit = false; autoUpdater.allowDowngrade = false; autoUpdater.allowPrerelease = stored.updateSettings.branch === 'experimental';
  autoUpdater.on('checking-for-update', () => publishUpdateStatus({ status: 'checking', message: undefined }));
  autoUpdater.on('update-available', info => publishUpdateStatus({ status: 'available', availableVersion: info.version, releaseNotes: releaseNotesText(info), progress: undefined, message: undefined }));
  autoUpdater.on('update-not-available', info => publishUpdateStatus({ status: 'current', availableVersion: info.version, progress: undefined, message: 'HedgeCon is up to date.' }));
  autoUpdater.on('download-progress', (progress: ProgressInfo) => publishUpdateStatus({ status: 'downloading', progress: Math.max(0, Math.min(100, progress.percent)) }));
  autoUpdater.on('update-downloaded', info => publishUpdateStatus({ status: 'downloaded', availableVersion: info.version, releaseNotes: releaseNotesText(info), progress: 100, message: 'The update is ready to install.' }));
  autoUpdater.on('error', error => publishUpdateStatus({ status: 'error', message: error.message || 'The update check failed.' }));
  if (stored.updateSettings.automaticChecks) setTimeout(() => void autoUpdater.checkForUpdates().catch(error => publishUpdateStatus({ status: 'error', message: error instanceof Error ? error.message : String(error) })), 12_000);
}

app.setName('HedgeCon');
app.setPath('userData', path.join(app.getPath('appData'), 'HedgeCon'));
Menu.setApplicationMenu(null);

function createWindow() {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    backgroundColor: '#0b1018', title: 'HedgeCon', autoHideMenuBar: true,
    icon: path.join(__dirname, devUrl ? '../public/hedgecon-logo.png' : '../dist/hedgecon-logo.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', event => event.preventDefault());
  if (devUrl) mainWindow.loadURL(devUrl); else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

function send(id: string, type: string, data: string) { mainWindow?.webContents.send('ssh:event', { connectionId: id, type, data }); }

function stopPing(monitorId: string) { const monitor = pingMonitors.get(monitorId); if (!monitor) return; monitor.stopped = true; if (monitor.timer) clearTimeout(monitor.timer); monitor.child?.kill(); monitor.socket?.destroy(); pingMonitors.delete(monitorId); }
function cleanupRuntime() { for (const id of [...pingMonitors.keys()]) stopPing(id); for (const [id, connection] of connections) { pendingTrust.get(id)?.(false); try { connection.stream?.close(); } catch { /* Stream may already be closed. */ } try { connection.client.destroy(); } catch { /* Client may already be destroyed. */ } } connections.clear(); pendingTrust.clear(); }

const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.on('second-instance', () => { if (!mainWindow) return; if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); });

app.whenReady().then(() => {
  if (!primaryInstance) return;
  readStore();
  electronSession.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  electronSession.defaultSession.setPermissionCheckHandler(() => false);
  createWindow();
  configureUpdates();
});
app.on('before-quit', cleanupRuntime);
app.on('will-quit', cleanupRuntime);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle('data:load', () => ({ folders: stored.folders, sessions: stored.sessions, inventorySettings: stored.inventorySettings, uiSettings: stored.uiSettings, credentialProfileMappings: stored.credentialProfileMappings }));
ipcMain.handle('update:status', () => publishUpdateStatus({}));
ipcMain.handle('update:settings', (_event, input?: UpdateSettings) => { if (input) { if (typeof input.automaticChecks !== 'boolean' || !['main', 'experimental'].includes(input.branch)) throw new Error('Invalid update preference.'); stored.updateSettings = { automaticChecks: input.automaticChecks, branch: input.branch }; autoUpdater.allowPrerelease = input.branch === 'experimental'; writeStore(); } return stored.updateSettings; });
ipcMain.handle('update:check', async () => { if (!app.isPackaged || portableBuild) return publishUpdateStatus({ status: 'unsupported', message: portableBuild ? 'Download the latest portable build from GitHub Releases.' : 'Update checks are only available in packaged builds.' }); await autoUpdater.checkForUpdates(); return updateStatus; });
ipcMain.handle('update:download', async () => { if (updateStatus.status !== 'available') throw new Error('No update is ready to download.'); await autoUpdater.downloadUpdate(); return updateStatus; });
ipcMain.handle('update:install', () => { if (updateStatus.status !== 'downloaded') throw new Error('Download the update before installing it.'); cleanupRuntime(); for (const window of BrowserWindow.getAllWindows()) window.removeAllListeners('close'); setTimeout(() => autoUpdater.quitAndInstall(true, true), 150); return true; });
ipcMain.handle('update:open-release', () => shell.openExternal(releaseUrl));
ipcMain.handle('inventory:configure', (_event, input: InventorySettings) => { if (!input || typeof input.configured !== 'boolean' || !['local', 'git'].includes(input.mode) || (input.mode === 'git' && (!input.repositoryPath || !/^[a-z0-9._/-]+\.ya?ml$/i.test(input.repositoryPath)))) throw new Error('Invalid inventory configuration.'); if (input.mode === 'git') safeRepoPath(input.repositoryPath!); stored.inventorySettings = input; writeStore(); return input; });
ipcMain.handle('inventory:git-read', () => { if (stored.inventorySettings.mode !== 'git' || !stored.inventorySettings.repositoryPath) throw new Error('Git inventory is not configured.'); const target = safeRepoPath(stored.inventorySettings.repositoryPath); return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null; });
ipcMain.handle('inventory:git-write', (_event, source: string) => { if (stored.inventorySettings.mode !== 'git' || !stored.inventorySettings.repositoryPath || typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > 5_000_000 || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(source)) throw new Error('Invalid Git inventory.'); const target = safeRepoPath(stored.inventorySettings.repositoryPath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, source, 'utf8'); return true; });
ipcMain.handle('clipboard:read-text', () => clipboard.readText().slice(0, 1024 * 1024));
ipcMain.handle('clipboard:write-text', (_event, value: string) => { if (typeof value !== 'string' || value.length > 1024 * 1024) throw new Error('Clipboard text is too large.'); clipboard.writeText(value); return true; });
ipcMain.handle('data:save', (_event, data: { folders: unknown[]; sessions: unknown[]; uiSettings?: unknown; credentialProfileMappings?: Record<string, string> }) => {
  if (!data || !Array.isArray(data.folders) || !Array.isArray(data.sessions) || data.folders.length > 10_000 || data.sessions.length > 50_000 || Buffer.byteLength(JSON.stringify(data), 'utf8') > 10_000_000) throw new Error('Invalid or oversized workspace data.');
  if (data.credentialProfileMappings && (typeof data.credentialProfileMappings !== 'object' || Array.isArray(data.credentialProfileMappings) || Object.keys(data.credentialProfileMappings).length > 500 || Object.entries(data.credentialProfileMappings).some(([profile, credentialId]) => !/^[A-Za-z0-9._ -]{1,120}$/.test(profile) || typeof credentialId !== 'string' || credentialId.length > 200))) throw new Error('Invalid credential profile mappings.'); stored.folders = data.folders; stored.sessions = data.sessions; stored.uiSettings = data.uiSettings; stored.credentialProfileMappings = data.credentialProfileMappings ?? {}; writeStore(); return data;
});
ipcMain.handle('app:reset-local-data', () => {
  const userDataRoot = path.resolve(app.getPath('userData')); const targets = [path.resolve(dataPath()), path.resolve(managedKeysPath())];
  const comparableRoot = process.platform === 'win32' ? userDataRoot.toLowerCase() : userDataRoot;
  for (const target of targets) { const comparableTarget = process.platform === 'win32' ? target.toLowerCase() : target; if (!comparableTarget.startsWith(`${comparableRoot}${path.sep}`)) throw new Error('Refusing to reset data outside the HedgeCon application directory.'); }
  cleanupRuntime(); if (fs.existsSync(targets[0])) fs.unlinkSync(targets[0]); if (fs.existsSync(targets[1])) fs.rmSync(targets[1], { recursive: true, force: true }); stored = { ...defaults };
  setTimeout(() => { app.relaunch(); app.exit(0); }, 200); return true;
});
ipcMain.handle('repo:get', () => repositoryMeta());
ipcMain.handle('repo:status', () => gitStatus());
ipcMain.handle('repo:freshness', async () => {
  const repository = getRepository();
  if (!repository.remoteUrl) return { state: 'local' as const };
  const localRef = `refs/heads/${repository.branch}`; const remoteRef = `refs/remotes/origin/${repository.branch}`;
  let local = await resolveRefIfPresent(repository, localRef);
  try { await git.fetch({ fs, http: gitHttp, dir: repository.localPath, remote: 'origin', ref: repository.branch, singleBranch: true, prune: true, onAuth: gitAuth(repository) }); }
  catch (error) {
    // A newly-created remote has no branch for Git to fetch until its first commit.
    if (local || !/ref|branch|head|commit|not found/i.test(error instanceof Error ? error.message : String(error))) throw error;
  }
  local = await resolveRefIfPresent(repository, localRef);
  const remote = await resolveRefIfPresent(repository, remoteRef);
  if (!local && !remote) return { state: 'uninitialized' as const };
  if (local && !remote) return { state: 'ahead' as const, local };
  if (!local && remote) return { state: 'behind' as const, remote };
  if (local === remote) return { state: 'current' as const, local, remote };
  const localBehind = await git.isDescendent({ fs, dir: repository.localPath, oid: remote!, ancestor: local! });
  if (localBehind) return { state: 'behind' as const, local, remote };
  const localAhead = await git.isDescendent({ fs, dir: repository.localPath, oid: local!, ancestor: remote! });
  return { state: localAhead ? 'ahead' as const : 'diverged' as const, local, remote };
});
ipcMain.handle('repo:open-local', async (_event, input: any) => {
  validateRepositoryInput(input);
  const chosen = await dialog.showOpenDialog(mainWindow!, { title: 'Choose a persistent HedgeCon Wiki folder', defaultPath: persistentWikiDefaultPath(), buttonLabel: 'Use this folder', properties: ['openDirectory', 'createDirectory'] });
  if (chosen.canceled) return null;
  const directory = assertPersistentRepositoryLocation(chosen.filePaths[0]); const gitDirectory = path.join(directory, '.git'); const isNew = !fs.existsSync(gitDirectory);
  if (isNew) await git.init({ fs, dir: directory, defaultBranch: 'main' });
  const branch = await git.currentBranch({ fs, dir: directory, fullname: false }) || 'main'; const repository = storeRepository(input, directory, branch);
  if (input.remoteUrl) await configureOrigin(repository);
  if (isNew) { seedRepository(directory); await commitRepository(repository, 'Initial HedgeCon workspace'); }
  return repositoryMeta();
});
ipcMain.handle('repo:clone', async (_event, input: any) => {
  validateRepositoryInput(input); if (!input.remoteUrl) throw new Error('An HTTPS remote repository URL is required.');
  const chosen = await dialog.showOpenDialog(mainWindow!, { title: 'Choose a persistent folder for the Wiki clone', defaultPath: persistentWikiDefaultPath(), buttonLabel: 'Clone here', properties: ['openDirectory', 'createDirectory'] });
  if (chosen.canceled) return null;
  const directory = assertPersistentRepositoryLocation(chosen.filePaths[0]); if (fs.readdirSync(directory).length) throw new Error('Choose an empty folder for the clone.');
  const temporary: GitRepository = { localPath: directory, remoteUrl: input.remoteUrl.trim(), branch: input.branch?.trim() || 'main', authorName: input.authorName.trim(), authorEmail: input.authorEmail.trim(), username: input.username?.trim() || undefined };
  if (input.token) { requireSecureStorage('The Git token'); temporary.encryptedToken = safeStorage.encryptString(input.token).toString('base64'); }
  await git.clone({ fs, http: gitHttp, dir: directory, url: temporary.remoteUrl!, ref: temporary.branch, singleBranch: true, onAuth: gitAuth(temporary) });
  temporary.branch = await git.currentBranch({ fs, dir: directory, fullname: false }) || temporary.branch; stored.repository = temporary; writeStore(); seedRepository(directory); return repositoryMeta();
});
ipcMain.handle('repo:update', async (_event, input: any) => { const current = getRepository(); const updated = storeRepository(input, current.localPath, current.branch); await configureOrigin(updated); return repositoryMeta(); });
ipcMain.handle('repo:test-connection', async () => { const repository = getRepository(); if (!repository.remoteUrl) throw new Error('No remote server is configured. Add an HTTPS repository URL first.'); const refs = await git.listServerRefs({ http: gitHttp, url: repository.remoteUrl, symrefs: true, onAuth: gitAuth(repository) }); return { remoteUrl: repository.remoteUrl, branch: repository.branch, branchFound: refs.some(ref => ref.ref === `refs/heads/${repository.branch}`) }; });
ipcMain.handle('repo:commit', async (_event, message: string) => { if (typeof message !== 'string' || !message.trim() || message.length > 500) throw new Error('Enter a concise commit message.'); const oid = await commitRepository(getRepository(), message.trim()); return { oid, status: await gitStatus() }; });
ipcMain.handle('repo:pull', async () => { const repository = getRepository(); if (!repository.remoteUrl) throw new Error('Configure a remote repository before pulling.'); const status = await gitStatus(); if (status.changedFiles.length) throw new Error('Save and commit local changes before pulling.'); await git.pull({ fs, http: gitHttp, dir: repository.localPath, remote: 'origin', ref: repository.branch, singleBranch: true, fastForwardOnly: true, author: { name: repository.authorName, email: repository.authorEmail }, onAuth: gitAuth(repository) }); return gitStatus(); });
ipcMain.handle('repo:push', async () => { const repository = getRepository(); if (!repository.remoteUrl) throw new Error('Configure a remote repository before pushing.'); const status = await gitStatus(); if (status.changedFiles.length) throw new Error('Save and commit local changes before syncing with the server.'); return guardedPush(repository); });
ipcMain.handle('repo:resolve-conflicts', async (_event, input: any) => { const repository = getRepository(); if (!repository.remoteUrl || !input || typeof input.localOid !== 'string' || typeof input.remoteOid !== 'string' || !Array.isArray(input.resolutions)) throw new Error('The conflict resolution request is invalid.'); const refs = await fetchRepository(repository); if (refs.local !== input.localOid || refs.remote !== input.remoteOid) throw new Error('The repository changed while conflicts were being resolved. Refresh and review the latest versions before trying again.'); const conflicts = await inspectMerge(repository); const paths = new Set(conflicts.map(conflict => conflict.path)); const resolutions = new Map<string, string>(); for (const resolution of input.resolutions) { if (!resolution || typeof resolution.path !== 'string' || !paths.has(resolution.path) || typeof resolution.contents !== 'string' || Buffer.byteLength(resolution.contents, 'utf8') > 2 * 1024 * 1024) throw new Error('One of the conflict resolutions is invalid or too large.'); if (resolution.contents.includes('<<<<<<< My version (') && resolution.contents.includes('>>>>>>> Server version')) throw new Error(`Resolve the conflict markers in ${resolution.path} before continuing.`); resolutions.set(resolution.path, resolution.contents); } if (resolutions.size !== paths.size) throw new Error('Resolve every conflicted file before continuing.'); await mergeRemote(repository, resolutions); await git.push({ fs, http: gitHttp, dir: repository.localPath, remote: 'origin', ref: repository.branch, onAuth: gitAuth(repository) }); return { outcome: 'pushed' as const, status: await gitStatus(), sync: 'merged' as const }; });
ipcMain.handle('wiki:list', () => listMarkdownPages(getRepository()));
ipcMain.handle('wiki:list-folders', () => listWikiFolders(getRepository()));
ipcMain.handle('wiki:read', (_event, relativePath: string) => { const target = safeRepoPath(relativePath); const stats = fs.statSync(target); if (!stats.isFile() || stats.size > 2 * 1024 * 1024 || !target.toLowerCase().endsWith('.md')) throw new Error('Wiki pages must be Markdown files no larger than 2 MB.'); return fs.readFileSync(target, 'utf8'); });
ipcMain.handle('wiki:write', (_event, relativePath: string, contents: string) => { if (typeof contents !== 'string' || Buffer.byteLength(contents, 'utf8') > 2 * 1024 * 1024 || /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(contents)) throw new Error('The page is too large or appears to contain a private key.'); const target = safeRepoPath(relativePath); if (!target.toLowerCase().endsWith('.md')) throw new Error('Wiki pages must use the .md extension.'); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, contents, 'utf8'); return true; });
ipcMain.handle('wiki:create', (_event, rawSection: string, name: string, parentPath?: string) => { if (!['general', 'vendors'].includes(rawSection)) throw new Error('Choose a valid Wiki section.'); const section = rawSection as 'general' | 'vendors'; const slug = wikiSlug(name); const folder = validateWikiFolder(section, parentPath); const relativePath = `${folder.relative}/${slug}.md`; const target = safeRepoPath(relativePath); if (fs.existsSync(target)) throw new Error('A page with that name already exists.'); fs.writeFileSync(target, `# ${name.trim()}\n\n`, { encoding: 'utf8', flag: 'wx' }); return { path: relativePath, title: name.trim(), section }; });
ipcMain.handle('wiki:create-folder', (_event, rawSection: string, name: string, parentPath?: string) => { if (!['general', 'vendors'].includes(rawSection)) throw new Error('Choose a valid Wiki section.'); const section = rawSection as 'general' | 'vendors'; const slug = wikiSlug(name); const parent = validateWikiFolder(section, parentPath); const relativePath = `${parent.relative}/${slug}`; const target = safeRepoPath(relativePath); if (fs.existsSync(target)) throw new Error('A folder with that name already exists.'); fs.mkdirSync(target); fs.writeFileSync(path.join(target, '.gitkeep'), '', { flag: 'wx' }); return { path: relativePath, name: name.trim(), section }; });
ipcMain.handle('wiki:move-page', (_event, sourcePath: string, targetFolder: string) => { if (typeof sourcePath !== 'string' || typeof targetFolder !== 'string' || !sourcePath.toLowerCase().endsWith('.md')) throw new Error('Invalid Wiki page move.'); const section: 'general' | 'vendors' | null = sourcePath.startsWith('wiki/general/') ? 'general' : sourcePath.startsWith('vendors/') ? 'vendors' : null; if (!section) throw new Error('Session notes cannot be moved.'); const folder = validateWikiFolder(section, targetFolder); const source = safeRepoPath(sourcePath); if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error('The Wiki page no longer exists.'); const relativePath = `${folder.relative}/${path.posix.basename(sourcePath)}`; if (relativePath === sourcePath) { const contents = fs.readFileSync(source, 'utf8'); return { path: sourcePath, title: wikiPageTitle(contents, path.basename(source)), section }; } const target = safeRepoPath(relativePath); if (fs.existsSync(target)) throw new Error('A page with that filename already exists in the target folder.'); fs.renameSync(source, target); const contents = fs.readFileSync(target, 'utf8'); return { path: relativePath, title: wikiPageTitle(contents, path.basename(target)), section }; });
ipcMain.handle('wiki:session-page', (_event, sessionId: string, sessionName: string, host: string) => { if (typeof sessionId !== 'string' || !/^[a-z0-9-]{1,100}$/i.test(sessionId) || typeof sessionName !== 'string' || sessionName.length > 200 || typeof host !== 'string' || host.length > 253) throw new Error('Invalid session details.'); const relativePath = `wiki/sessions/${sessionId}/README.md`; const target = safeRepoPath(relativePath); if (!fs.existsSync(target)) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `# ${sessionName}\n\n**Host:** \`${host}\`\n\n## Notes\n\n`, { encoding: 'utf8', flag: 'wx' }); } return { path: relativePath, title: sessionName, section: 'sessions' }; });
ipcMain.handle('key:choose', async () => {
  fs.mkdirSync(managedKeysPath(), { recursive: true, mode: 0o700 });
  const result = await dialog.showOpenDialog({ properties: ['openFile'], title: 'Choose SSH private key', defaultPath: managedKeysPath(), filters: [{ name: 'All files', extensions: ['*'] }] });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle('keys:list', () => {
  const locations: Array<{ directory: string; source: 'managed' | 'discovered' }> = [{ directory: managedKeysPath(), source: 'managed' }, { directory: path.join(app.getPath('home'), '.ssh'), source: 'discovered' }];
  const keys: SshKeyInfo[] = []; const seen = new Set<string>();
  for (const location of locations) { if (!fs.existsSync(location.directory)) continue; for (const entry of fs.readdirSync(location.directory, { withFileTypes: true }).slice(0, 200)) { const fullPath = path.join(location.directory, entry.name); const supportedDiscoveredName = /^id_|\.key$|\.pem$|\.pk8$/i.test(entry.name); if (!entry.isFile() || entry.name.endsWith('.pub') || (location.source === 'discovered' && !supportedDiscoveredName) || seen.has(path.resolve(fullPath).toLowerCase())) continue; try { const stats = fs.statSync(fullPath); if (!stats.size || stats.size > 1024 * 1024) continue; keys.push(keyInfo(fullPath, location.source)); seen.add(path.resolve(fullPath).toLowerCase()); } catch { /* Ignore unreadable key candidates. */ } } }
  return keys;
});
ipcMain.handle('keys:generate', (_event, input: { name: string; comment: string; passphrase: string }) => {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 80 || !/^[a-z0-9._-]+$/i.test(input.name) || typeof input.comment !== 'string' || /[\r\n]/.test(input.comment) || input.comment.length > 200 || typeof input.passphrase !== 'string' || input.passphrase.length > 16_384) throw new Error('Invalid key details.');
  const directory = managedKeysPath(); fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); const privateKeyPath = path.join(directory, input.name.trim()); if (fs.existsSync(privateKeyPath) || fs.existsSync(`${privateKeyPath}.pub`)) throw new Error('A key with that name already exists.');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 3072, publicExponent: 0x10001 });
  const privatePem = input.passphrase ? privateKey.export({ type: 'pkcs1', format: 'pem', cipher: 'aes-256-cbc', passphrase: input.passphrase }) : privateKey.export({ type: 'pkcs1', format: 'pem' });
  const publicLine = publicKeyFromRsa(publicKey, input.comment.trim() || `hedgecon@${process.platform}`);
  fs.writeFileSync(privateKeyPath, privatePem, { mode: 0o600, flag: 'wx' }); fs.writeFileSync(`${privateKeyPath}.pub`, `${publicLine}\n`, { mode: 0o644, flag: 'wx' }); return keyInfo(privateKeyPath, 'managed');
});
ipcMain.handle('keys:import', async () => {
  const chosen = await dialog.showOpenDialog(mainWindow!, { title: 'Import SSH private key', properties: ['openFile'] }); if (chosen.canceled) return null;
  const source = chosen.filePaths[0]; const stats = fs.statSync(source); if (!stats.isFile() || stats.size > 1024 * 1024) throw new Error('Private key must be a file no larger than 1 MB.');
  const directory = managedKeysPath(); fs.mkdirSync(directory, { recursive: true, mode: 0o700 }); let name = path.basename(source); let destination = path.join(directory, name); for (let suffix = 2; fs.existsSync(destination); suffix += 1) { name = `${path.basename(source)}-${suffix}`; destination = path.join(directory, name); }
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL); fs.chmodSync(destination, 0o600); if (fs.existsSync(`${source}.pub`) && fs.statSync(`${source}.pub`).size <= 64 * 1024) fs.copyFileSync(`${source}.pub`, `${destination}.pub`, fs.constants.COPYFILE_EXCL); return keyInfo(destination, 'managed');
});
ipcMain.handle('keys:copy-public', (_event, privateKeyPath: string) => { const resolved = assertManagedOrDiscoveredKey(privateKeyPath); const info = keyInfo(resolved, resolved.startsWith(path.resolve(managedKeysPath())) ? 'managed' : 'discovered'); if (!info.publicKey) throw new Error('No matching .pub file was found for this key.'); clipboard.writeText(info.publicKey); return true; });
ipcMain.handle('keys:delete', (_event, privateKeyPath: string) => {
  const resolved = assertManagedOrDiscoveredKey(privateKeyPath); const managedRoot = path.resolve(managedKeysPath()); const comparablePath = process.platform === 'win32' ? resolved.toLowerCase() : resolved; const comparableRoot = process.platform === 'win32' ? managedRoot.toLowerCase() : managedRoot;
  if (!comparablePath.startsWith(`${comparableRoot}${path.sep}`)) throw new Error('Only keys managed by HedgeCon can be deleted here.');
  fs.unlinkSync(resolved); if (fs.existsSync(`${resolved}.pub`)) fs.unlinkSync(`${resolved}.pub`); return true;
});
ipcMain.handle('keys:install', async (_event, connectionId: string, privateKeyPath: string) => {
  const connection = getConnection(connectionId); const resolved = assertManagedOrDiscoveredKey(privateKeyPath); const info = keyInfo(resolved, resolved.startsWith(path.resolve(managedKeysPath())) ? 'managed' : 'discovered'); if (!info.publicKey) throw new Error('No matching .pub file was found for this key.');
  const quoted = quoteRemote(info.publicKey); const command = `umask 077; mkdir -p ~/.ssh || exit 1; touch ~/.ssh/authorized_keys || exit 1; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys; if ! grep -qxF ${quoted} ~/.ssh/authorized_keys; then printf '%s\\n' ${quoted} >> ~/.ssh/authorized_keys; fi`;
  await new Promise<void>((resolve, reject) => connection.client.exec(command, (error, stream) => {
    if (error) return reject(error); let stderr = ''; let exitCode: number | null | undefined; let settled = false;
    const timer = setTimeout(() => { if (settled) return; settled = true; stream.close(); reject(new Error('Key installation timed out after 15 seconds.')); }, 15_000);
    const finish = (failure?: Error) => { if (settled) return; settled = true; clearTimeout(timer); failure ? reject(failure) : resolve(); };
    stream.on('data', () => { /* Drain stdout so the remote channel cannot block. */ });
    stream.stderr.on('data', data => { if (stderr.length < 4096) stderr += data.toString().slice(0, 4096 - stderr.length); });
    stream.on('exit', (code: number | null) => { exitCode = code; });
    stream.on('error', (error: Error) => finish(error));
    stream.on('close', () => exitCode === undefined || exitCode === 0 ? finish() : finish(new Error(stderr.trim() || `Remote key installation failed with exit code ${exitCode}.`)));
  })); return true;
});
ipcMain.handle('keys:remove', async (_event, connectionId: string, privateKeyPath: string) => {
  const connection = getConnection(connectionId); const resolved = assertManagedOrDiscoveredKey(privateKeyPath); const info = keyInfo(resolved, resolved.startsWith(path.resolve(managedKeysPath())) ? 'managed' : 'discovered'); if (!info.publicKey) throw new Error('No matching .pub file was found for this key.');
  const quoted = quoteRemote(info.publicKey); const command = `umask 077; if [ -f ~/.ssh/authorized_keys ]; then temporary=~/.ssh/authorized_keys.hedgecon.$$; grep -vxF ${quoted} ~/.ssh/authorized_keys > "$temporary" || true; chmod 600 "$temporary"; mv "$temporary" ~/.ssh/authorized_keys; fi`;
  await new Promise<void>((resolve, reject) => connection.client.exec(command, (error, stream) => { if (error) return reject(error); let stderr = ''; let exitCode: number | null | undefined; let settled = false; const timer = setTimeout(() => { if (settled) return; settled = true; stream.close(); reject(new Error('Key removal timed out after 15 seconds.')); }, 15_000); const finish = (failure?: Error) => { if (settled) return; settled = true; clearTimeout(timer); failure ? reject(failure) : resolve(); }; stream.on('data', () => {}); stream.stderr.on('data', data => { if (stderr.length < 4096) stderr += data.toString().slice(0, 4096 - stderr.length); }); stream.on('exit', (code: number | null) => { exitCode = code; }); stream.on('error', (failure: Error) => finish(failure)); stream.on('close', () => exitCode === undefined || exitCode === 0 ? finish() : finish(new Error(stderr.trim() || `Remote key removal failed with exit code ${exitCode}.`))); })); return true;
});
ipcMain.handle('keys:remote-list', async (_event, connectionId: string) => {
  const connection = getConnection(connectionId);
  const contents = await new Promise<string>((resolve, reject) => connection.client.exec('if [ -f ~/.ssh/authorized_keys ]; then cat ~/.ssh/authorized_keys; fi', (error, stream) => { if (error) return reject(error); let stdout = ''; let stderr = ''; let exitCode: number | null | undefined; let settled = false; const timer = setTimeout(() => { if (settled) return; settled = true; stream.close(); reject(new Error('Reading remote authorized keys timed out after 10 seconds.')); }, 10_000); const finish = (failure?: Error) => { if (settled) return; settled = true; clearTimeout(timer); failure ? reject(failure) : resolve(stdout); }; stream.on('data', (data: Buffer) => { if (stdout.length < 1024 * 1024) stdout += data.toString().slice(0, 1024 * 1024 - stdout.length); }); stream.stderr.on('data', (data: Buffer) => { if (stderr.length < 4096) stderr += data.toString().slice(0, 4096 - stderr.length); }); stream.on('exit', (code: number | null) => { exitCode = code; }); stream.on('error', (failure: Error) => finish(failure)); stream.on('close', () => exitCode === undefined || exitCode === 0 ? finish() : finish(new Error(stderr.trim() || `Could not read remote authorized keys (${exitCode}).`))); }));
  return contents.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
});
ipcMain.handle('host-key:clear', (_event, host: string, port: number) => {
  if (typeof host !== 'string' || !isValidHost(host) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid known-host entry.');
  const key = `${host}:${port}`; const existed = Boolean(stored.knownHosts[key]);
  if (existed) { delete stored.knownHosts[key]; writeStore(); }
  return existed;
});
ipcMain.handle('host-key:clear-all', () => { const count = Object.keys(stored.knownHosts).length; stored.knownHosts = {}; writeStore(); return count; });
const credentialMeta = (credential: StoredCredential) => ({ id: credential.id, name: credential.name, username: credential.username, authMethod: credential.authMethod, privateKeyPath: credential.privateKeyPath, hasSecret: Boolean(credential.encryptedSecret) });
ipcMain.handle('credentials:list', () => stored.credentialSets.map(credentialMeta));
ipcMain.handle('security:storage-status', () => secureStorageStatus());
ipcMain.handle('credentials:save', (_event, input: Omit<StoredCredential, 'encryptedSecret'> & { secret?: string; clearSecret?: boolean }) => {
  if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120 || typeof input.username !== 'string' || input.username.length > 255 || !['password', 'privateKey'].includes(input.authMethod) || (input.privateKeyPath !== undefined && (typeof input.privateKeyPath !== 'string' || input.privateKeyPath.length > 4096)) || (input.secret !== undefined && (typeof input.secret !== 'string' || input.secret.length > 16_384))) throw new Error('Invalid credential set.');
  const existing = stored.credentialSets.find(item => item.id === input.id);
  let encryptedSecret = existing?.encryptedSecret;
  if (input.clearSecret) encryptedSecret = undefined;
  if (input.secret) {
    requireSecureStorage('The credential secret');
    encryptedSecret = safeStorage.encryptString(input.secret).toString('base64');
  }
  const credential: StoredCredential = { id: input.id || crypto.randomUUID(), name: input.name.trim(), username: input.username.trim(), authMethod: input.authMethod, privateKeyPath: input.privateKeyPath, encryptedSecret };
  stored.credentialSets = [...stored.credentialSets.filter(item => item.id !== credential.id), credential]; writeStore(); return credentialMeta(credential);
});
ipcMain.handle('credentials:delete', (_event, id: string) => { const existed = stored.credentialSets.some(item => item.id === id); stored.credentialSets = stored.credentialSets.filter(item => item.id !== id); writeStore(); return existed; });
ipcMain.handle('ssh:connect', async (_event, request: any) => {
  if (!request || typeof request.host !== 'string' || !isValidHost(request.host) || !Number.isInteger(request.port) || request.port < 1 || request.port > 65535 || typeof request.username !== 'string' || request.username.length > 255 || (request.connectionId && typeof request.connectionId !== 'string')) throw new Error('Invalid SSH connection request.');
  const id = request.connectionId || crypto.randomUUID(); const client = new Client(); connections.set(id, { client });
  const linkedCredential = request.credentialSetId ? stored.credentialSets.find(item => item.id === request.credentialSetId) : undefined;
  if (request.credentialSetId && !linkedCredential) throw new Error('Credential set not found.');
  const authMethod = linkedCredential?.authMethod ?? request.authMethod;
  const privateKeyPath = linkedCredential?.privateKeyPath ?? request.privateKeyPath;
  if (linkedCredential?.encryptedSecret) requireSecureStorage('The saved credential secret');
  const secret = request.credentialOverride !== undefined ? request.credentialOverride : linkedCredential?.encryptedSecret ? safeStorage.decryptString(Buffer.from(linkedCredential.encryptedSecret, 'base64')) : authMethod === 'password' ? request.password ?? '' : request.passphrase ?? '';
  if (!['password', 'privateKey'].includes(authMethod) || typeof secret !== 'string' || secret.length > 16_384) throw new Error('Invalid SSH authentication data.');
  const hostKey = `${request.host}:${request.port}`;
  const config: any = {
    host: request.host, port: request.port, username: linkedCredential?.username ?? request.username, readyTimeout: 15000,
    hostHash: 'sha256',
    hostVerifier: (hash: string, callback: (accepted: boolean) => void) => {
      const known = stored.knownHosts[hostKey];
      if (known === hash) return callback(true);
      pendingTrust.set(id, (accepted) => {
        pendingTrust.delete(id);
        if (accepted) { stored.knownHosts[hostKey] = hash; writeStore(); }
        callback(accepted);
      });
      mainWindow?.webContents.send('ssh:host-key', { connectionId: id, host: hostKey, fingerprint: hash, changed: Boolean(known) });
    }
  };
  if (authMethod === 'privateKey') {
    if (typeof privateKeyPath !== 'string' || privateKeyPath.length > 4096) throw new Error('A valid private key path is required.');
    const keyStats = fs.statSync(privateKeyPath); if (!keyStats.isFile() || keyStats.size > 1024 * 1024) throw new Error('Private key must be a file no larger than 1 MB.');
    const privateKeyContents = fs.readFileSync(privateKeyPath); const keyText = privateKeyContents.subarray(0, 120).toString('utf8');
    if (/^ssh-(?:rsa|ed25519)|^ecdsa-sha2-/m.test(keyText) || privateKeyPath.toLowerCase().endsWith('.pub')) throw new Error('A public key was selected. Choose the private key file without the .pub extension.');
    if (/-----BEGIN (?:ENCRYPTED )?PRIVATE KEY-----/.test(keyText)) throw new Error('This PKCS#8 key format is not supported by the SSH engine. Generate a new HedgeCon RSA-3072 key or import an OpenSSH/PEM private key.');
    config.privateKey = privateKeyContents; if (secret) config.passphrase = secret;
  } else config.password = secret;
  client.on('ready', () => {
    send(id, 'status', 'Connected');
    client.shell({ term: 'xterm-256color', cols: 100, rows: 30 }, (err, stream) => {
      if (err) return send(id, 'error', err.message);
      const entry = connections.get(id); if (entry) entry.stream = stream;
      stream.on('data', (data: Buffer) => send(id, 'data', data.toString()));
      stream.stderr.on('data', (data: Buffer) => send(id, 'data', data.toString()));
      stream.on('close', () => { send(id, 'closed', 'Connection closed'); client.end(); connections.delete(id); });
    });
  }).on('error', (err) => { const authenticationFailure = (err as any).level === 'client-authentication' || /authentication methods failed|authentication failure/i.test(err.message); send(id, authenticationFailure ? 'auth-error' : 'error', err.message); connections.delete(id); })
    .on('close', () => { pendingTrust.delete(id); connections.delete(id); send(id, 'closed', 'Disconnected'); }).connect(config);
  return { connectionId: id };
});
ipcMain.on('ssh:trust', (_e, id: string, accepted: boolean) => pendingTrust.get(id)?.(accepted));
ipcMain.on('ssh:write', (_e, id: string, data: string) => { if (typeof data === 'string' && data.length <= 1024 * 1024) connections.get(id)?.stream?.write(data); });
ipcMain.on('ssh:resize', (_e, id: string, cols: number, rows: number) => { if (Number.isInteger(cols) && Number.isInteger(rows) && cols >= 2 && cols <= 1000 && rows >= 1 && rows <= 1000) connections.get(id)?.stream?.setWindow(rows, cols, 0, 0); });
ipcMain.on('ssh:disconnect', (_e, id: string) => { pendingTrust.get(id)?.(false); connections.get(id)?.client.end(); connections.delete(id); });
ipcMain.handle('ping:start', (_event, host: string, requestedId: string) => {
  if (typeof host !== 'string' || !isValidHost(host)) throw new Error('Invalid ping target.');
  const monitorId = typeof requestedId === 'string' && requestedId ? requestedId : crypto.randomUUID(); const monitor = { stopped: false } as { stopped: boolean; timer?: NodeJS.Timeout; child?: ChildProcess }; pingMonitors.set(monitorId, monitor);
  const probe = () => {
    if (monitor.stopped) return;
    const args = process.platform === 'win32' ? ['-n', '1', '-w', '1000', host] : ['-n', '-c', '1', '-W', '1', host];
    const started = Date.now();
    monitor.child = execFile('ping', args, { timeout: 1800, windowsHide: true, maxBuffer: 64 * 1024 }, (error, stdout) => {
      monitor.child = undefined;
      if (monitor.stopped) return;
      const match = stdout.match(/time[=<]?\s*([\d.]+)\s*ms/i); const latencyMs = !error ? (match ? Number(match[1]) : Math.max(1, Date.now() - started)) : null;
      mainWindow?.webContents.send('ping:sample', { monitorId, timestamp: Date.now(), reachable: !error, latencyMs, error: error?.message });
      monitor.timer = setTimeout(probe, 1000);
    });
  };
  probe(); return { monitorId };
});
ipcMain.handle('tcp-monitor:start', (_event, host: string, port: number, requestedId: string) => {
  if (typeof host !== 'string' || !isValidHost(host) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid TCP monitor target.');
  const monitorId = typeof requestedId === 'string' && requestedId ? requestedId : crypto.randomUUID(); const monitor = { stopped: false } as { stopped: boolean; timer?: NodeJS.Timeout; socket?: Socket }; pingMonitors.set(monitorId, monitor);
  const probe = () => {
    if (monitor.stopped) return;
    const started = Date.now(); const socket = new Socket(); monitor.socket = socket; let settled = false;
    const finish = (reachable: boolean, error?: Error) => { if (settled) return; settled = true; socket.destroy(); monitor.socket = undefined; if (monitor.stopped) return; mainWindow?.webContents.send('ping:sample', { monitorId, timestamp: Date.now(), reachable, latencyMs: reachable ? Math.max(1, Date.now() - started) : null, error: error?.message }); monitor.timer = setTimeout(probe, 1000); };
    socket.setTimeout(1500); socket.once('connect', () => finish(true)); socket.once('timeout', () => finish(false, new Error('TCP connection timed out.'))); socket.once('error', error => finish(false, error)); socket.connect(port, host);
  };
  probe(); return { monitorId };
});
ipcMain.on('ping:stop', (_event, monitorId: string) => stopPing(monitorId));

function getSftp(connectionId: string): Promise<SFTPWrapper> {
  const connection = connections.get(connectionId); if (!connection) return Promise.reject(new Error('SSH connection is not active.'));
  if (connection.sftp) return Promise.resolve(connection.sftp);
  return new Promise((resolve, reject) => connection.client.sftp((error, sftp) => { if (error) return reject(error); connection.sftp = sftp; resolve(sftp); }));
}
function isValidHost(host: string) { const value = host.trim(); if (!value || value.length > 253 || value.startsWith('-')) return false; if (isIP(value)) return true; return value.split('.').every(label => label.length > 0 && label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)); }
function quoteRemote(remotePath: string) { if (typeof remotePath !== 'string' || !remotePath || remotePath.length > 4096 || /[\0\r\n]/.test(remotePath)) throw new Error('Invalid remote path.'); return `'${remotePath.replace(/'/g, `'\\''`)}'`; }
function getConnection(connectionId: string) { const connection = connections.get(connectionId); if (!connection) throw new Error('SSH connection is not active.'); return connection; }
function scpUpload(connectionId: string, localPath: string, remoteDirectory: string): Promise<string> {
  const connection = getConnection(connectionId); const filename = path.basename(localPath); const size = fs.statSync(localPath).size;
  return new Promise((resolve, reject) => connection.client.exec(`scp -t -- ${quoteRemote(remoteDirectory)}`, (error, stream) => {
    if (error) return reject(error); let state = 0; let settled = false;
    const fail = (failure: unknown) => { if (settled) return; settled = true; stream.close(); reject(failure instanceof Error ? failure : new Error(String(failure))); };
    stream.on('data', (data: Buffer) => { const code = data[0]; if (code === 1 || code === 2) return fail(new Error(data.subarray(1).toString().trim() || 'Remote SCP error.')); if (code !== 0) return; if (state === 0) { state = 1; stream.write(`C0644 ${size} ${filename}\n`); } else if (state === 1) { state = 2; const source = fs.createReadStream(localPath); source.on('error', fail); source.on('end', () => stream.write(Buffer.from([0]))); source.pipe(stream, { end: false }); } else if (state === 2 && !settled) { settled = true; stream.end(); resolve(path.posix.join(remoteDirectory, filename)); } });
    stream.stderr.on('data', (data: Buffer) => { if (data.length) fail(new Error(data.toString().trim())); }); stream.on('error', fail);
  }));
}
function scpDownload(connectionId: string, remotePath: string, localPath: string): Promise<void> {
  const connection = getConnection(connectionId);
  return new Promise((resolve, reject) => connection.client.exec(`scp -f -- ${quoteRemote(remotePath)}`, (error, stream) => {
    if (error) return reject(error); let header = Buffer.alloc(0); let remaining = -1; let target: fs.WriteStream | null = null; let settled = false;
    const fail = (failure: unknown) => { if (settled) return; settled = true; target?.destroy(); stream.close(); reject(failure instanceof Error ? failure : new Error(String(failure))); };
    const finish = () => { if (settled) return; settled = true; stream.write(Buffer.from([0])); stream.end(); resolve(); };
    stream.on('data', (chunk: Buffer) => { if (settled) return; let data = chunk; if (remaining < 0) { header = Buffer.concat([header, data]); const newline = header.indexOf(10); if (newline < 0) return; const line = header.subarray(0, newline).toString(); if (line.charCodeAt(0) === 1 || line.charCodeAt(0) === 2) return fail(new Error(line.slice(1))); const match = line.match(/^C\d{4}\s+(\d+)\s+(.+)$/); if (!match) return fail(new Error(`Unexpected SCP response: ${line}`)); remaining = Number(match[1]); target = fs.createWriteStream(localPath, { mode: 0o600 }); target.on('error', fail); data = header.subarray(newline + 1); header = Buffer.alloc(0); stream.write(Buffer.from([0])); }
      if (remaining >= 0 && target) { const length = Math.min(remaining, data.length); if (length) target.write(data.subarray(0, length)); remaining -= length; if (remaining === 0) { target.end(); target.once('finish', finish); } }
    });
    stream.stderr.on('data', (data: Buffer) => { if (data.length) fail(new Error(data.toString().trim())); }); stream.on('error', fail); stream.write(Buffer.from([0]));
  }));
}
ipcMain.handle('sftp:list', async (_event, connectionId: string, remotePath: string) => {
  quoteRemote(remotePath); const sftp = await getSftp(connectionId); return new Promise((resolve, reject) => sftp.readdir(remotePath, (error, entries) => { if (error) return reject(error); if (entries.length > 10_000) return reject(new Error('Remote directory contains too many entries to display safely.')); resolve(entries.filter(entry => entry.filename !== '.' && entry.filename !== '..').map(entry => { const mode = entry.attrs.mode ?? 0; const type = (mode & 0o170000) === 0o040000 ? 'directory' : (mode & 0o170000) === 0o100000 ? 'file' : (mode & 0o170000) === 0o120000 ? 'link' : 'other'; return { name: entry.filename, path: path.posix.join(remotePath, entry.filename), type, size: entry.attrs.size, modifiedAt: entry.attrs.mtime * 1000, permissions: mode & 0o777 }; })); }));
});
ipcMain.handle('sftp:upload', async (_event, connectionId: string, remoteDirectory: string) => {
  quoteRemote(remoteDirectory);
  const chosen = await dialog.showOpenDialog(mainWindow!, { title: 'Upload file', properties: ['openFile'] }); if (chosen.canceled) return { canceled: true };
  const localPath = chosen.filePaths[0]; const remotePath = path.posix.join(remoteDirectory, path.basename(localPath)); const sftp = await getSftp(connectionId);
  await new Promise<void>((resolve, reject) => sftp.fastPut(localPath, remotePath, error => error ? reject(error) : resolve())); return { canceled: false, remotePath };
});
ipcMain.handle('sftp:download', async (_event, connectionId: string, remotePath: string) => {
  quoteRemote(remotePath);
  const chosen = await dialog.showSaveDialog(mainWindow!, { title: 'Download file', defaultPath: path.basename(remotePath) }); if (chosen.canceled || !chosen.filePath) return { canceled: true };
  const sftp = await getSftp(connectionId); await new Promise<void>((resolve, reject) => sftp.fastGet(remotePath, chosen.filePath!, error => error ? reject(error) : resolve())); return { canceled: false, localPath: chosen.filePath };
});
ipcMain.handle('scp:upload', async (_event, connectionId: string, remoteDirectory: string) => { const chosen = await dialog.showOpenDialog(mainWindow!, { title: 'Upload with SCP', properties: ['openFile'] }); if (chosen.canceled) return { canceled: true }; const remotePath = await scpUpload(connectionId, chosen.filePaths[0], remoteDirectory); return { canceled: false, remotePath }; });
ipcMain.handle('scp:download', async (_event, connectionId: string, remotePath: string) => { const chosen = await dialog.showSaveDialog(mainWindow!, { title: 'Download with SCP', defaultPath: path.basename(remotePath) }); if (chosen.canceled || !chosen.filePath) return { canceled: true }; await scpDownload(connectionId, remotePath, chosen.filePath); return { canceled: false, localPath: chosen.filePath }; });
