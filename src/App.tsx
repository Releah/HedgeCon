import {
  FormEvent,
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  AppData,
  AuthMethod,
  ConnectionService,
  CredentialSet,
  CredentialSetInput,
  Folder,
  RepositoryInput,
  RepositoryMeta,
  SecureStorageStatus,
  Session,
  SessionLogSettings,
  SshKeyInfo,
  UiSettings,
  UpdateRelease,
  UpdateSettings,
  UpdateStatus,
} from "./types";
import TerminalView from "./TerminalView";
import WebDeviceView from "./WebDeviceView";
import ConfirmDialog from "./ConfirmDialog";
import MacroLibrary from "./MacroLibrary";
import SerialView from "./SerialView";
import { validTerminalPattern } from "./terminalPatterns";

const InventoryEditor = lazy(() => import("./InventoryEditor"));
const WikiWorkspace = lazy(() => import("./WikiWorkspace"));
const FirstRunSetup = lazy(() => import("./FirstRunSetup"));
const VncView = lazy(() => import("./VncView"));

const blankData: AppData = { folders: [], sessions: [] };
const defaultUiSettings: UiSettings = {
  theme: "midnight",
  browserTheme: "normal",
  linuxRdpClient: "auto",
  remoteDesktopResolution: "native",
  remoteDesktopFullscreen: false,
  terminalDefault: "#080c12",
  terminalForeground: "#d7e0ea",
  terminalMeanings: [
    { id: "critical", word: "Critical change", colour: "#351416" },
    { id: "protected", word: "Do not change", colour: "#101f3b" },
  ],
  terminalPatterns: [],
};
type SettingsSection =
  | "general"
  | "appearance"
  | "terminal"
  | "logging"
  | "credentials"
  | "keys"
  | "git"
  | "updates"
  | "privacy";
const id = () => crypto.randomUUID();
const sessionServices = (session: Session): ConnectionService[] =>
  session.services?.length
    ? session.services
    : [
        "ssh",
        ...(session.webUrl ? ["web" as const] : []),
        ...(session.rdpPort ? ["rdp" as const] : []),
        ...(session.vncPort ? ["vnc" as const] : []),
        ...(session.serialPath ? ["serial" as const] : []),
      ];
const hasService = (session: Session, service: ConnectionService) =>
  sessionServices(session).includes(service);

function CardAction({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={`card-action ${danger ? "danger" : ""}`}
      aria-label={label}
      data-tooltip={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}
const EditIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20h4l11-11-4-4L4 16v4Zm9.5-13.5 4 4" />
  </svg>
);
const CloneIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="8" y="8" width="11" height="11" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
);
const ForgetFingerprintIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 10a4 4 0 0 1 7-2.6M7 14c0 3-1 4-1 4m5-7a2 2 0 0 1 2 2c0 4-1 6-2 7m5-9c1 5-1 8-2 10M5 11a7 7 0 0 1 1.1-3.8M3 3l18 18" />
  </svg>
);
const DeleteIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
  </svg>
);
const flattenFolders = (
  folders: Folder[],
  parentId: string | null = null,
  depth = 0,
  seen = new Set<string>(),
): Array<{ folder: Folder; depth: number }> =>
  folders
    .filter((f) => (f.parentId ?? null) === parentId && !seen.has(f.id))
    .flatMap((folder) => {
      const nextSeen = new Set(seen).add(folder.id);
      return [
        { folder, depth },
        ...flattenFolders(folders, folder.id, depth + 1, nextSeen),
      ];
    });

function PrivateKeyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (privateKeyPath: string) => void;
}) {
  const [keys, setKeys] = useState<SshKeyInfo[]>([]);
  useEffect(() => {
    void window.hedge.listSshKeys().then(setKeys);
  }, []);
  const known = keys.some((key) => key.privateKeyPath === value);
  return (
    <div className="private-key-picker">
      <select
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choose a private key…</option>
        {value && !known && <option value={value}>{value}</option>}
        {keys.map((key) => (
          <option key={key.privateKeyPath} value={key.privateKeyPath}>
            {key.name} · {key.source}
            {key.fingerprint ? ` · ${key.fingerprint}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="secondary"
        onClick={async () => {
          const selected = await window.hedge.choosePrivateKey();
          if (selected) onChange(selected);
        }}
      >
        Browse elsewhere
      </button>
    </div>
  );
}

function SessionDialog({
  session,
  folders,
  credentials,
  credentialProfiles,
  onCancel,
  onSave,
}: {
  session?: Session;
  folders: Folder[];
  credentials: CredentialSet[];
  credentialProfiles: string[];
  onCancel: () => void;
  onSave: (s: Session) => void;
}) {
  const [cloning, setCloning] = useState(session?.id === "");
  const initialServices = session ? sessionServices(session) : ["ssh" as const];
  const [form, setForm] = useState({
    name: session?.name ?? "",
    host: session?.host ?? "",
    port: session?.port ?? 22,
    webUrl: session?.webUrl ?? "",
    rdpPort: session?.rdpPort ?? 0,
    vncPort: session?.vncPort ?? 0,
    serialPath: session?.serialPath ?? "",
    serialBaudRate: session?.serialBaudRate ?? 9600,
    serialDataBits: session?.serialDataBits ?? 8,
    serialStopBits: session?.serialStopBits ?? 1,
    serialParity: session?.serialParity ?? "none",
    username: session?.username ?? "",
    folderId: session?.folderId ?? "",
    credentialSetId: session?.credentialSetId ?? "",
    remoteCredentialSetId: session?.remoteCredentialSetId ?? "",
    credentialProfile: session?.credentialProfile ?? "",
    authMethod: session?.authMethod ?? ("password" as AuthMethod),
    privateKeyPath: session?.privateKeyPath ?? "",
    sshEnabled: initialServices.includes("ssh"),
    webEnabled: initialServices.includes("web"),
    rdpEnabled: initialServices.includes("rdp"),
    vncEnabled: initialServices.includes("vnc"),
    serialEnabled: initialServices.includes("serial"),
    platform: session?.platform ?? "unspecified",
  });
  const [serialPorts, setSerialPorts] = useState<Array<{ path: string; manufacturer?: string }>>([]);
  useEffect(() => { if (form.serialEnabled) void window.hedge.listSerialPorts().then(setSerialPorts).catch(() => setSerialPorts([])); }, [form.serialEnabled]);
  const hasSelectedService =
    form.sshEnabled || form.webEnabled || form.rdpEnabled || form.vncEnabled || form.serialEnabled;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const services: ConnectionService[] = [
      form.sshEnabled && "ssh",
      form.webEnabled && "web",
      form.rdpEnabled && "rdp",
      form.vncEnabled && "vnc",
      form.serialEnabled && "serial",
    ].filter((service): service is ConnectionService => Boolean(service));
    if (!services.length) return;
    const {
      sshEnabled: _sshEnabled,
      webEnabled: _webEnabled,
      rdpEnabled: _rdpEnabled,
      vncEnabled: _vncEnabled,
      serialEnabled: _serialEnabled,
      ...sessionForm
    } = form;
    const now = new Date().toISOString();
    onSave({
      id: session && !cloning ? session.id : id(),
      createdAt: session && !cloning ? session.createdAt : now,
      updatedAt: now,
      ...sessionForm,
      services,
      port: Number(form.port),
      webUrl: form.webEnabled ? form.webUrl.trim() || undefined : undefined,
      rdpPort: form.rdpEnabled ? form.rdpPort || 3389 : undefined,
      vncPort: form.vncEnabled ? form.vncPort || 5900 : undefined,
      serialPath: form.serialEnabled ? form.serialPath.trim() : undefined,
      folderId: form.folderId || null,
      credentialSetId: form.credentialSetId || null,
      remoteCredentialSetId: form.remoteCredentialSetId || null,
      credentialProfile: form.credentialProfile.trim() || undefined,
    });
  };
  return (
    <div className="overlay">
      <form className="dialog" onSubmit={submit}>
        <div className="dialog-title">
          <div>
            <small>CONNECTION</small>
            <h2>
              {session && !cloning
                ? "Edit session"
                : cloning
                  ? "Clone session"
                  : "New session"}
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={onCancel}>
            ×
          </button>
        </div>
        <label>
          Display name
          <input
            autoFocus
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Production API"
          />
        </label>
        <fieldset className="service-selector">
          <legend>Connection services</legend>
          {(
            [
              ["ssh", "SSH", "›_"],
              ["web", "Web", "🌐"],
              ["rdp", "RDP", "▣"],
              ["vnc", "VNC", "◉"],
              ["serial", "Serial", "⎇"],
            ] as const
          ).map(([service, label, icon]) => {
            const key = `${service}Enabled` as
              | "sshEnabled"
              | "webEnabled"
              | "rdpEnabled"
              | "vncEnabled"
              | "serialEnabled";
            return (
              <label key={service} className={form[key] ? "active" : ""}>
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      [key]: event.target.checked,
                      ...(service === "rdp" &&
                      event.target.checked &&
                      !form.rdpPort
                        ? { rdpPort: 3389 }
                        : {}),
                      ...(service === "vnc" &&
                      event.target.checked &&
                      !form.vncPort
                        ? { vncPort: 5900 }
                        : {}),
                    })
                  }
                />
                <span>{icon}</span>
                <strong>{label}</strong>
              </label>
            );
          })}
        </fieldset>
        <label>
          Session platform
          <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value as NonNullable<Session["platform"]> })}>
            <option value="unspecified">Unspecified</option>
            <option value="linux">Linux</option>
            <option value="windows">Windows</option>
            <option value="network">Network device</option>
          </select>
          <small className="field-note">Used to prioritise relevant command macros.</small>
        </label>
        <div className={form.sshEnabled ? "split" : "host-only-field"}>
          <label>
            Host
            <input
              required={form.sshEnabled || form.webEnabled || form.rdpEnabled || form.vncEnabled}
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="server.example.com"
            />
          </label>
          {form.sshEnabled && (
            <label className="port">
              Port
              <input
                required
                min="1"
                max="65535"
                type="number"
                value={form.port}
                onChange={(e) => setForm({ ...form, port: +e.target.value })}
              />
            </label>
          )}
        </div>
        {form.webEnabled && <label>
          Device web address
          <input
            required
            type="url"
            value={form.webUrl}
            onChange={(e) => setForm({ ...form, webUrl: e.target.value })}
            placeholder={`https://${form.host || "device.example.com"}`}
          />
        </label>}
        {(form.rdpEnabled || form.vncEnabled) && (
          <div
            className={`split remote-port-fields ${form.rdpEnabled !== form.vncEnabled ? "single" : ""}`}
          >
            {form.rdpEnabled && (
              <label>
                RDP port <em>optional</em>
                <input
                  type="number"
                  min="0"
                  max="65535"
                  value={form.rdpPort}
                  onChange={(e) =>
                    setForm({ ...form, rdpPort: +e.target.value })
                  }
                  placeholder="3389"
                />
              </label>
            )}
            {form.vncEnabled && (
              <label>
                VNC port <em>optional</em>
                <input
                  type="number"
                  min="0"
                  max="65535"
                  value={form.vncPort}
                  onChange={(e) =>
                    setForm({ ...form, vncPort: +e.target.value })
                  }
                  placeholder="5900"
                />
              </label>
            )}
          </div>
        )}
        {form.serialEnabled && <div className="serial-settings"><label>Serial port<select required value={form.serialPath} onChange={event => setForm({ ...form, serialPath: event.target.value })}><option value="">Select a serial port</option>{serialPorts.map(port => <option key={port.path} value={port.path}>{port.path}{port.manufacturer ? ` · ${port.manufacturer}` : ""}</option>)}</select><small className="field-note">Connect the adapter before opening this window, then reopen it to refresh the list.</small></label><label>Baud rate<select value={form.serialBaudRate} onChange={event => setForm({ ...form, serialBaudRate: Number(event.target.value) })}>{[300,1200,2400,4800,9600,19200,38400,57600,115200,230400,460800,921600].map(rate => <option key={rate} value={rate}>{rate}</option>)}</select></label><label>Data bits<select value={form.serialDataBits} onChange={event => setForm({ ...form, serialDataBits: Number(event.target.value) as 5 | 6 | 7 | 8 })}>{[5,6,7,8].map(bits => <option key={bits} value={bits}>{bits}</option>)}</select></label><label>Parity<select value={form.serialParity} onChange={event => setForm({ ...form, serialParity: event.target.value as NonNullable<Session["serialParity"]> })}>{["none","even","odd","mark","space"].map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>Stop bits<select value={form.serialStopBits} onChange={event => setForm({ ...form, serialStopBits: Number(event.target.value) as 1 | 1.5 | 2 })}>{[1,1.5,2].map(value => <option key={value} value={value}>{value}</option>)}</select></label></div>}
        {(form.rdpEnabled || form.vncEnabled) && (
          <label>
            Remote desktop credentials <em>optional</em>
            <select
              value={form.remoteCredentialSetId}
              onChange={(event) =>
                setForm({ ...form, remoteCredentialSetId: event.target.value })
              }
            >
              <option value="">Ask when connecting</option>
              {credentials
                .filter((credential) => credential.authMethod === "password")
                .map((credential) => (
                  <option key={credential.id} value={credential.id}>
                    {credential.name} ({credential.username})
                  </option>
                ))}
            </select>
            <small className="field-note">
              VNC can use the saved password. RDP prefills the username and lets
              the native client request the password securely.
            </small>
          </label>
        )}
        <label>
          Folder
          <select
            value={form.folderId}
            onChange={(e) => setForm({ ...form, folderId: e.target.value })}
          >
            <option value="">Unfiled</option>
            {flattenFolders(folders).map(({ folder, depth }) => (
              <option
                key={folder.id}
                value={folder.id}
              >{`${"— ".repeat(depth)}${folder.name}`}</option>
            ))}
          </select>
        </label>
        {form.sshEnabled && (
          <>
            <label>
              Credentials
              <select
                value={form.credentialSetId}
                onChange={(e) =>
                  setForm({ ...form, credentialSetId: e.target.value })
                }
              >
                <option value="">Session-specific credentials</option>
                {credentials.map((credential) => (
                  <option key={credential.id} value={credential.id}>
                    {credential.name} ({credential.username})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Shared credential profile <em>optional</em>
              <input
                list="shared-credential-profiles"
                pattern="[A-Za-z0-9._-]+"
                value={form.credentialProfile}
                onChange={(e) =>
                  setForm({
                    ...form,
                    credentialProfile: e.target.value.toLowerCase(),
                  })
                }
                placeholder="Choose existing or enter a new profile"
              />
              <datalist id="shared-credential-profiles">
                {credentialProfiles.map((profile) => (
                  <option key={profile} value={profile} />
                ))}
              </datalist>
            </label>
            {!form.credentialSetId && (
              <>
                <label>
                  Username
                  <input
                    required
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value })
                    }
                    placeholder="deploy"
                  />
                </label>
                <label>
                  Authentication
                  <select
                    value={form.authMethod}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        authMethod: e.target.value as AuthMethod,
                      })
                    }
                  >
                    <option value="password">
                      Password (ask when connecting)
                    </option>
                    <option value="privateKey">Private key</option>
                  </select>
                </label>
                {form.authMethod === "privateKey" && (
                  <label>
                    Private key
                    <PrivateKeyPicker
                      value={form.privateKeyPath}
                      onChange={(privateKeyPath) =>
                        setForm({ ...form, privateKeyPath })
                      }
                    />
                  </label>
                )}
              </>
            )}
          </>
        )}
        {!form.sshEnabled && form.rdpEnabled && (
          <label>
            RDP username <em>optional</em>
            <input
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
              placeholder="DOMAIN\\username"
            />
          </label>
        )}
        {form.sshEnabled && (
          <p className="hint">
            The shared profile is written to inventory YAML; usernames,
            passwords, and key paths stay local. Other users map the same
            profile to their own credential set.
          </p>
        )}
        {!hasSelectedService && (
          <p className="service-error">
            Choose at least one connection service.
          </p>
        )}
        <div className="actions">
          {session && !cloning && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setCloning(true);
                setForm((current) => ({
                  ...current,
                  name: `${current.name} copy`,
                }));
              }}
            >
              Clone session
            </button>
          )}
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            className="primary"
            disabled={!hasSelectedService}
          >
            {cloning ? "Create clone" : "Save session"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FolderDialog({
  folders,
  defaultParentId,
  onCancel,
  onSave,
}: {
  folders: Folder[];
  defaultParentId: string | null;
  onCancel: () => void;
  onSave: (name: string, parentId: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState(defaultParentId ?? "");
  return (
    <div className="overlay">
      <form
        className="dialog folder-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim(), parentId || null);
        }}
      >
        <div className="dialog-title">
          <div>
            <small>ORGANISE</small>
            <h2>New folder</h2>
          </div>
          <button type="button" className="icon-button" onClick={onCancel}>
            ×
          </button>
        </div>
        <label>
          Folder name
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="London datacentre"
          />
        </label>
        <label>
          Place inside
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">Top level</option>
            {flattenFolders(folders).map(({ folder, depth }) => (
              <option
                key={folder.id}
                value={folder.id}
              >{`${"— ".repeat(depth)}${folder.name}`}</option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Create folder
          </button>
        </div>
      </form>
    </div>
  );
}

function RenameFolderDialog({ folder, onCancel, onSave }: { folder: Folder; onCancel: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(folder.name);
  return <div className="overlay"><form className="dialog folder-dialog" onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSave(name.trim()); }}><div className="dialog-title"><div><small>ORGANISE</small><h2>Rename folder</h2></div><button type="button" className="icon-button" onClick={onCancel}>×</button></div><label>Folder name<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} /></label><div className="actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button type="submit" className="primary">Rename folder</button></div></form></div>;
}

function CredentialDialog({
  session,
  onCancel,
  onConnect,
}: {
  session: Session;
  onCancel: () => void;
  onConnect: (secret: string) => void;
}) {
  const [secret, setSecret] = useState("");
  const password = session.authMethod === "password";
  return (
    <div className="overlay">
      <form
        className="dialog folder-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConnect(secret);
        }}
      >
        <div className="dialog-title">
          <div>
            <small>AUTHENTICATION</small>
            <h2>Connect to {session.name}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onCancel}>
            ×
          </button>
        </div>
        <p className="connection-target">
          {session.username}@{session.host}:{session.port}
        </p>
        <label>
          {password ? "Password" : "Private key passphrase"}
          <input
            autoFocus
            required={password}
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder={
              password
                ? "Enter password"
                : "Leave blank if the key has no passphrase"
            }
          />
        </label>
        <p className="hint">
          This secret is used for this connection only and is not saved.
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary">
            Connect
          </button>
        </div>
      </form>
    </div>
  );
}

function CredentialSetEditor({
  credential,
  onCancel,
  onSave,
}: {
  credential?: CredentialSet;
  onCancel: () => void;
  onSave: (input: CredentialSetInput) => void;
}) {
  const [form, setForm] = useState({
    name: credential?.name ?? "",
    username: credential?.username ?? "",
    authMethod: credential?.authMethod ?? ("password" as AuthMethod),
    privateKeyPath: credential?.privateKeyPath ?? "",
    secret: "",
    clearSecret: false,
  });
  return (
    <div className="subdialog">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ id: credential?.id, ...form });
        }}
      >
        <h3>{credential ? "Edit credential set" : "New credential set"}</h3>
        <label>
          Name
          <input
            autoFocus
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Network administrators"
          />
        </label>
        <label>
          Username
          <input
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="netadmin"
          />
        </label>
        <label>
          Authentication
          <select
            value={form.authMethod}
            onChange={(e) =>
              setForm({ ...form, authMethod: e.target.value as AuthMethod })
            }
          >
            <option value="password">Password</option>
            <option value="privateKey">Private key</option>
          </select>
        </label>
        {form.authMethod === "privateKey" && (
          <label>
            Private key
            <PrivateKeyPicker
              value={form.privateKeyPath}
              onChange={(privateKeyPath) =>
                setForm({ ...form, privateKeyPath })
              }
            />
          </label>
        )}
        <label>
          {form.authMethod === "password"
            ? "Password (optional)"
            : "Passphrase (optional)"}
          <input
            type="password"
            value={form.secret}
            onChange={(e) =>
              setForm({ ...form, secret: e.target.value, clearSecret: false })
            }
            placeholder={
              credential?.hasSecret && !form.clearSecret
                ? "Leave blank to keep existing secret"
                : "Leave blank to save no secret"
            }
          />
        </label>
        {credential?.hasSecret && (
          <button
            type="button"
            className="remove-secret"
            onClick={() =>
              setForm({ ...form, secret: "", clearSecret: !form.clearSecret })
            }
          >
            {form.clearSecret
              ? "Keep existing saved secret"
              : "Remove existing saved secret"}
          </button>
        )}
        <p className="hint">
          Saved secrets are encrypted by the operating system and are never
          exposed to the HedgeCon interface.
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save credentials
          </button>
        </div>
      </form>
    </div>
  );
}

function SshKeyManager({ notify }: { notify: (message: string) => void }) {
  const [keys, setKeys] = useState<SshKeyInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<SshKeyInfo | null>(null);
  const [form, setForm] = useState({
    name: "id_hedgecon_rsa",
    comment: "",
    passphrase: "",
    confirm: "",
  });
  const refresh = () =>
    void window.hedge
      .listSshKeys()
      .then(setKeys)
      .catch((error) => notify(String(error)));
  useEffect(refresh, []);
  const generate = async (event: FormEvent) => {
    event.preventDefault();
    if (form.passphrase !== form.confirm)
      return notify("The key passphrases do not match.");
    try {
      const key = await window.hedge.generateSshKey(form);
      setCreating(false);
      setForm({
        name: "id_hedgecon_rsa",
        comment: "",
        passphrase: "",
        confirm: "",
      });
      setKeys((current) => [
        ...current.filter(
          (existing) => existing.privateKeyPath !== key.privateKeyPath,
        ),
        key,
      ]);
      notify(`Generated ${key.name}.`);
    } catch (error) {
      notify(String(error));
    }
  };
  const importKey = async () => {
    try {
      const key = await window.hedge.importSshKey();
      if (key) {
        refresh();
        notify(`Imported ${key.name}.`);
      }
    } catch (error) {
      notify(String(error));
    }
  };
  return (
    <div className="key-manager">
      <div className="credential-heading">
        <div>
          <h3>SSH keys</h3>
          <p>Generate, discover, import, and deploy public keys.</p>
        </div>
        <div className="key-heading-actions">
          <button className="secondary" onClick={importKey}>
            Import
          </button>
          <button className="secondary" onClick={() => setCreating(true)}>
            ＋ Generate key
          </button>
        </div>
      </div>
      {creating && (
        <form className="key-generator" onSubmit={generate}>
          <label>
            Key name
            <input
              autoFocus
              required
              pattern="[A-Za-z0-9._-]+"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </label>
          <label>
            Comment
            <input
              value={form.comment}
              onChange={(event) =>
                setForm({ ...form, comment: event.target.value })
              }
              placeholder="admin@example.com"
            />
          </label>
          <div className="split">
            <label>
              Passphrase (optional)
              <input
                type="password"
                value={form.passphrase}
                onChange={(event) =>
                  setForm({ ...form, passphrase: event.target.value })
                }
              />
            </label>
            <label>
              Confirm passphrase
              <input
                type="password"
                value={form.confirm}
                onChange={(event) =>
                  setForm({ ...form, confirm: event.target.value })
                }
              />
            </label>
          </div>
          <p className="hint">
            RSA-3072 PEM keys are generated locally for broad server and
            network-device compatibility. HedgeCon never stores this passphrase
            unless you later add it to a credential set.
          </p>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={() => setCreating(false)}
            >
              Cancel
            </button>
            <button className="primary">Generate RSA-3072 key</button>
          </div>
        </form>
      )}
      <div className="key-list">
        {keys.map((key) => (
          <div key={key.privateKeyPath}>
            <div>
              <strong>{key.name}</strong>
              <small>
                {key.fingerprint ?? "Public key file not found"} · {key.source}
              </small>
              <code>{key.privateKeyPath}</code>
            </div>
            <div className="key-row-actions">
              <button
                disabled={!key.publicKey}
                onClick={async () => {
                  try {
                    await window.hedge.copyPublicKey(key.privateKeyPath);
                    notify("Public key copied to the clipboard.");
                  } catch (error) {
                    notify(String(error));
                  }
                }}
              >
                Copy public key
              </button>
              {key.source === "managed" && (
                <button
                  className="delete-link"
                  onClick={() => setKeyToDelete(key)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {!keys.length && <p>No keys found in HedgeCon or your .ssh folder.</p>}
      </div>
      {keyToDelete && (
        <ConfirmDialog
          eyebrow="DELETE LOCAL KEY"
          title={`Delete “${keyToDelete.name}”?`}
          message="This permanently removes the private and public key files from HedgeCon. Sessions using this key will stop connecting, and remote copies are not removed automatically."
          confirmLabel="Delete key"
          danger
          onCancel={() => setKeyToDelete(null)}
          onConfirm={async () => {
            try {
              await window.hedge.deleteSshKey(keyToDelete.privateKeyPath);
              notify(`Deleted local key “${keyToDelete.name}”.`);
              setKeyToDelete(null);
              refresh();
            } catch (error) {
              notify(String(error));
            }
          }}
        />
      )}
    </div>
  );
}

function FeedbackDialog({ onClose, notify }: { onClose: () => void; notify: (message: string) => void }) {
  const [type, setType] = useState<'bug' | 'feature'>('bug'); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [steps, setSteps] = useState(''); const [expected, setExpected] = useState(''); const [actual, setActual] = useState(''); const [alternatives, setAlternatives] = useState(''); const [context, setContext] = useState(''); const [sanitized, setSanitized] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); if (type === 'bug' && !sanitized) return; setBusy(true); try { await window.hedge.openFeedbackIssue({ type, title, description, steps, expected, actual, alternatives, context }); notify('The report is ready in GitHub. Review it, then choose Submit new issue.'); onClose(); } catch (error) { notify(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); } };
  return <div className="overlay feedback-overlay"><form className="dialog feedback-dialog" onSubmit={event => void submit(event)}><div className="dialog-title"><div><small>HELP IMPROVE HEDGECON</small><h2>Report a bug or request a feature</h2><p>HedgeCon will prepare a GitHub issue for you to review before submission.</p></div><button type="button" className="icon-button" onClick={onClose}>×</button></div><div className="feedback-type"><button type="button" className={type === 'bug' ? 'active' : ''} onClick={() => setType('bug')}><span>!</span><strong>Bug report</strong><small>Something is not working</small></button><button type="button" className={type === 'feature' ? 'active' : ''} onClick={() => setType('feature')}><span>＋</span><strong>Feature request</strong><small>Suggest an improvement</small></button></div><label>Short title<input autoFocus required maxLength={180} value={title} onChange={event => setTitle(event.target.value)} placeholder={type === 'bug' ? 'Terminal reconnects when switching tabs' : 'Add support for…'} /></label><label>{type === 'bug' ? 'What went wrong?' : 'Problem or limitation'}<textarea required maxLength={10000} value={description} onChange={event => setDescription(event.target.value)} placeholder={type === 'bug' ? 'Describe what happened and what you were doing.' : 'Describe the workflow that is difficult today and who it affects.'} /></label>{type === 'bug' ? <><label>Steps to reproduce<textarea value={steps} onChange={event => setSteps(event.target.value)} placeholder={'1. Open…\n2. Select…\n3. Observe…'} /></label><div className="feedback-split"><label>Expected behaviour<textarea value={expected} onChange={event => setExpected(event.target.value)} /></label><label>Actual behaviour<textarea value={actual} onChange={event => setActual(event.target.value)} /></label></div></> : <><label>Proposed solution<textarea value={expected} onChange={event => setExpected(event.target.value)} placeholder="How would you like HedgeCon to handle it?" /></label><label>Alternatives considered<textarea value={alternatives} onChange={event => setAlternatives(event.target.value)} placeholder="How do you handle this today?" /></label></>}<label>Additional context <em>optional</em><textarea value={context} onChange={event => setContext(event.target.value)} placeholder="Device type, platform, examples, or related issues. Do not include credentials or production infrastructure details." /></label>{type === 'bug' && <label className="feedback-check"><input type="checkbox" checked={sanitized} onChange={event => setSanitized(event.target.checked)} /><span>I removed passwords, keys, tokens, hostnames, IP addresses, usernames, and other sensitive information.</span></label>}<div className="feedback-warning"><strong>Before GitHub opens</strong><p>Your app version, operating system, architecture, and installation type will be added automatically. No logs, sessions, notes, or credentials are collected.</p></div><div className="actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={busy || !title.trim() || !description.trim() || (type === 'bug' && !sanitized)}>{busy ? 'Opening GitHub…' : 'Review on GitHub'}</button></div></form></div>;
}

function UpdateManager({ notify }: { notify: (message: string) => void }) {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [settings, setSettings] = useState<UpdateSettings>({
    automaticChecks: true,
    branch: "main",
  });
  const [confirmInstall, setConfirmInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [olderReleases, setOlderReleases] = useState<UpdateRelease[] | null>(null);
  const [selectedRelease, setSelectedRelease] = useState("");
  useEffect(() => {
    const unsubscribe = window.hedge.onUpdateStatus(setStatus);
    void Promise.all([
      window.hedge.getUpdateStatus(),
      window.hedge.getUpdateSettings(),
    ])
      .then(([nextStatus, nextSettings]) => {
        setStatus(nextStatus);
        setSettings(nextSettings);
      })
      .catch((error) =>
        notify(error instanceof Error ? error.message : String(error)),
      );
    return unsubscribe;
  }, []);
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  const check = () => run(() => window.hedge.checkForUpdates());
  const loadOlderReleases = () => run(async () => { const releases = await window.hedge.listUpdateReleases(); setOlderReleases(releases); setSelectedRelease(releases[0]?.tag ?? ""); });
  const prepareDowngrade = () => run(async () => { if (!selectedRelease) return; await window.hedge.selectUpdateRelease(selectedRelease); });
  const download = () => run(() => window.hedge.downloadUpdate());
  const requestInstall = () =>
    run(async () => {
      const latest = await window.hedge.getUpdateStatus();
      setStatus(latest);
      if (latest.activeConnections || latest.downgrade) setConfirmInstall(true);
      else await window.hedge.installUpdate();
    });
  const statusText = !status
    ? "Loading update information…"
    : status.status === "unsupported"
      ? status.message
      : status.status === "checking"
        ? "Checking GitHub Releases…"
        : status.status === "available"
          ? `Version ${status.availableVersion} is available${status.downgrade ? " as a downgrade" : ""}.`
          : status.status === "downloading"
            ? `Downloading ${status.availableVersion ?? "update"}… ${Math.round(status.progress ?? 0)}%`
            : status.status === "downloaded"
              ? `Version ${status.availableVersion} is ready to install.`
              : status.status === "current"
                ? "HedgeCon is up to date."
                : status.status === "error"
                  ? status.message
                  : "Ready to check for updates.";
  return (
    <div className="update-manager">
      <div className="credential-heading">
        <div>
          <h3>Application updates</h3>
          <p>
            Installed version {status?.currentVersion ?? "…"} · Updates from
            Releah/HedgeCon
          </p>
        </div>
        <span className={`update-state state-${status?.status ?? "idle"}`}>
          {status?.status ?? "loading"}
        </span>
      </div>
      <div className="update-card">
        <div>
          <strong>{statusText}</strong>
          {status?.releaseNotes && (
            <details open>
              <summary>What changed</summary>
              <pre>{status.releaseNotes}</pre>
            </details>
          )}
          {status?.status === "downloading" && (
            <div className="update-progress">
              <span style={{ width: `${status.progress ?? 0}%` }} />
            </div>
          )}
        </div>
        <div className="update-actions">
          {status?.portable && (
            <button
              className="secondary"
              onClick={() => void window.hedge.openLatestRelease()}
            >
              Open GitHub Release
            </button>
          )}
          {!status?.portable && (
            <button
              className="secondary"
              disabled={
                busy ||
                status?.status === "checking" ||
                status?.status === "downloading"
              }
              onClick={() => void check()}
            >
              Check now
            </button>
          )}
          {status?.status === "available" && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void download()}
            >
              {status.downgrade ? "Download downgrade" : "Download update"}
            </button>
          )}
          {status?.status === "downloaded" && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void requestInstall()}
            >
              {status.downgrade ? "Restart and downgrade" : "Restart and install"}
            </button>
          )}
        </div>
      </div>
      <label className="update-branch">
        Update branch
        <select
          value={settings.branch}
          onChange={(event) => {
            const next = {
              ...settings,
              branch: event.target.value as UpdateSettings["branch"],
            };
            setSettings(next);
            setOlderReleases(null);
            setSelectedRelease("");
            void run(() => window.hedge.setUpdateSettings(next));
          }}
        >
          <option value="main">Main — stable releases</option>
          <option value="experimental">Experimental — prerelease builds</option>
        </select>
        <small>
          Experimental builds may contain unfinished or breaking changes.
        </small>
      </label>
      {!status?.portable && (
        <section className="update-downgrade">
          <div>
            <strong>Install an older version</strong>
            <p>Choose a previous {settings.branch === "main" ? "stable" : "experimental"} release built for this platform. Your saved data is kept, but older clients may not understand settings introduced by newer versions.</p>
          </div>
          {olderReleases === null ? (
            <button className="secondary" disabled={busy} onClick={() => void loadOlderReleases()}>Show older versions</button>
          ) : olderReleases.length ? (
            <div className="downgrade-picker">
              <select value={selectedRelease} onChange={event => setSelectedRelease(event.target.value)} disabled={busy}>
                {olderReleases.map(release => <option key={release.tag} value={release.tag}>v{release.version} · {release.publishedAt ? new Date(release.publishedAt).toLocaleDateString() : release.name}</option>)}
              </select>
              <button className="secondary danger-outline" disabled={busy || !selectedRelease} onClick={() => void prepareDowngrade()}>Prepare downgrade</button>
            </div>
          ) : <p className="downgrade-empty">No compatible older releases were found for this branch and platform.</p>}
        </section>
      )}
      <label className="update-toggle">
        <input
          type="checkbox"
          checked={settings.automaticChecks}
          onChange={(event) => {
            const next = { ...settings, automaticChecks: event.target.checked };
            setSettings(next);
            void run(() => window.hedge.setUpdateSettings(next));
          }}
        />
        <span>Automatically check for updates after HedgeCon starts</span>
      </label>
      {confirmInstall && (
        <ConfirmDialog
          eyebrow="APPLICATION UPDATE"
          title={status?.downgrade ? `Downgrade HedgeCon to ${status.availableVersion}?` : "Restart HedgeCon and install the update?"}
          message={status?.downgrade ? `HedgeCon will restart on an older version. Saved data is retained, but settings or data created by newer features may not be understood by version ${status.availableVersion}. ${status.activeConnections ? `This will also close ${status.activeConnections} active connection${status.activeConnections === 1 ? "" : "s"}.` : ""}` : `This will close ${status?.activeConnections ?? 0} active connection${status?.activeConnections === 1 ? "" : "s"}. The update has already downloaded and your saved sessions and settings will be kept.`}
          confirmLabel={status?.downgrade ? "Downgrade and restart" : "Close sessions and install"}
          danger={Boolean(status?.downgrade)}
          onCancel={() => setConfirmInstall(false)}
          onConfirm={() => void window.hedge.installUpdate()}
        />
      )}
    </div>
  );
}

function GitRepositorySettings({
  notify,
}: {
  notify: (message: string) => void;
}) {
  const [repository, setRepository] = useState<
    RepositoryMeta | null | undefined
  >();
  const [form, setForm] = useState<RepositoryInput>({
    authorName: "",
    authorEmail: "",
    remoteUrl: "",
    username: "",
    token: "",
  });
  const [clearToken, setClearToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  useEffect(() => {
    void window.hedge
      .getRepository()
      .then((value) => {
        setRepository(value);
        if (value)
          setForm({
            authorName: value.authorName,
            authorEmail: value.authorEmail,
            remoteUrl: value.remoteUrl ?? "",
            branch: value.branch,
            username: value.username ?? "",
            token: "",
          });
      })
      .catch((error) =>
        notify(error instanceof Error ? error.message : String(error)),
      );
  }, []);
  if (repository === undefined)
    return (
      <div className="settings-state">Loading Git repository settings…</div>
    );
  if (!repository)
    return (
      <div className="settings-empty">
        <span>⌁</span>
        <h3>No Git repository configured</h3>
        <p>
          Open the Wiki to create or clone a repository. Once configured, its
          connection and authentication settings can be maintained here.
        </p>
      </div>
    );
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await window.hedge.updateRepository({
        ...form,
        clearToken,
      });
      setRepository(updated);
      setForm((current) => ({ ...current, token: "" }));
      setClearToken(false);
      notify("Git repository settings updated.");
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };
  const testConnection = async () => {
    setTesting(true);
    setConnectionMessage(null);
    try {
      const updated = await window.hedge.updateRepository({
        ...form,
        clearToken,
      });
      setRepository(updated);
      const result = await window.hedge.testRepositoryConnection();
      setForm((current) => ({ ...current, token: "" }));
      setClearToken(false);
      setConnectionMessage({
        kind: "success",
        text: result.branchFound
          ? `Connected successfully. The ${result.branch} branch is available on the server.`
          : `Connected successfully, but the ${result.branch} branch does not exist on the server yet.`,
      });
    } catch (error) {
      setConnectionMessage({
        kind: "error",
        text: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setTesting(false);
    }
  };
  return (
    <form className="git-settings" onSubmit={save}>
      <div className="settings-page-heading">
        <small>VERSIONED WORKSPACE</small>
        <h3>Git repository</h3>
        <p>
          Change the remote and credentials used by the Wiki and Git-managed
          inventory.
        </p>
      </div>
      <label>
        Local repository
        <input readOnly value={repository.localPath} />
      </label>
      <div className="split">
        <label>
          Branch
          <input readOnly value={repository.branch} />
        </label>
        <label>
          Remote username
          <input
            value={form.username ?? ""}
            onChange={(event) =>
              setForm({ ...form, username: event.target.value })
            }
            placeholder="Git username"
          />
        </label>
      </div>
      <label>
        Remote HTTPS URL
        <input
          value={form.remoteUrl ?? ""}
          onChange={(event) =>
            setForm({ ...form, remoteUrl: event.target.value })
          }
          placeholder="https://github.com/owner/repository.git"
        />
      </label>
      <div className="split">
        <label>
          Commit author
          <input
            required
            value={form.authorName}
            onChange={(event) =>
              setForm({ ...form, authorName: event.target.value })
            }
          />
        </label>
        <label>
          Author email
          <input
            required
            type="email"
            value={form.authorEmail}
            onChange={(event) =>
              setForm({ ...form, authorEmail: event.target.value })
            }
          />
        </label>
      </div>
      <label>
        New access token <em>optional</em>
        <input
          type="password"
          value={form.token ?? ""}
          onChange={(event) => {
            setForm({ ...form, token: event.target.value });
            setClearToken(false);
          }}
          placeholder={
            repository.hasToken && !clearToken
              ? "Leave blank to keep the encrypted token"
              : "No token will be saved"
          }
        />
      </label>
      {repository.hasToken && (
        <label className="update-toggle">
          <input
            type="checkbox"
            checked={clearToken}
            onChange={(event) => {
              setClearToken(event.target.checked);
              if (event.target.checked) setForm({ ...form, token: "" });
            }}
          />
          <span>Remove the currently saved access token</span>
        </label>
      )}
      {connectionMessage && (
        <p className={`git-connection-message ${connectionMessage.kind}`}>
          {connectionMessage.text}
        </p>
      )}
      <p className="hint">
        Tokens are encrypted by the operating system and are never written to
        the repository. Saving a remote URL updates the repository's{" "}
        <code>origin</code>.
      </p>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          disabled={saving || testing || !form.remoteUrl}
          onClick={() => void testConnection()}
        >
          {testing ? "Testing server..." : "Save & test connection"}
        </button>
        <button className="primary" disabled={saving || testing}>
          {saving ? "Saving…" : "Save Git settings"}
        </button>
      </div>
    </form>
  );
}

function CredentialProfileMappings({
  sessions,
  credentials,
  mappings,
  onMap,
}: {
  sessions: Session[];
  credentials: CredentialSet[];
  mappings: Record<string, string>;
  onMap: (profile: string, credentialSetId: string | null) => void;
}) {
  const profiles = [
    ...new Set(
      sessions
        .map((session) => session.credentialProfile)
        .filter((profile): profile is string => Boolean(profile)),
    ),
  ].sort((a, b) => a.localeCompare(b));
  if (!profiles.length)
    return (
      <div className="credential-profile-mappings">
        <h3>Shared credential profiles</h3>
        <p>
          No shared profiles are required by the current inventory. Add a
          profile such as <code>network-admin</code> to a session before
          publishing it.
        </p>
      </div>
    );
  return (
    <div className="credential-profile-mappings">
      <h3>Shared credential profiles</h3>
      <p>
        These mappings stay on this computer. Only the profile names are stored
        in inventory YAML.
      </p>
      {profiles.map((profile) => {
        const mappedId =
          mappings[profile] ??
          sessions.find((session) => session.credentialProfile === profile)
            ?.credentialSetId ??
          "";
        const mapped = credentials.some(
          (credential) => credential.id === mappedId,
        );
        return (
          <label key={profile} className={mapped ? "" : "unresolved"}>
            <span>
              <strong>{profile}</strong>
              <small>
                {
                  sessions.filter(
                    (session) => session.credentialProfile === profile,
                  ).length
                }{" "}
                session(s){mapped ? "" : " · mapping required"}
              </small>
            </span>
            <select
              value={mapped ? mappedId : ""}
              onChange={(event) => onMap(profile, event.target.value || null)}
            >
              <option value="">Choose local credentials...</option>
              {credentials.map((credential) => (
                <option key={credential.id} value={credential.id}>
                  {credential.name} ({credential.username})
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function SessionLoggingSettings({ notify }: { notify: (message: string) => void }) {
  const [settings, setSettings] = useState<SessionLogSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void window.hedge.getSessionLogSettings().then(setSettings).catch(error => notify(error instanceof Error ? error.message : String(error))); }, []);
  if (!settings) return <div className="settings-state">Loading session log settings...</div>;
  const save = async () => { setSaving(true); try { setSettings(await window.hedge.setSessionLogSettings(settings)); notify(settings.enabled ? "Session logging enabled." : "Session logging disabled."); } catch (error) { notify(error instanceof Error ? error.message : String(error)); } finally { setSaving(false); } };
  return <><div className="settings-page-heading"><small>SESSION LOGGING</small><h3>Terminal transcripts</h3><p>Optionally retain SSH terminal output in rolling local log files.</p></div><label className="update-toggle session-logging-toggle"><input type="checkbox" checked={settings.enabled} onChange={event => setSettings({ ...settings, enabled: event.target.checked })} /><span><strong>Record SSH session output</strong><small>Newly connected sessions are logged after authentication. Existing sessions are unaffected until they reconnect.</small></span></label><div className={`session-log-limits ${settings.enabled ? "" : "disabled"}`}><label>Keep logs for<input type="number" min="1" max="3650" value={settings.retentionDays} onChange={event => setSettings({ ...settings, retentionDays: Number(event.target.value) })} /><small>days</small></label><label>Roll each file at<input type="number" min="1" max="1000" value={settings.maxFileSizeMb} onChange={event => setSettings({ ...settings, maxFileSizeMb: Number(event.target.value) })} /><small>MB</small></label><label>Maximum log storage<input type="number" min="10" max="10000" value={settings.maxTotalSizeMb} onChange={event => setSettings({ ...settings, maxTotalSizeMb: Number(event.target.value) })} /><small>MB</small></label></div><div className="session-log-warning"><strong>Logs are plaintext</strong><p>Terminal output may contain commands, host details, configuration data, or secrets printed by remote programs. HedgeCon does not separately record keystrokes, passwords, or private-key contents.</p></div><div className="session-log-actions"><button className="secondary" onClick={() => void window.hedge.openSessionLogFolder().catch(error => notify(error instanceof Error ? error.message : String(error)))}>Open logs folder</button><button className="primary" disabled={saving} onClick={() => void save()}>{saving ? "Saving..." : "Save logging settings"}</button></div></>;
}

function SettingsDialog({
  credentials,
  sessions,
  credentialProfileMappings,
  onMapCredentialProfile,
  folders,
  onDeleteFolder,
  uiSettings,
  onUiSettings,
  onSaveCredential,
  onDeleteCredential,
  initialSection = (sessionStorage.getItem(
    "hedgecon-settings-section",
  ) as SettingsSection | null) ?? "general",
  onClose,
  notify,
}: {
  credentials: CredentialSet[];
  sessions: Session[];
  credentialProfileMappings: Record<string, string>;
  onMapCredentialProfile: (
    profile: string,
    credentialSetId: string | null,
  ) => void;
  folders: Folder[];
  onDeleteFolder: (folder: Folder) => void;
  uiSettings: UiSettings;
  onUiSettings: (settings: UiSettings) => void;
  onSaveCredential: (input: CredentialSetInput) => Promise<void>;
  onDeleteCredential: (id: string) => Promise<void>;
  initialSection?: SettingsSection;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const [editingCredential, setEditingCredential] = useState<
    CredentialSet | null | undefined
  >();
  const [secureStorage, setSecureStorage] =
    useState<SecureStorageStatus | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [section, setSection] = useState<SettingsSection>(initialSection);
  useEffect(() => {
    sessionStorage.removeItem("hedgecon-settings-section");
  }, []);
  const clearKeys = async () => {
    const count = await window.hedge.clearAllKnownHosts();
    notify(
      count
        ? `Cleared ${count} stored host key${count === 1 ? "" : "s"}.`
        : "There are no stored host keys to clear.",
    );
  };
  useEffect(() => {
    void window.hedge
      .getSecureStorageStatus()
      .then(setSecureStorage)
      .catch((error) =>
        notify(error instanceof Error ? error.message : String(error)),
      );
  }, []);
  return (
    <div className="overlay">
      <section className="dialog settings-dialog">
        <div className="settings-main">
          <div className="dialog-title">
            <div>
              <small>HEDGECON</small>
              <h2>Settings</h2>
            </div>
            <button type="button" className="icon-button" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="settings-content">
            {section === "general" && (
              <>
                <div className="settings-page-heading">
                  <small>APPLICATION</small>
                  <h3>General</h3>
                  <p>Local application behaviour and trusted SSH hosts.</p>
                </div>
                <div className="settings-section">
                  <div>
                    <h3>SSH host verification</h3>
                    <p>
                      Trusted fingerprints are stored locally and checked
                      whenever HedgeCon connects.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => void clearKeys()}
                  >
                    Clear all host keys
                  </button>
                </div>
              </>
            )}
            {section === "general" && folders.length > 0 && (
              <div className="folder-settings">
                <h3>Session folders</h3>
                <p>
                  Deleting a folder moves its sessions and child folders up one
                  level.
                </p>
                {folders.map((folder) => (
                  <div key={folder.id}>
                    <span>{folder.name}</span>
                    <button
                      className="delete-link"
                      onClick={() => onDeleteFolder(folder)}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
            {section === "appearance" && (
              <>
                <div className="settings-page-heading">
                  <small>APPEARANCE</small>
                  <h3>Theme</h3>
                  <p>Choose the colour character used throughout HedgeCon.</p>
                </div>
                <div className="theme-options">
                  {(["midnight", "ocean", "ember"] as const).map((theme) => (
                    <button
                      key={theme}
                      className={uiSettings.theme === theme ? "active" : ""}
                      onClick={() => onUiSettings({ ...uiSettings, theme })}
                    >
                      <span className={`theme-swatch ${theme}`} />
                      <strong>{theme[0].toUpperCase() + theme.slice(1)}</strong>
                    </button>
                  ))}
                </div>
                <div className="settings-section browser-theme-setting">
                  <div>
                    <h3>Device browser dark mode</h3>
                    <p>
                      Ask compatible device pages to use their dark colour
                      scheme. Older device interfaces may remain light.
                    </p>
                  </div>
                  <select
                    value={uiSettings.browserTheme}
                    onChange={(event) =>
                      onUiSettings({
                        ...uiSettings,
                        browserTheme: event.target
                          .value as UiSettings["browserTheme"],
                      })
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div className="settings-section browser-theme-setting">
                  <div>
                    <h3>Linux RDP client</h3>
                    <p>
                      Choose the native client HedgeCon should prefer. Automatic
                      uses Remmina first, then FreeRDP.
                    </p>
                  </div>
                  <select
                    value={uiSettings.linuxRdpClient}
                    onChange={(event) =>
                      onUiSettings({
                        ...uiSettings,
                        linuxRdpClient: event.target
                          .value as UiSettings["linuxRdpClient"],
                      })
                    }
                  >
                    <option value="auto">Automatic</option>
                    <option value="remmina">Remmina</option>
                    <option value="freerdp">FreeRDP</option>
                  </select>
                </div>
                <div className="settings-section remote-display-setting">
                  <div>
                    <h3>Remote desktop resolution</h3>
                    <p>
                      Default display size requested when opening RDP. VNC
                      continues to scale to its available workspace.
                    </p>
                  </div>
                  <select
                    value={uiSettings.remoteDesktopResolution}
                    onChange={(event) =>
                      onUiSettings({
                        ...uiSettings,
                        remoteDesktopResolution: event.target
                          .value as UiSettings["remoteDesktopResolution"],
                      })
                    }
                  >
                    <option value="native">Use available display</option>
                    <option value="1920x1080">1920 × 1080</option>
                    <option value="1600x900">1600 × 900</option>
                    <option value="1366x768">1366 × 768</option>
                    <option value="1280x720">1280 × 720</option>
                  </select>
                </div>
                <label className="update-toggle remote-fullscreen-toggle">
                  <input
                    type="checkbox"
                    checked={uiSettings.remoteDesktopFullscreen}
                    onChange={(event) =>
                      onUiSettings({
                        ...uiSettings,
                        remoteDesktopFullscreen: event.target.checked,
                      })
                    }
                  />
                  <span>
                    Open remote desktop connections full screen by default
                  </span>
                </label>
              </>
            )}
            {section === "terminal" && (
              <>
                <div className="settings-page-heading">
                  <small>CLI COLOURS</small>
                  <h3>Terminal colours</h3>
                  <p>
                    Choose the terminal text colour and map operational meanings
                    to background colours.
                  </p>
                </div>
                <label className="colour-setting">
                  Terminal text colour
                  <input
                    type="color"
                    value={uiSettings.terminalForeground}
                    onChange={(event) =>
                      onUiSettings({
                        ...uiSettings,
                        terminalForeground: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="colour-setting">
                  Default background colour
                  <input
                    type="color"
                    value={uiSettings.terminalDefault}
                    onChange={(event) =>
                      onUiSettings({
                        ...uiSettings,
                        terminalDefault: event.target.value,
                      })
                    }
                  />
                </label>
                <div className="colour-meanings">
                  {uiSettings.terminalMeanings.map((meaning, index) => (
                    <div key={meaning.id}>
                      <input
                        value={meaning.word}
                        aria-label="Meaning"
                        onChange={(event) =>
                          onUiSettings({
                            ...uiSettings,
                            terminalMeanings: uiSettings.terminalMeanings.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, word: event.target.value }
                                  : item,
                            ),
                          })
                        }
                      />
                      <input
                        type="color"
                        value={meaning.colour}
                        aria-label={`${meaning.word} colour`}
                        onChange={(event) =>
                          onUiSettings({
                            ...uiSettings,
                            terminalMeanings: uiSettings.terminalMeanings.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, colour: event.target.value }
                                  : item,
                            ),
                          })
                        }
                      />
                      <button
                        className="delete-link"
                        onClick={() =>
                          onUiSettings({
                            ...uiSettings,
                            terminalMeanings:
                              uiSettings.terminalMeanings.filter(
                                (item) => item.id !== meaning.id,
                              ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="secondary"
                  onClick={() =>
                    onUiSettings({
                      ...uiSettings,
                      terminalMeanings: [
                        ...uiSettings.terminalMeanings,
                        { id: id(), word: "New meaning", colour: "#263849" },
                      ],
                    })
                  }
                >
                  ＋ Add meaning
                </button>
                <div className="terminal-pattern-heading"><div><h3>Regex text highlighting</h3><p>Colour matching terminal text in SSH and serial sessions. Expressions are case-insensitive and global.</p></div><button className="secondary" onClick={() => onUiSettings({ ...uiSettings, terminalPatterns: [...(uiSettings.terminalPatterns || []), { id: id(), name: "New pattern", pattern: "", colour: "#ffcc66", enabled: true }] })}>＋ Add pattern</button></div>
                <div className="terminal-patterns">{(uiSettings.terminalPatterns || []).map((rule, index) => <div key={rule.id} className={rule.pattern && !validTerminalPattern(rule.pattern) ? "invalid" : ""}><label className="pattern-enabled"><input type="checkbox" checked={rule.enabled} onChange={event => onUiSettings({ ...uiSettings, terminalPatterns: uiSettings.terminalPatterns.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item) })} /></label><input value={rule.name} aria-label="Pattern name" placeholder="Errors" onChange={event => onUiSettings({ ...uiSettings, terminalPatterns: uiSettings.terminalPatterns.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) })} /><input className="pattern-expression" value={rule.pattern} aria-label={`${rule.name} regular expression`} placeholder="error|failed|denied" onChange={event => onUiSettings({ ...uiSettings, terminalPatterns: uiSettings.terminalPatterns.map((item, itemIndex) => itemIndex === index ? { ...item, pattern: event.target.value.slice(0, 256) } : item) })} /><input type="color" value={rule.colour} aria-label={`${rule.name} colour`} onChange={event => onUiSettings({ ...uiSettings, terminalPatterns: uiSettings.terminalPatterns.map((item, itemIndex) => itemIndex === index ? { ...item, colour: event.target.value } : item) })} /><button className="delete-link" onClick={() => onUiSettings({ ...uiSettings, terminalPatterns: uiSettings.terminalPatterns.filter(item => item.id !== rule.id) })}>Remove</button>{rule.pattern && !validTerminalPattern(rule.pattern) && <small>Enter a valid regular expression (maximum 256 characters).</small>}</div>)}</div>
              </>
            )}
            {section === "credentials" && (
              <>
                <div className="credential-heading">
                  <div>
                    <h3>Credential sets</h3>
                    <p>Update one set to update every linked session.</p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => setEditingCredential(null)}
                  >
                    ＋ Add credentials
                  </button>
                </div>
                <div className="credential-list">
                  {credentials.map((credential) => (
                    <div key={credential.id}>
                      <div>
                        <strong>{credential.name}</strong>
                        <small>
                          {credential.username} ·{" "}
                          {credential.authMethod === "privateKey"
                            ? "Private key"
                            : "Password"}
                        </small>
                      </div>
                      <button onClick={() => setEditingCredential(credential)}>
                        Edit
                      </button>
                      <button
                        className="delete-link"
                        onClick={() => void onDeleteCredential(credential.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {!credentials.length && <p>No reusable credentials yet.</p>}
                </div>
                <CredentialProfileMappings
                  sessions={sessions}
                  credentials={credentials}
                  mappings={credentialProfileMappings}
                  onMap={onMapCredentialProfile}
                />
              </>
            )}
            {section === "keys" && <SshKeyManager notify={notify} />}
            {section === "logging" && <SessionLoggingSettings notify={notify} />}
            {section === "git" && <GitRepositorySettings notify={notify} />}
            {section === "updates" && <UpdateManager notify={notify} />}
            {section === "privacy" && (
              <>
                <div className="settings-page-heading">
                  <small>LOCAL DATA</small>
                  <h3>Privacy and reset</h3>
                  <p>Control data stored by HedgeCon on this computer.</p>
                </div>
                {secureStorage && (
                  <div
                    className={`settings-section ${secureStorage.secure ? "" : "reset-section"}`}
                  >
                    <div>
                      <h3>
                        Secret storage:{" "}
                        {secureStorage.secure ? "protected" : "unavailable"}
                      </h3>
                      <p>
                        {secureStorage.message} Backend:{" "}
                        <code>{secureStorage.backend}</code>.
                      </p>
                    </div>
                  </div>
                )}
                <div className="settings-section reset-section">
                  <div>
                    <h3>Reset local HedgeCon data</h3>
                    <p>
                      Remove sessions, folders, credential secrets, trusted
                      hosts, Git settings, and HedgeCon-managed SSH keys from
                      this computer.
                    </p>
                  </div>
                  <button
                    className="danger-button"
                    onClick={() => setConfirmReset(true)}
                  >
                    Reset all local data
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="actions">
            <button className="primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
        <nav className="settings-tabs" aria-label="Settings sections">
          <button
            className={section === "general" ? "active" : ""}
            onClick={() => setSection("general")}
          >
            <span>⌘</span>General
          </button>
          <button
            className={section === "appearance" ? "active" : ""}
            onClick={() => setSection("appearance")}
          >
            <span>◐</span>Themes
          </button>
          <button
            className={section === "terminal" ? "active" : ""}
            onClick={() => setSection("terminal")}
          >
            <span>▣</span>CLI colours
          </button>
          <button
            className={section === "credentials" ? "active" : ""}
            onClick={() => setSection("credentials")}
          >
            <span>◉</span>Credentials
          </button>
          <button
            className={section === "keys" ? "active" : ""}
            onClick={() => setSection("keys")}
          >
            <span>⌁</span>SSH keys
          </button>
          <button
            className={section === "logging" ? "active" : ""}
            onClick={() => setSection("logging")}
          >
            <span>≡</span>Session logs
          </button>
          <button
            className={section === "git" ? "active" : ""}
            onClick={() => setSection("git")}
          >
            <span>⑂</span>Git
          </button>
          <button
            className={section === "updates" ? "active" : ""}
            onClick={() => setSection("updates")}
          >
            <span>↓</span>Updates
          </button>
          <button
            className={section === "privacy" ? "active" : ""}
            onClick={() => setSection("privacy")}
          >
            <span>◇</span>Privacy
          </button>
        </nav>
        {editingCredential !== undefined && (
          <CredentialSetEditor
            credential={editingCredential ?? undefined}
            onCancel={() => setEditingCredential(undefined)}
            onSave={(input) =>
              void onSaveCredential(input).then(() =>
                setEditingCredential(undefined),
              )
            }
          />
        )}
        {confirmReset && (
          <ConfirmDialog
            eyebrow="PRIVACY RESET"
            title="Erase all local HedgeCon data?"
            message="This permanently removes every saved session and folder, credential secret, known-host fingerprint, Git repository setting/token, and SSH key generated or imported into HedgeCon. External Wiki repositories and keys in your normal .ssh folder are not deleted. HedgeCon will restart empty."
            confirmLabel="Erase data and restart"
            danger
            busy={resetting}
            onCancel={() => setConfirmReset(false)}
            onConfirm={async () => {
              setResetting(true);
              try {
                await window.hedge.resetLocalData();
              } catch (error) {
                setResetting(false);
                notify(error instanceof Error ? error.message : String(error));
              }
            }}
          />
        )}
      </section>
    </div>
  );
}

function SessionPicker({
  sessions,
  onCancel,
  onSelect,
  onCreate,
}: {
  sessions: Session[];
  onCancel: () => void;
  onSelect: (session: Session) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const matches = sessions.filter((s) =>
    `${s.name} ${s.host} ${s.username}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="overlay">
      <section className="dialog picker-dialog">
        <div className="dialog-title">
          <div>
            <small>NEW TAB</small>
            <h2>Open a session</h2>
          </div>
          <button className="icon-button" onClick={onCancel}>
            ×
          </button>
        </div>
        <button className="picker-create" onClick={onCreate}>
          ＋ Create a new session
        </button>
        <div className="picker-divider">
          <span>OR CHOOSE A SAVED SESSION</span>
        </div>
        <input
          autoFocus
          className="picker-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saved sessions…"
        />
        <div className="picker-list">
          {matches.map((session) => (
            <button key={session.id} onClick={() => onSelect(session)}>
              <span className="server-icon">›_</span>
              <div>
                <strong>{session.name}</strong>
                <small>
                  {session.username || "Credential set"}@{session.host}:
                  {session.port}
                </small>
              </div>
              <em>Connect ↗</em>
            </button>
          ))}
          {!matches.length && <p>No matching sessions.</p>}
        </div>
      </section>
    </div>
  );
}

type WorkspaceTab =
  | { id: string; session: Session; kind: "ssh"; secret: string }
  | { id: string; session: Session; kind: "web" }
  | { id: string; session: Session; kind: "vnc" }
  | { id: string; session: Session; kind: "serial" };

export default function App() {
  const [data, setData] = useState<AppData>(blankData);
  const [ready, setReady] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<
    string | "all" | "unfiled"
  >("all");
  const [sessionSearch, setSessionSearch] = useState("");
  const [editing, setEditing] = useState<Session | null | undefined>();
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<
    "single" | "horizontal" | "vertical"
  >("single");
  const [secondaryTabId, setSecondaryTabId] = useState<string | null>(null);
  const [additionalPaneIds, setAdditionalPaneIds] = useState<string[]>([]);
  const [focusedPane, setFocusedPane] = useState(0);
  const [dropEdge, setDropEdge] = useState<
    "left" | "right" | "top" | "bottom" | null
  >(null);
  const [paneSizes, setPaneSizes] = useState<number[]>([1]);
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
  const [folderCreationParent, setFolderCreationParent] = useState<Folder | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folder: Folder;
    x: number;
    y: number;
  } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(),
  );
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [wikiSessionId, setWikiSessionId] = useState<
    string | null | undefined
  >();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [credentials, setCredentials] = useState<CredentialSet[]>([]);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [sessionSidebarWidth, setSessionSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem("hedgecon-session-sidebar-width"));
    return Number.isFinite(saved) && saved >= 190 && saved <= 420 ? saved : 250;
  });
  useEffect(() => {
    Promise.all([
      window.hedge.loadData(),
      window.hedge.listCredentialSets(),
    ]).then(([d, savedCredentials]) => {
      setData(d);
      setCredentials(savedCredentials);
      setReady(true);
    });
  }, []);
  useEffect(() => {
    const unsubscribe = window.hedge.onUpdateStatus(setUpdateStatus);
    void window.hedge.getUpdateStatus().then(setUpdateStatus);
    return unsubscribe;
  }, []);
  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>("main > aside");
    if (!sidebar) return;
    const visible =
      updateStatus?.status === "current" ||
      updateStatus?.status === "available" ||
      updateStatus?.status === "downloaded" ||
      updateStatus?.status === "downloading";
    if (!visible) return;
    const button = document.createElement("button");
    button.className = `sidebar-update state-${updateStatus.status}`;
    button.type = "button";
    button.setAttribute(
      "aria-label",
      updateStatus.status === "current"
        ? "HedgeCon is up to date"
        : updateStatus.status === "downloaded"
          ? "Update ready to install"
          : "Application update available",
    );
    button.title =
      updateStatus.status === "current"
        ? "HedgeCon is up to date"
        : updateStatus.status === "downloading"
          ? `Downloading update ${Math.round(updateStatus.progress ?? 0)}%`
          : updateStatus.status === "downloaded"
            ? "Update ready"
            : `HedgeCon ${updateStatus.availableVersion ?? ""} is available`;
    button.onclick = () => {
      sessionStorage.setItem("hedgecon-settings-section", "updates");
      setSettingsOpen(true);
    };
    sidebar.appendChild(button);
    return () => button.remove();
  }, [ready, updateStatus]);
  useEffect(() => {
    const openNotes = (event: Event) =>
      setWikiSessionId((event as CustomEvent<string>).detail);
    window.addEventListener("hedgecon:session-notes", openNotes);
    return () =>
      window.removeEventListener("hedgecon:session-notes", openNotes);
  }, []);
  useEffect(() => {
    if (tabs.length && activeTabId === null) setPickerOpen(true);
  }, [tabs.length, activeTabId]);
  const uiSettings: UiSettings = data.uiSettings
    ? { ...defaultUiSettings, ...data.uiSettings }
    : defaultUiSettings;
  useEffect(() => {
    document.documentElement.dataset.theme = uiSettings.theme;
    localStorage.setItem("hedgecon-ui-settings", JSON.stringify(uiSettings));
    window.dispatchEvent(
      new CustomEvent("hedgecon:ui-settings", { detail: uiSettings }),
    );
  }, [uiSettings]);
  const persist = (next: AppData) => {
    setData(next);
    void window.hedge.saveData(next);
  };
  const credentialProfiles = useMemo(
    () =>
      [
        ...new Set([
          ...data.sessions
            .map((session) => session.credentialProfile)
            .filter((profile): profile is string => Boolean(profile)),
          ...Object.keys(data.credentialProfileMappings ?? {}),
        ]),
      ].sort((a, b) => a.localeCompare(b)),
    [data.sessions, data.credentialProfileMappings],
  );
  const visible = useMemo(
    () =>
      data.sessions.filter(
        (s) =>
          (selectedFolder === "all" ||
            (selectedFolder === "unfiled"
              ? !s.folderId
              : s.folderId === selectedFolder)) &&
          (selectedFolder !== "all" ||
            `${s.name} ${s.host} ${s.username}`
              .toLowerCase()
              .includes(sessionSearch.toLowerCase())),
      ),
    [data, selectedFolder, sessionSearch],
  );
  const connect = async (session: Session) => {
    if (session.credentialProfile && !session.credentialSetId) {
      sessionStorage.setItem("hedgecon-settings-section", "credentials");
      setSettingsOpen(true);
      return notify(
        `Map the “${session.credentialProfile}” credential profile before connecting.`,
      );
    }
    if (!session.credentialSetId) return setPendingSession(session);
    const credential = credentials.find(
      (item) => item.id === session.credentialSetId,
    );
    if (!credential)
      return notify(
        "Credential set not found. Edit the session and choose another credential set.",
      );
    const resolvedSession = {
      ...session,
      username: credential.username,
      authMethod: credential.authMethod,
      privateKeyPath: credential.privateKeyPath,
    };
    if (credential.authMethod === "password" && !credential.hasSecret)
      return setPendingSession(resolvedSession);
    openTab(resolvedSession, "");
  };
  const addFolder = (name: string, parentId: string | null) => {
    persist({
      ...data,
      folders: [
        ...data.folders,
        { id: id(), name, parentId, createdAt: new Date().toISOString() },
      ],
    });
    if (parentId)
      setCollapsedFolders((current) => {
        const next = new Set(current);
        next.delete(parentId);
        return next;
      });
    setCreatingFolder(false);
  };
  const deleteFolder = (folder: Folder) => {
    const parentId = folder.parentId ?? null;
    const now = new Date().toISOString();
    persist({
      ...data,
      folders: data.folders
        .filter((item) => item.id !== folder.id)
        .map((item) =>
          item.parentId === folder.id ? { ...item, parentId } : item,
        ),
      sessions: data.sessions.map((session) =>
        session.folderId === folder.id
          ? {
              ...session,
              folderId: parentId,
              updatedAt: now,
            }
          : session,
      ),
    });
    setCollapsedFolders((current) => {
      const next = new Set(current);
      next.delete(folder.id);
      return next;
    });
    setSelectedFolder(parentId ?? "all");
    setFolderToDelete(null);
  };
  const renameFolder = (folder: Folder, name: string) => {
    persist({ ...data, folders: data.folders.map((item) => item.id === folder.id ? { ...item, name } : item) });
    setFolderToRename(null);
  };
  useEffect(() => {
    if (!folderContextMenu) return;
    const close = () => setFolderContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [folderContextMenu]);
  const moveSession = (sessionId: string, folderId: string | null) => {
    if (!sessionId) return;
    const now = new Date().toISOString();
    persist({
      ...data,
      sessions: data.sessions.map((s) =>
        s.id === sessionId ? { ...s, folderId, updatedAt: now } : s,
      ),
    });
    setDragOver(null);
  };
  const remove = (session: Session) => setSessionToDelete(session);
  const forgetHostKey = async (session: Session) => {
    const removed = await window.hedge.clearKnownHost(
      session.host,
      session.port,
    );
    setNotice(
      removed
        ? `Forgot the saved host key for ${session.host}:${session.port}.`
        : `No saved host key exists for ${session.host}:${session.port}.`,
    );
    window.setTimeout(() => setNotice(""), 3500);
  };
  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };
  const saveCredential = async (input: CredentialSetInput) => {
    const saved = await window.hedge.saveCredentialSet(input);
    setCredentials((current) => [
      ...current.filter((item) => item.id !== saved.id),
      saved,
    ]);
    notify(`Saved credential set “${saved.name}”.`);
  };
  const mapCredentialProfile = (
    profile: string,
    credentialSetId: string | null,
  ) => {
    const mappings = { ...(data.credentialProfileMappings ?? {}) };
    if (credentialSetId) mappings[profile] = credentialSetId;
    else delete mappings[profile];
    persist({
      ...data,
      credentialProfileMappings: mappings,
      sessions: data.sessions.map((session) =>
        session.credentialProfile === profile
          ? { ...session, credentialSetId }
          : session,
      ),
    });
    notify(
      credentialSetId
        ? `Mapped “${profile}” to local credentials.`
        : `Removed the local mapping for “${profile}”.`,
    );
  };
  const deleteCredential = async (credentialId: string) => {
    await window.hedge.deleteCredentialSet(credentialId);
    setCredentials((current) =>
      current.filter((item) => item.id !== credentialId),
    );
    const mappings = Object.fromEntries(
      Object.entries(data.credentialProfileMappings ?? {}).filter(
        ([, mappedId]) => mappedId !== credentialId,
      ),
    );
    persist({
      ...data,
      credentialProfileMappings: mappings,
      sessions: data.sessions.map((session) =>
        session.credentialSetId === credentialId ||
        session.remoteCredentialSetId === credentialId
          ? {
              ...session,
              credentialSetId:
                session.credentialSetId === credentialId
                  ? null
                  : session.credentialSetId,
              remoteCredentialSetId:
                session.remoteCredentialSetId === credentialId
                  ? null
                  : session.remoteCredentialSetId,
            }
          : session,
      ),
    });
    notify(
      "Credential set deleted; linked profiles now require a new local mapping.",
    );
  };
  const showTab = (tab: WorkspaceTab) => {
    setTabs((current) => [...current, tab]);
    if (splitMode === "single") setActiveTabId(tab.id);
    else {
      applyPaneIds([...paneIds, tab.id], splitMode);
      setFocusedPane(paneIds.length);
    }
    setPendingSession(null);
    setLibraryOpen(false);
  };
  const openTab = (session: Session, secret: string) =>
    showTab({ id: id(), session, kind: "ssh", secret });
  const openWebTab = (session: Session) => {
    if (!session.webUrl)
      return notify("Add a web address to this session first.");
    showTab({ id: id(), session, kind: "web" });
  };
  const openVncTab = (session: Session) => {
    if (!session.vncPort)
      return notify("Add a VNC port to this session first.");
    showTab({ id: id(), session, kind: "vnc" });
  };
  const openSerialTab = (session: Session) => { if (!session.serialPath) return notify("Select a serial port for this session first."); showTab({ id: id(), session, kind: "serial" }); };
  const openRdp = async (session: Session) => {
    if (!session.rdpPort)
      return notify("Add an RDP port to this session first.");
    const remoteCredential = credentials.find(
      (credential) => credential.id === session.remoteCredentialSetId,
    );
    try {
      const result = await window.hedge.openRemoteDesktop(
        "rdp",
        session.host,
        session.rdpPort,
        remoteCredential?.username || session.username,
        uiSettings.linuxRdpClient,
        {
          resolution: uiSettings.remoteDesktopResolution,
          fullscreen: uiSettings.remoteDesktopFullscreen,
        },
      );
      notify(
        result.installed
          ? `${result.client} was installed. Select RDP again to connect.`
          : `${result.client} opened for ${session.name}.`,
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error));
    }
  };
  const openPreferredService = (session: Session) => {
    if (hasService(session, "ssh")) return void connect(session);
    if (hasService(session, "web")) return void openWebTab(session);
    if (hasService(session, "rdp")) return void openRdp(session);
    if (hasService(session, "vnc")) return void openVncTab(session);
    if (hasService(session, "serial")) openSerialTab(session);
  };
  const paneIds = [activeTabId, secondaryTabId, ...additionalPaneIds].filter(
    (value, index, all): value is string =>
      Boolean(value) && all.indexOf(value) === index,
  );
  useEffect(() => {
    setPaneSizes(Array.from({ length: Math.max(paneIds.length, 1) }, () => 1));
  }, [paneIds.length, splitMode]);
  const applyPaneIds = (ids: string[], direction = splitMode) => {
    const unique = [...new Set(ids)];
    setActiveTabId(unique[0] ?? null);
    setSecondaryTabId(unique[1] ?? null);
    setAdditionalPaneIds(unique.slice(2));
    setSplitMode(
      unique.length > 1
        ? direction === "single"
          ? "vertical"
          : direction
        : "single",
    );
    setFocusedPane(Math.min(focusedPane, Math.max(unique.length - 1, 0)));
  };
  const closeTab = (tabId: string) => {
    setTabs((current) => {
      const next = current.filter((tab) => tab.id !== tabId);
      const remainingPanes = paneIds.filter((id) => id !== tabId);
      if (remainingPanes.length) applyPaneIds(remainingPanes);
      else {
        const replacement = next[0]?.id;
        applyPaneIds(replacement ? [replacement] : []);
      }
      return next;
    });
  };
  const closePane = (tabId: string) =>
    applyPaneIds(paneIds.filter((id) => id !== tabId));
  const selectTab = (tabId: string) => {
    if (paneIds.length <= 1) return applyPaneIds([tabId], "single");
    const next = [...paneIds];
    const existing = next.indexOf(tabId);
    if (existing >= 0) {
      setFocusedPane(existing);
      return;
    }
    next[Math.min(focusedPane, next.length - 1)] = tabId;
    applyPaneIds(next);
  };
  const setSplit = (mode: "horizontal" | "vertical") => {
    if (splitMode === mode && paneIds.length > 1)
      return applyPaneIds(
        [paneIds[Math.min(focusedPane, paneIds.length - 1)]],
        "single",
      );
    const second = tabs.find((tab) => !paneIds.includes(tab.id));
    if (paneIds.length < 2 && !second) {
      notify("Open a second session before splitting the workspace.");
      setPickerOpen(true);
      return;
    }
    applyPaneIds(
      paneIds.length < 2 && second ? [...paneIds, second.id] : paneIds,
      mode,
    );
    setFocusedPane(Math.min(1, Math.max(paneIds.length, 1)));
  };
  const snapTab = (
    tabId: string,
    edge: "left" | "right" | "top" | "bottom",
  ) => {
    const direction =
      edge === "left" || edge === "right" ? "vertical" : "horizontal";
    const remaining = paneIds.filter((id) => id !== tabId);
    const next =
      edge === "left" || edge === "top"
        ? [tabId, ...remaining]
        : [...remaining, tabId];
    applyPaneIds(next, direction);
    setFocusedPane(next.indexOf(tabId));
    setDropEdge(null);
  };
  useLayoutEffect(() => {
    const container = document.querySelector<HTMLElement>(".terminal-pages");
    if (!container) return;
    container
      .querySelectorAll(".pane-divider")
      .forEach((element) => element.remove());
    if (libraryOpen || splitMode === "single" || paneIds.length < 2) return;
    const totalUnits = paneSizes.reduce((sum, size) => sum + size, 0);
    const template = paneSizes.map((size) => `${size}fr`).join(" ");
    if (splitMode === "vertical")
      container.style.gridTemplateColumns = template;
    else container.style.gridTemplateRows = template;
    paneSizes.slice(0, -1).forEach((_size, dividerIndex) => {
      const divider = document.createElement("div");
      divider.className = `pane-divider divider-${splitMode}`;
      const offset =
        (paneSizes
          .slice(0, dividerIndex + 1)
          .reduce((sum, size) => sum + size, 0) /
          totalUnits) *
        100;
      if (splitMode === "vertical") divider.style.left = `${offset}%`;
      else divider.style.top = `${offset}%`;
      divider.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const rect = container.getBoundingClientRect();
        const startPosition =
          splitMode === "vertical" ? event.clientX : event.clientY;
        const totalPixels = splitMode === "vertical" ? rect.width : rect.height;
        const startingSizes = [...paneSizes];
        const combined =
          startingSizes[dividerIndex] + startingSizes[dividerIndex + 1];
        const minimum = Math.min(
          combined / 2,
          Math.max(
            totalUnits * 0.08,
            (totalUnits * 140) / Math.max(totalPixels, 1),
          ),
        );
        const move = (pointer: PointerEvent) => {
          const position =
            splitMode === "vertical" ? pointer.clientX : pointer.clientY;
          const delta =
            ((position - startPosition) / Math.max(totalPixels, 1)) *
            totalUnits;
          const first = Math.max(
            minimum,
            Math.min(combined - minimum, startingSizes[dividerIndex] + delta),
          );
          setPaneSizes((current) =>
            current.map((size, index) =>
              index === dividerIndex
                ? first
                : index === dividerIndex + 1
                  ? combined - first
                  : size,
            ),
          );
        };
        const finish = () => {
          window.removeEventListener("pointermove", move);
          document.body.classList.remove("resizing-panes");
        };
        document.body.classList.add("resizing-panes");
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", finish, { once: true });
      });
      container.appendChild(divider);
    });
    return () => {
      container
        .querySelectorAll(".pane-divider")
        .forEach((element) => element.remove());
    };
  }, [paneIds.length, paneSizes, splitMode, libraryOpen]);
  const renderFolderTree = (
    parentId: string | null = null,
    depth = 0,
    seen = new Set<string>(),
  ): JSX.Element[] =>
    data.folders
      .filter((f) => (f.parentId ?? null) === parentId && !seen.has(f.id))
      .flatMap((folder) => {
        const nextSeen = new Set(seen).add(folder.id);
        const hasChildren = data.folders.some(
          (candidate) => (candidate.parentId ?? null) === folder.id,
        );
        const collapsed = hasChildren && collapsedFolders.has(folder.id);
        const row = (
          <button
            key={folder.id}
            style={{ paddingLeft: `${10 + depth * 16}px` }}
            className={`${selectedFolder === folder.id ? "active " : ""}${dragOver === folder.id ? "drop-target" : ""}`}
            aria-expanded={hasChildren ? !collapsed : undefined}
            title={
              hasChildren
                ? `${collapsed ? "Expand" : "Collapse"} ${folder.name}`
                : folder.name
            }
            onClick={() => {
              setFolderContextMenu(null);
              setSelectedFolder(folder.id);
              setLibraryOpen(true);
              if (hasChildren)
                setCollapsedFolders((current) => {
                  const next = new Set(current);
                  if (next.has(folder.id)) next.delete(folder.id);
                  else next.add(folder.id);
                  return next;
                });
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setFolderContextMenu({
                folder,
                x: Math.min(event.clientX, window.innerWidth - 170),
                y: Math.min(event.clientY, window.innerHeight - 70),
              });
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(folder.id);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              moveSession(e.dataTransfer.getData("text/session-id"), folder.id);
            }}
          >
            {" "}
            <span
              className={`folder-toggle ${hasChildren ? "parent" : "leaf"}`}
            >
              {hasChildren ? (collapsed ? "▸" : "▾") : "▰"}
            </span>
            <span className="folder-name" title={folder.name}>
              {folder.name}
            </span>
          </button>
        );
        return [
          row,
          ...(collapsed
            ? []
            : renderFolderTree(folder.id, depth + 1, nextSeen)),
        ];
      });
  if (!ready) return <div className="loading">Loading HedgeCon…</div>;
  if (!data.inventorySettings?.configured)
    return (
      <Suspense
        fallback={<div className="loading">Preparing workspace setup...</div>}
      >
        <FirstRunSetup
          data={data}
          credentials={credentials}
          onComplete={(next) => {
            setData(next);
            void window.hedge.saveData(next);
          }}
        />
      </Suspense>
    );
  if (inventoryOpen)
    return (
      <Suspense
        fallback={<div className="loading">Loading inventory editor…</div>}
      >
        <InventoryEditor
          data={data}
          credentials={credentials}
          onApply={persist}
          onClose={() => setInventoryOpen(false)}
        />
      </Suspense>
    );
  return (
    <main
      style={
        {
          "--session-sidebar-width": `${sessionSidebarWidth}px`,
        } as CSSProperties
      }
    >
      <aside>
        <div className="brand">
          <img src="./hedgecon-logo.png" alt="" />
          <div>
            HedgeCon<small>CONNECTIVITY CONSOLE</small>
          </div>
        </div>
        <button className="new-session" onClick={() => setEditing(null)}>
          ＋ New session
        </button>
        <nav>
          <div className="nav-heading">LIBRARY</div>
          <button
            className={selectedFolder === "all" ? "active" : ""}
            onClick={() => {
              setSelectedFolder("all");
              setLibraryOpen(true);
            }}
          >
            ⌘ <span>All sessions</span>
            <em>{data.sessions.length}</em>
          </button>
          <button
            className={`${selectedFolder === "unfiled" ? "active " : ""}${dragOver === "unfiled" ? "drop-target" : ""}`}
            onClick={() => {
              setSelectedFolder("unfiled");
              setLibraryOpen(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver("unfiled");
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              moveSession(e.dataTransfer.getData("text/session-id"), null);
            }}
          >
            ◇ <span>Unfiled</span>
            <em>{data.sessions.filter((s) => !s.folderId).length}</em>
          </button>
          <div className="nav-heading folders">FOLDERS</div>
          <button
            className="new-folder"
            onClick={() => setCreatingFolder(true)}
          >
            ＋ <span>New folder</span>
          </button>
          {renderFolderTree()}
        </nav>
        <button
          className="settings-button inventory-button"
          onClick={() => setCommandsOpen(true)}
        >
          ›_ <span>Commands</span>
        </button>
        <button
          className="settings-button inventory-button"
          onClick={() => setWikiSessionId(null)}
        >
          ▤ <span>Wiki</span>
        </button>
        <button
          className="settings-button inventory-button"
          onClick={() => setInventoryOpen(true)}
        >
          ⌘ <span>Inventory YAML</span>
        </button>
        <button
          className="settings-button"
          onClick={() => setSettingsOpen(true)}
        >
          ⚙ <span>Settings</span>
        </button>
        <button className="sidebar-feedback" aria-label="Report a bug or request a feature" title="Feedback" onClick={() => setFeedbackOpen(true)}>?</button>
      </aside>
      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} notify={setNotice} />}
      <div
        className="session-sidebar-resizer"
        role="separator"
        aria-label="Resize session library"
        aria-orientation="vertical"
        onPointerDown={(event) => {
          event.preventDefault();
          const startX = event.clientX;
          const startWidth = sessionSidebarWidth;
          const move = (pointer: PointerEvent) => {
            setSessionSidebarWidth(
              Math.max(190, Math.min(420, startWidth + pointer.clientX - startX)),
            );
          };
          const finish = (pointer: PointerEvent) => {
            const width = Math.max(
              190,
              Math.min(420, startWidth + pointer.clientX - startX),
            );
            setSessionSidebarWidth(width);
            localStorage.setItem("hedgecon-session-sidebar-width", String(width));
            window.removeEventListener("pointermove", move);
            document.body.classList.remove("resizing-session-sidebar");
          };
          document.body.classList.add("resizing-session-sidebar");
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", finish, { once: true });
        }}
      />
      <div className="workspace">
        {(!tabs.length || libraryOpen) && selectedFolder === "all" && (
          <div className="session-search-toolbar">
            <input
              autoFocus={false}
              value={sessionSearch}
              onChange={(event) => setSessionSearch(event.target.value)}
              placeholder="⌕  Search sessions…"
            />
            <span>
              {visible.length} of {data.sessions.length}
            </span>
            {sessionSearch && (
              <button
                onClick={() => setSessionSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        )}
        {tabs.length && (
          <section className={`tab-workspace ${libraryOpen ? "workspace-hidden" : ""}`}>
            <div className="session-tabs">
              {tabs.map((tab) => {
                const paneIndex = paneIds.indexOf(tab.id);
                return (
                  <div
                    key={tab.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData(
                        "application/x-hedgecon-tab",
                        tab.id,
                      );
                    }}
                    className={`session-tab ${paneIndex === 0 ? "active" : ""} ${paneIndex > 0 ? "secondary-active" : ""} ${tab.kind === "web" ? "web-tab" : tab.kind === "vnc" ? "vnc-tab" : ""}`}
                    onClick={() => selectTab(tab.id)}
                  >
                    <span className="status-dot" />
                    <div>
                      <strong>{tab.session.name}</strong>
                      <small>
                        {tab.kind === "web"
                          ? tab.session.webUrl
                          : tab.kind === "vnc"
                            ? `VNC · ${tab.session.host}:${tab.session.vncPort}`
                            : tab.kind === "serial"
                              ? `${tab.session.serialPath} · ${tab.session.serialBaudRate || 9600}`
                            : `${tab.session.username}@${tab.session.host}`}
                      </small>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        closeTab(tab.id);
                      }}
                      aria-label={`Close ${tab.session.name}`}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button
                className="tab-library"
                onClick={() => setActiveTabId(null)}
                title="Open another session"
              >
                ＋
              </button>
              <div className="split-controls">
                <button
                  className={splitMode === "vertical" ? "active" : ""}
                  onClick={() => setSplit("vertical")}
                  title="Show sessions side by side"
                >
                  ◫
                </button>
                <button
                  className={splitMode === "horizontal" ? "active" : ""}
                  onClick={() => setSplit("horizontal")}
                  title="Stack sessions top and bottom"
                >
                  ⬒
                </button>
              </div>
            </div>
            <div
              className={`terminal-pages split-${splitMode}`}
              style={
                splitMode === "vertical"
                  ? {
                      gridTemplateColumns: `repeat(${paneIds.length}, minmax(0, 1fr))`,
                    }
                  : splitMode === "horizontal"
                    ? {
                        gridTemplateRows: `repeat(${paneIds.length}, minmax(0, 1fr))`,
                      }
                    : undefined
              }
              onDragOver={(event) => {
                if (
                  !event.dataTransfer.types.includes(
                    "application/x-hedgecon-tab",
                  )
                )
                  return;
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                const distances = {
                  left: event.clientX - rect.left,
                  right: rect.right - event.clientX,
                  top: event.clientY - rect.top,
                  bottom: rect.bottom - event.clientY,
                };
                setDropEdge(
                  Object.entries(distances).sort(
                    (a, b) => a[1] - b[1],
                  )[0][0] as "left" | "right" | "top" | "bottom",
                );
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node))
                  setDropEdge(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const tabId = event.dataTransfer.getData(
                  "application/x-hedgecon-tab",
                );
                if (tabId && dropEdge) snapTab(tabId, dropEdge);
              }}
            >
              {tabs.map((tab) => {
                const paneIndex = paneIds.indexOf(tab.id);
                const visible = paneIndex >= 0 && !libraryOpen;
                return (
                  <div
                    key={tab.id}
                    className={`terminal-page ${visible ? "active" : ""} ${focusedPane === paneIndex && visible ? "focused" : ""}`}
                    onMouseDown={() => setFocusedPane(paneIndex)}
                  >
                    {visible && paneIds.length > 1 && (
                      <button
                        className="pane-close"
                        onClick={(event) => {
                          event.stopPropagation();
                          closePane(tab.id);
                        }}
                        title="Close this pane"
                        aria-label={`Close ${tab.session.name} pane`}
                      >
                        ×
                      </button>
                    )}
                    {tab.kind === "web" ? (
                        <WebDeviceView
                          tabId={tab.id}
                          session={tab.session}
                          visible={visible}
                          onClose={() => closeTab(tab.id)}
                        />
                      ) : tab.kind === "vnc" ? (
                        <Suspense
                          fallback={
                            <div className="loading">Preparing VNC viewer…</div>
                          }
                        >
                          <VncView
                            tabId={tab.id}
                            session={tab.session}
                            onClose={() => closeTab(tab.id)}
                          />
                        </Suspense>
                      ) : tab.kind === "serial" ? (
                        <SerialView session={tab.session} active={visible} />
                      ) : (
                        <TerminalView
                          session={tab.session}
                          secret={tab.secret}
                          active={visible}
                          macros={data.macros ?? []}
                          macroFolders={data.macroFolders ?? []}
                          folders={data.folders}
                          onManageMacros={() => setCommandsOpen(true)}
                          onClose={() => closeTab(tab.id)}
                        />
                      )}
                  </div>
                );
              })}
              {dropEdge && (
                <div className={`snap-preview snap-${dropEdge}`}>
                  <span>Drop to snap</span>
                </div>
              )}
            </div>
          </section>
        )}
        {(!tabs.length || libraryOpen) && (
          <section className="content">
            {tabs.length > 0 && (
              <div className="active-session-return">
                <div>
                  <strong>Session library</strong>
                  <small>
                    {tabs.length} active workspace tab(s) remain open.
                  </small>
                </div>
                <button
                  className="primary"
                  onClick={() => setLibraryOpen(false)}
                >
                  Return to active sessions
                </button>
              </div>
            )}
            {visible.length ? (
              <div className="session-grid">
                {visible.map((s) => (
                  <article
                    key={s.id}
                    className="session-card"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/session-id", s.id);
                    }}
                    onDoubleClick={() => openPreferredService(s)}
                  >
                    <div className="card-top">
                      <span className="server-icon">›_</span>
                      <div className="card-menu">
                        <CardAction
                          label="Edit session"
                          onClick={() => setEditing(s)}
                        >
                          <EditIcon />
                        </CardAction>
                        <CardAction
                          label="Clone session"
                          onClick={() =>
                            setEditing({ ...s, id: "", name: `${s.name} copy` })
                          }
                        >
                          <CloneIcon />
                        </CardAction>
                        {hasService(s, "ssh") && (
                          <CardAction
                            label="Forget fingerprint"
                            onClick={() => void forgetHostKey(s)}
                          >
                            <ForgetFingerprintIcon />
                          </CardAction>
                        )}
                        <CardAction
                          label="Delete session"
                          danger
                          onClick={() => remove(s)}
                        >
                          <DeleteIcon />
                        </CardAction>
                      </div>
                    </div>
                    <h3>{s.name}</h3>
                    <p>
                      {hasService(s, "serial") && !s.host ? s.serialPath : <>{s.username ? `${s.username}@` : ""}{s.host}</>}
                    </p>
                    <div className="meta">
                      <span>
                        {sessionServices(s)
                          .map((service) => service.toUpperCase())
                          .join(" · ")}
                      </span>
                      {hasService(s, "ssh") && (
                        <span className="session-auth-method">
                          {(credentials.find(
                            (credential) => credential.id === s.credentialSetId,
                          )?.authMethod ?? s.authMethod) === "privateKey"
                            ? "SSH KEY"
                            : "PASSWORD"}
                        </span>
                      )}
                      <span>
                        {hasService(s, "ssh")
                          ? `:${s.port}`
                          : hasService(s, "rdp")
                            ? `:${s.rdpPort ?? 3389}`
                            : hasService(s, "vnc")
                              ? `:${s.vncPort ?? 5900}`
                              : `${s.serialBaudRate ?? 9600} baud`}
                      </span>
                    </div>
                    <div className="session-connect-actions">
                      {hasService(s, "ssh") && (
                        <button
                          className="connect"
                          onClick={() => void connect(s)}
                        >
                          SSH <span>›_</span>
                        </button>
                      )}
                      {hasService(s, "web") && (
                        <button
                          className="connect web-connect"
                          onClick={() => openWebTab(s)}
                        >
                          Web <span>↗</span>
                        </button>
                      )}
                      {hasService(s, "rdp") && (
                        <button
                          className="connect rdp-connect"
                          onClick={() => void openRdp(s)}
                        >
                          RDP <span>▣</span>
                        </button>
                      )}
                      {hasService(s, "vnc") && (
                        <button
                          className="connect vnc-connect"
                          onClick={() => openVncTab(s)}
                        >
                          VNC <span>◉</span>
                        </button>
                      )}
                      {hasService(s, "serial") && (
                        <button className="connect serial-connect" onClick={() => openSerialTab(s)}>Serial <span>⎇</span></button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <div>›_</div>
                <h2>No sessions here yet</h2>
                <p>Save a host once, then reconnect in a couple of clicks.</p>
                <button className="primary" onClick={() => setEditing(null)}>
                  Create your first session
                </button>
              </div>
            )}
          </section>
        )}
      </div>
      {editing !== undefined && (
        <SessionDialog
          session={editing ?? undefined}
          folders={data.folders}
          credentials={credentials}
          credentialProfiles={credentialProfiles}
          onCancel={() => setEditing(undefined)}
          onSave={(session) => {
            const mappings = { ...(data.credentialProfileMappings ?? {}) };
            if (session.credentialProfile && session.credentialSetId)
              mappings[session.credentialProfile] = session.credentialSetId;
            persist({
              ...data,
              credentialProfileMappings: mappings,
              sessions: [
                ...data.sessions.filter((s) => s.id !== session.id),
                session,
              ],
            });
            setEditing(undefined);
          }}
        />
      )}
      {commandsOpen && (
        <MacroLibrary
          macros={data.macros ?? []}
          macroFolders={data.macroFolders ?? []}
          folders={data.folders}
          onChange={(macros) => persist({ ...data, macros })}
          onFoldersChange={(macroFolders) => persist({ ...data, macroFolders })}
          onWorkspaceChange={(macros, macroFolders) => persist({ ...data, macros, macroFolders })}
          onClose={() => setCommandsOpen(false)}
        />
      )}
      {wikiSessionId !== undefined && (
        <div className="wiki-overlay-root">
          <Suspense fallback={<div className="loading">Loading Wiki...</div>}>
            <WikiWorkspace
              sessions={data.sessions}
              initialSessionId={wikiSessionId ?? undefined}
              onClose={() => setWikiSessionId(undefined)}
            />
          </Suspense>
        </div>
      )}
      {creatingFolder && (
        <FolderDialog
          folders={data.folders}
          defaultParentId={
            folderCreationParent?.id ??
            (typeof selectedFolder === "string" &&
            selectedFolder !== "all" &&
            selectedFolder !== "unfiled"
              ? selectedFolder
              : null)
          }
          onCancel={() => { setCreatingFolder(false); setFolderCreationParent(null); }}
          onSave={(name, parentId) => { addFolder(name, parentId); setFolderCreationParent(null); }}
        />
      )}
      {folderToRename && (
        <RenameFolderDialog folder={folderToRename} onCancel={() => setFolderToRename(null)} onSave={(name) => renameFolder(folderToRename, name)} />
      )}
      {pendingSession && (
        <CredentialDialog
          session={pendingSession}
          onCancel={() => setPendingSession(null)}
          onConnect={(secret) => openTab(pendingSession, secret)}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          credentials={credentials}
          sessions={data.sessions}
          credentialProfileMappings={data.credentialProfileMappings ?? {}}
          onMapCredentialProfile={mapCredentialProfile}
          folders={data.folders}
          onDeleteFolder={(folder) => {
            setFolderToDelete(folder);
            setSettingsOpen(false);
          }}
          uiSettings={uiSettings}
          onUiSettings={(settings) =>
            persist({ ...data, uiSettings: settings })
          }
          onSaveCredential={saveCredential}
          onDeleteCredential={deleteCredential}
          onClose={() => setSettingsOpen(false)}
          notify={notify}
        />
      )}
      {pickerOpen && (
        <SessionPicker
          sessions={data.sessions}
          onCancel={() => {
            setPickerOpen(false);
            setActiveTabId(tabs[0]?.id ?? null);
          }}
          onSelect={(session) => {
            setPickerOpen(false);
            setActiveTabId(tabs[0]?.id ?? null);
            openPreferredService(session);
          }}
          onCreate={() => {
            setPickerOpen(false);
            setActiveTabId(tabs[0]?.id ?? null);
            setEditing(null);
          }}
        />
      )}
      {sessionToDelete && (
        <ConfirmDialog
          eyebrow="DELETE SESSION"
          title={`Delete “${sessionToDelete.name}”?`}
          message="The saved session will be removed from HedgeCon. This does not change the remote host or delete its credential set."
          confirmLabel="Delete session"
          danger
          onCancel={() => setSessionToDelete(null)}
          onConfirm={() => {
            persist({
              ...data,
              sessions: data.sessions.filter(
                (session) => session.id !== sessionToDelete.id,
              ),
            });
            setSessionToDelete(null);
          }}
        />
      )}
      {folderToDelete && (
        <ConfirmDialog
          eyebrow="DELETE FOLDER"
          title={`Delete “${folderToDelete.name}”?`}
          message="The folder will be removed. Its sessions and any child folders will move up one level."
          confirmLabel="Delete folder"
          danger
          onCancel={() => setFolderToDelete(null)}
          onConfirm={() => deleteFolder(folderToDelete)}
        />
      )}
      {folderContextMenu && (
        <div
          className="folder-context-menu"
          role="menu"
          style={{ left: folderContextMenu.x, top: folderContextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="create-folder-action"
            onClick={() => {
              setFolderCreationParent(folderContextMenu.folder);
              setCreatingFolder(true);
              setFolderContextMenu(null);
            }}
          >
            <span>＋</span>
            Create subfolder
          </button>
          <button
            type="button"
            role="menuitem"
            className="rename-folder-action"
            onClick={() => {
              setFolderToRename(folderContextMenu.folder);
              setFolderContextMenu(null);
            }}
          >
            <EditIcon />
            Rename folder
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setFolderToDelete(folderContextMenu.folder);
              setFolderContextMenu(null);
            }}
          >
            <DeleteIcon />
            Delete folder
          </button>
        </div>
      )}
      {notice && (
        <div className="toast">
          <span>✓</span>
          {notice}
        </div>
      )}
    </main>
  );
}
