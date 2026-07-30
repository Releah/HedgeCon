export type AuthMethod = 'password' | 'privateKey';

export interface Folder { id: string; name: string; parentId?: string | null; createdAt: string }
export interface Session {
  id: string; name: string; host: string; port: number; username: string;
  folderId: string | null; authMethod: AuthMethod; privateKeyPath?: string;
  credentialSetId?: string | null;
  createdAt: string; updatedAt: string;
}
export interface CredentialSet { id: string; name: string; username: string; authMethod: AuthMethod; privateKeyPath?: string; hasSecret: boolean }
export interface CredentialSetInput { id?: string; name: string; username: string; authMethod: AuthMethod; privateKeyPath?: string; secret?: string; clearSecret?: boolean }
export interface InventorySettings { configured: boolean; mode: 'local' | 'git'; repositoryPath?: string }
export interface AppData { folders: Folder[]; sessions: Session[]; inventorySettings?: InventorySettings }
export interface ConnectRequest extends Session { connectionId: string; password?: string; passphrase?: string; credentialOverride?: string }
export interface HostKeyPrompt { connectionId: string; host: string; fingerprint: string; changed: boolean }
export interface SshEvent { connectionId: string; type: 'data' | 'status' | 'error' | 'auth-error' | 'closed'; data: string }
export interface PingSample { monitorId: string; timestamp: number; reachable: boolean; latencyMs: number | null; error?: string }
export interface SftpEntry { name: string; path: string; type: 'directory' | 'file' | 'link' | 'other'; size: number; modifiedAt: number; permissions: number }
export interface SshKeyInfo { name: string; privateKeyPath: string; publicKey?: string; fingerprint?: string; source: 'managed' | 'discovered' }
export interface RepositoryMeta { localPath: string; remoteUrl?: string; branch: string; authorName: string; authorEmail: string; username?: string; hasToken: boolean }
export interface RepositoryInput { authorName: string; authorEmail: string; remoteUrl?: string; branch?: string; username?: string; token?: string; clearToken?: boolean }
export interface RepositoryStatus { repository: RepositoryMeta; changedFiles: Array<{ filepath: string; head: number; workdir: number; stage: number }>; lastCommit: { oid: string; message: string; author: string; timestamp: number } | null }
export interface RepositoryFreshness { state: 'local' | 'uninitialized' | 'current' | 'behind' | 'ahead' | 'diverged'; local?: string; remote?: string }
export interface WikiPage { path: string; title: string; section: 'general' | 'sessions' | 'vendors' }
export interface UpdateSettings { automaticChecks: boolean }
export interface UpdateStatus { status: 'unsupported' | 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'current' | 'error'; currentVersion: string; availableVersion?: string; progress?: number; releaseNotes?: string; message?: string; portable: boolean; activeConnections: number }
