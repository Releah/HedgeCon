export type AuthMethod = 'password' | 'privateKey';
export type ConnectionService = 'ssh' | 'web' | 'rdp' | 'vnc' | 'serial';
export type SessionPlatform = 'unspecified' | 'linux' | 'windows' | 'network';
export interface MacroFolder { id: string; name: string; parentId?: string | null; createdAt: string }
export interface CommandMacro { id: string; name: string; description?: string; command: string; runImmediately?: boolean; macroFolderId?: string | null; folderIds: string[]; platforms: SessionPlatform[]; createdAt: string; updatedAt: string }

export interface Folder { id: string; name: string; parentId?: string | null; createdAt: string }
export interface Session {
  id: string; name: string; host: string; port: number; username: string;
  folderId: string | null; authMethod: AuthMethod; privateKeyPath?: string;
  credentialSetId?: string | null; remoteCredentialSetId?: string | null; credentialProfile?: string; webUrl?: string; rdpPort?: number; vncPort?: number; serialPath?: string; serialBaudRate?: number; serialDataBits?: 5 | 6 | 7 | 8; serialStopBits?: 1 | 1.5 | 2; serialParity?: 'none' | 'even' | 'odd' | 'mark' | 'space'; services?: ConnectionService[];
  platform?: SessionPlatform;
  createdAt: string; updatedAt: string;
}
export interface CredentialSet { id: string; name: string; username: string; authMethod: AuthMethod; privateKeyPath?: string; hasSecret: boolean }
export interface CredentialSetInput { id?: string; name: string; username: string; authMethod: AuthMethod; privateKeyPath?: string; secret?: string; clearSecret?: boolean }
export interface InventorySettings { configured: boolean; mode: 'local' | 'git'; repositoryPath?: string }
export interface ColourMeaning { id: string; word: string; colour: string }
export interface TerminalPattern { id: string; name: string; pattern: string; colour: string; enabled: boolean }
export interface UiSettings { theme: 'midnight' | 'ocean' | 'ember'; browserTheme: 'normal' | 'dark'; linuxRdpClient: 'auto' | 'remmina' | 'freerdp'; remoteDesktopResolution: 'native' | '1920x1080' | '1600x900' | '1366x768' | '1280x720'; remoteDesktopFullscreen: boolean; terminalDefault: string; terminalForeground: string; terminalMeanings: ColourMeaning[]; terminalPatterns: TerminalPattern[] }
export interface AppData { folders: Folder[]; sessions: Session[]; macros?: CommandMacro[]; macroFolders?: MacroFolder[]; inventorySettings?: InventorySettings; uiSettings?: UiSettings; credentialProfileMappings?: Record<string, string> }
export interface ConnectRequest extends Session { connectionId: string; password?: string; passphrase?: string; credentialOverride?: string }
export interface HostKeyPrompt { connectionId: string; host: string; fingerprint: string; changed: boolean }
export interface SshEvent { connectionId: string; type: 'data' | 'status' | 'error' | 'auth-error' | 'closed'; data: string }
export interface SerialPortInfo { path: string; manufacturer?: string; serialNumber?: string; vendorId?: string; productId?: string }
export interface SerialEvent { connectionId: string; type: 'data' | 'status' | 'error' | 'closed'; data: string }
export interface PingSample { monitorId: string; timestamp: number; reachable: boolean; latencyMs: number | null; error?: string }
export interface BrowserEvent { tabId: string; type: 'loading' | 'navigation' | 'error'; data?: boolean | string | { url: string; title: string; canGoBack: boolean; canGoForward: boolean } }
export interface BrowserCertificatePrompt { tabId: string; host: string; error: string; fingerprint: string; subject: string; issuer: string; validExpiry: number }
export interface SftpEntry { name: string; path: string; type: 'directory' | 'file' | 'link' | 'other'; size: number; modifiedAt: number; permissions: number }
export interface SshKeyInfo { name: string; privateKeyPath: string; publicKey?: string; fingerprint?: string; source: 'managed' | 'discovered' }
export interface RepositoryMeta { localPath: string; remoteUrl?: string; branch: string; authorName: string; authorEmail: string; username?: string; hasToken: boolean }
export interface RepositoryInput { authorName: string; authorEmail: string; remoteUrl?: string; branch?: string; username?: string; token?: string; clearToken?: boolean }
export interface RepositoryStatus { repository: RepositoryMeta; changedFiles: Array<{ filepath: string; head: number; workdir: number; stage: number }>; lastCommit: { oid: string; message: string; author: string; timestamp: number } | null }
export interface RepositoryFreshness { state: 'local' | 'uninitialized' | 'current' | 'behind' | 'ahead' | 'diverged'; local?: string; remote?: string }
export interface GitConflict { path: string; base: string; ours: string; theirs: string; merged: string }
export type RepositoryPushResult = { outcome: 'pushed'; status: RepositoryStatus; sync: 'none' | 'fast-forward' | 'merged' } | { outcome: 'conflicts'; localOid: string; remoteOid: string; conflicts: GitConflict[] };
export interface WikiPage { path: string; title: string; section: 'general' | 'sessions' | 'vendors' | 'private' }
export interface WikiFolder { path: string; name: string; section: 'general' | 'vendors' | 'private' }
export interface UpdateSettings { automaticChecks: boolean; branch: 'main' | 'experimental' }
export interface SessionLogSettings { enabled: boolean; retentionDays: number; maxFileSizeMb: number; maxTotalSizeMb: number }
export interface UpdateRelease { tag: string; version: string; name: string; publishedAt: string; prerelease: boolean }
export interface UpdateStatus { status: 'unsupported' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'current' | 'error'; currentVersion: string; availableVersion?: string; progress?: number; releaseNotes?: string; message?: string; portable: boolean; activeConnections: number; downgrade?: boolean }
export interface SecureStorageStatus { available: boolean; secure: boolean; backend: string; message: string }
