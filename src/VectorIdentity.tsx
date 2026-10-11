/** Static theme artwork. No telemetry or status is encoded in the illustration. */
export function VectorMark() {
  return <svg className="vector-only vector-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path d="M4 8h11v12h18V8h11v32H33V29H15v11H4z" fill="currentColor"/>
    <path d="M18 4h12L18 44H6z" fill="#081b2a"/>
    <path d="M23 4h7L18 44h-7z" fill="currentColor"/>
  </svg>;
}

export function VectorIdentity() {
  return <div className="vector-only vector-identity" aria-hidden="true">
    <div className="vector-identity-caption"><span>NETWORK / CONNECTIVITY</span><i/></div>
    <svg viewBox="0 0 220 68" fill="none" focusable="false">
      <g stroke="#547083" strokeWidth=".7">
        <path d="M4 9h9M8.5 4.5v9M24 9h9M28.5 4.5v9M44 9h9M48.5 4.5v9"/>
        <path d="M88 5h31l53 53h39M109 5l53 53M143 5h18l53 53"/>
        <path d="M4 55h33l13-13h28"/>
      </g>
      <g fill="#ff512e">
        <path d="M67 17h18l40 40h-27L67 26z"/>
        <path d="M98 17h18l40 40h-27L98 26z"/>
        <path d="M129 17h18l40 40h-27L129 26z"/>
        <path d="M5 29h3v13H5z"/>
      </g>
      <path d="M198 8h3v3h-3zM205 8h3v3h-3zM212 8h3v3h-3z" fill="#eef0e7"/>
    </svg>
  </div>;
}
