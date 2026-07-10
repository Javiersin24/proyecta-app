export const Screen = ({ children, pad = 16 }) => (
  <div style={{ height: '100%', overflowY: 'auto', padding: pad }}>{children}</div>
);

export const Sheet = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--bg-overlay)' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: 480, maxHeight: '86vh', overflowY: 'auto',
        background: 'var(--bg-surface)', borderRadius: '20px 20px 0 0', padding: '18px 20px 28px',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--ink-200)', margin: '0 auto 16px' }} />
        {title && <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 17, marginBottom: 14 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
};

export const Modal = ({ open, onClose, title, children, width = 460 }) => {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--bg-overlay)' }} />
      <div style={{
        position: 'relative', width: '100%', maxWidth: width, maxHeight: '86vh', overflowY: 'auto',
        background: 'var(--bg-surface)', borderRadius: 18, padding: '20px 22px', boxShadow: 'var(--shadow-xl)',
      }}>
        {title && <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 17, marginBottom: 14 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
};
