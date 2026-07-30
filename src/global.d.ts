import type { AppData, ConnectRequest, CredentialSet, CredentialSetInput, HostKeyPrompt, InventorySettings, PingSample, RepositoryFreshness, RepositoryInput, RepositoryMeta, RepositoryStatus, SftpEntry, SshEvent, SshKeyInfo, WikiPage } from './types';

declare global {
  interface Window { hedge: {
    loadData(): Promise<AppData>;
    saveData(data: AppData): Promise<AppData>;
    configureInventory(input: InventorySettings): Promise<InventorySettings>;
    readGitInventory(): Promise<string | null>;
    writeGitInventory(source: string): Promise<boolean>;
    resetLocalData(): Promise<boolean>;
    readClipboardText(): Promise<string>;
    writeClipboardText(value: string): Promise<boolean>;
    getRepository(): Promise<RepositoryMeta | null>;
    getRepositoryStatus(): Promise<RepositoryStatus>;
    getRepositoryFreshness(): Promise<RepositoryFreshness>;
    openLocalRepository(input: RepositoryInput): Promise<RepositoryMeta | null>;
    cloneRepository(input: RepositoryInput): Promise<RepositoryMeta | null>;
    updateRepository(input: RepositoryInput): Promise<RepositoryMeta>;
    commitRepository(message: string): Promise<{ oid: string | null; status: RepositoryStatus }>;
    pullRepository(): Promise<RepositoryStatus>;
    pushRepository(): Promise<RepositoryStatus>;
    listWikiPages(): Promise<WikiPage[]>;
    readWikiPage(path: string): Promise<string>;
    writeWikiPage(path: string, contents: string): Promise<boolean>;
    createWikiPage(section: 'general' | 'vendors', name: string): Promise<WikiPage>;
    ensureSessionWikiPage(sessionId: string, sessionName: string, host: string): Promise<WikiPage>;
    choosePrivateKey(): Promise<string | null>;
    listSshKeys(): Promise<SshKeyInfo[]>;
    generateSshKey(input: { name: string; comment: string; passphrase: string }): Promise<SshKeyInfo>;
    importSshKey(): Promise<SshKeyInfo | null>;
    copyPublicKey(privateKeyPath: string): Promise<boolean>;
    deleteSshKey(privateKeyPath: string): Promise<boolean>;
    installPublicKey(connectionId: string, privateKeyPath: string): Promise<boolean>;
    removePublicKey(connectionId: string, privateKeyPath: string): Promise<boolean>;
    getInstalledPublicKeys(connectionId: string): Promise<string[]>;
    connect(request: ConnectRequest): Promise<{ connectionId: string }>;
    write(connectionId: string, data: string): void;
    resize(connectionId: string, cols: number, rows: number): void;
    disconnect(connectionId: string): void;
    trustHost(connectionId: string, accept: boolean): void;
    clearKnownHost(host: string, port: number): Promise<boolean>;
    clearAllKnownHosts(): Promise<number>;
    listCredentialSets(): Promise<CredentialSet[]>;
    saveCredentialSet(input: CredentialSetInput): Promise<CredentialSet>;
    deleteCredentialSet(id: string): Promise<boolean>;
    onSshEvent(callback: (event: SshEvent) => void): () => void;
    onHostKey(callback: (prompt: HostKeyPrompt) => void): () => void;
    startPing(host: string, monitorId: string): Promise<{ monitorId: string }>;
    stopPing(monitorId: string): void;
    onPingSample(callback: (sample: PingSample) => void): () => void;
    listRemoteFiles(connectionId: string, path: string): Promise<SftpEntry[]>;
    uploadRemoteFile(connectionId: string, remoteDirectory: string): Promise<{ canceled: boolean; remotePath?: string }>;
    downloadRemoteFile(connectionId: string, remotePath: string): Promise<{ canceled: boolean; localPath?: string }>;
    uploadScpFile(connectionId: string, remoteDirectory: string): Promise<{ canceled: boolean; remotePath?: string }>;
    downloadScpFile(connectionId: string, remotePath: string): Promise<{ canceled: boolean; localPath?: string }>;
  }}
}
export {};
