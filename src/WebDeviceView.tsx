import { FormEvent, useEffect, useRef, useState } from 'react';
import type { BrowserCertificatePrompt, BrowserEvent, CredentialSet, Session } from './types';

function bounds(element: HTMLElement) { const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; }
function enteredUrl(value: string) { const trimmed = value.trim(); return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`; }

export default function WebDeviceView({ tabId, session, credentials, visible, onClose }: { tabId: string; session: Session; credentials: CredentialSet[]; visible: boolean; onClose: () => void }) {
  const surface = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(visible);
  const drawerOpenRef = useRef(false);
  const initialUrl = session.webUrl ?? `https://${session.host}`;
  const [address, setAddress] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [title, setTitle] = useState(session.name);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [error, setError] = useState('');
  const [certificatePrompt, setCertificatePrompt] = useState<BrowserCertificatePrompt | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [darkMode, setDarkMode] = useState(() => { try { return JSON.parse(localStorage.getItem('hedgecon-ui-settings') || '{}').browserTheme === 'dark'; } catch { return false; } });

  useEffect(() => { const listener = (event: Event) => setDarkMode((event as CustomEvent).detail?.browserTheme === 'dark'); window.addEventListener('hedgecon:ui-settings', listener); return () => window.removeEventListener('hedgecon:ui-settings', listener); }, []);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  useEffect(() => {
    const element = surface.current; if (!element) return;
    const updateBounds = () => { if (element.offsetParent) window.hedge.setBrowserBounds(tabId, bounds(element)); };
    const remove = window.hedge.onBrowserEvent((event: BrowserEvent) => {
      if (event.tabId !== tabId) return;
      if (event.type === 'loading') setLoading(Boolean(event.data));
      else if (event.type === 'error') setError(String(event.data ?? 'The device page could not be loaded.'));
      else if (event.type === 'navigation' && event.data && typeof event.data === 'object') { setCurrentUrl(event.data.url); setAddress(event.data.url); setTitle(event.data.title || session.name); setCanGoBack(event.data.canGoBack); setCanGoForward(event.data.canGoForward); setError(''); }
    });
    const removeCertificate = window.hedge.onBrowserCertificate(prompt => { if (prompt.tabId === tabId) setCertificatePrompt(prompt); });
    const resize = new ResizeObserver(updateBounds); resize.observe(element);
    const modalObserver = new MutationObserver(() => window.hedge.setBrowserVisible(tabId, visibleRef.current && !drawerOpenRef.current && !document.querySelector('.overlay, .wiki-overlay-root') && !element.closest('.device-browser')?.querySelector('.browser-error'))); modalObserver.observe(document.body, { childList: true, subtree: true });
    void window.hedge.createBrowser(tabId, initialUrl, bounds(element), darkMode).catch(reason => setError(reason instanceof Error ? reason.message : String(reason)));
    return () => { remove(); removeCertificate(); resize.disconnect(); modalObserver.disconnect(); window.hedge.destroyBrowser(tabId); };
  }, [tabId, initialUrl, session.name]);
  useEffect(() => { drawerOpenRef.current = credentialsOpen; window.hedge.setBrowserVisible(tabId, visible && !credentialsOpen && !error && !document.querySelector('.overlay, .wiki-overlay-root')); }, [tabId, visible, error, credentialsOpen]);
  useEffect(() => { void window.hedge.setBrowserDarkMode(tabId, darkMode).catch(() => { /* The native view may still be starting or already closing. */ }); }, [tabId, darkMode]);

  const navigate = (event: FormEvent) => { event.preventDefault(); const target = enteredUrl(address); setAddress(target); setError(''); void window.hedge.navigateBrowser(tabId, 'url', target).catch(reason => setError(reason instanceof Error ? reason.message : String(reason))); };
  const answerCertificate = (accepted: boolean) => { window.hedge.respondBrowserCertificate(tabId, accepted); setCertificatePrompt(null); };
  const copyCredential = async (credential: CredentialSet, field: 'username' | 'password') => {
    try {
      await window.hedge.copyCredentialField(credential.id, field);
      setCopyMessage(`${field === 'username' ? 'Username' : 'Password'} copied from ${credential.name}.`);
    } catch (reason) { setCopyMessage(reason instanceof Error ? reason.message : String(reason)); }
  };
  return <section className="device-browser">
    <header>
      <div className="browser-history"><button disabled={!canGoBack} onClick={() => void window.hedge.navigateBrowser(tabId, 'back')} title="Back">←</button><button disabled={!canGoForward} onClick={() => void window.hedge.navigateBrowser(tabId, 'forward')} title="Forward">→</button><button onClick={() => void window.hedge.navigateBrowser(tabId, 'reload')} title="Reload">↻</button></div>
      <form onSubmit={navigate}><span className={currentUrl.startsWith('https:') ? 'secure' : 'insecure'}>{currentUrl.startsWith('https:') ? '◆' : '!'}</span><input aria-label="Device web address" value={address} onChange={event => setAddress(event.target.value)} /><button type="submit">Go</button></form>
      <button className={credentialsOpen ? 'active' : ''} onClick={() => { setCredentialsOpen(value => !value); setCopyMessage(''); }} title="Open credential drawer" aria-label="Open credential drawer">⌨</button><button onClick={() => void window.hedge.openBrowserExternal(tabId, currentUrl)} title="Open in default browser">↗</button><button onClick={onClose} title="Close browser tab">×</button>
    </header>
    <div className="browser-status"><strong>{title}</strong><span>{loading ? 'Loading…' : currentUrl.startsWith('http:') ? 'Insecure HTTP connection' : 'Device browser'}</span></div>
    {error && <div className="browser-error"><strong>Could not load this device page</strong><span>{error}</span><button className="secondary" onClick={() => void window.hedge.openBrowserExternal(tabId, currentUrl)}>Open in default browser</button></div>}
    <div ref={surface} className="browser-surface" />
    {credentialsOpen && <div className="browser-credential-shade" onClick={() => setCredentialsOpen(false)}><aside className="browser-credential-drawer" onClick={event => event.stopPropagation()}><header><div><small>CREDENTIAL STORE</small><h3>Copy credentials</h3></div><button onClick={() => setCredentialsOpen(false)} title="Close credential drawer">×</button></header><p>Copy a value, then paste it into the device page. Passwords remain protected and are copied directly to your clipboard.</p><div className="browser-credential-list">{credentials.map(credential => <section key={credential.id}><div><strong>{credential.name}</strong><small>{credential.authMethod === 'password' ? 'Username and password' : 'Username and private key'}</small></div><label><span>{credential.username || 'No username'}</span><button disabled={!credential.username} onClick={() => void copyCredential(credential, 'username')}>Copy username</button></label>{credential.authMethod === 'password' && <label><span>{credential.hasSecret ? '••••••••••••' : 'No saved password'}</span><button disabled={!credential.hasSecret} onClick={() => void copyCredential(credential, 'password')}>Copy password</button></label>}</section>)}{!credentials.length && <div className="browser-credential-empty">No credential sets have been saved yet. Add one in Settings → Credentials.</div>}</div>{copyMessage && <button className="browser-copy-message" onClick={() => setCopyMessage('')}>{copyMessage}</button>}</aside></div>}
    {certificatePrompt && <div className="overlay"><section className="dialog host-key-dialog host-key-changed certificate-dialog"><div className="host-key-icon">!</div><small>UNTRUSTED DEVICE CERTIFICATE</small><h2>Trust this device?</h2><p>HedgeCon could not verify this device's HTTPS identity. Only continue if you have checked the certificate with a trusted source.</p><div className="fingerprint"><span>{certificatePrompt.host}</span><code>{certificatePrompt.fingerprint}</code>{(certificatePrompt.subject || certificatePrompt.issuer) && <dl><div><dt>Subject</dt><dd>{certificatePrompt.subject || 'Unavailable'}</dd></div><div><dt>Issuer</dt><dd>{certificatePrompt.issuer || 'Unavailable'}</dd></div></dl>}<small>{certificatePrompt.error}{certificatePrompt.validExpiry ? ` · Expires ${new Date(certificatePrompt.validExpiry * 1000).toLocaleDateString()}` : ''}</small></div><div className="actions"><button className="secondary" onClick={() => answerCertificate(false)}>Go back</button><button className="danger-button" onClick={() => answerCertificate(true)}>Trust for this app session</button></div></section></div>}
  </section>;
}
