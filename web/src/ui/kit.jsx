// Proyecta — kit de UI compartido (portado de project/proyecta-app.jsx)
import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

export function useIsWide(bp = 860) {
  const [wide, setWide] = useState(window.innerWidth >= bp);
  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= bp);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, [bp]);
  return wide;
}

export const StatusBar = () => (
  <div style={{ height: 24 }} />
);

export const TopBar = ({ title, subtitle, onBack, trailing, tinted, color, transparent }) => (
  <div style={{
    height: 'var(--header-h)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 8px 0 4px', background: transparent ? 'transparent' : (tinted ? color : 'var(--bg-surface)'),
    borderBottom: transparent ? 'none' : '1px solid var(--border-subtle)',
  }}>
    {onBack && (
      <button onClick={onBack} aria-label="Volver" style={{
        width: 40, height: 40, border: 0, background: 'transparent', cursor: 'pointer',
        display: 'grid', placeItems: 'center', color: tinted ? '#fff' : 'var(--fg-1)', borderRadius: 10,
      }}><Icon name="back" size={20} stroke={2} /></button>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 16, color: tinted ? '#fff' : 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, color: tinted ? 'rgba(255,255,255,0.8)' : 'var(--fg-3)' }}>{subtitle}</div>}
    </div>
    {trailing}
  </div>
);

export const IconButton = ({ name, onClick, badge, color, ariaLabel }) => (
  <button onClick={onClick} aria-label={ariaLabel} style={{
    position: 'relative', width: 40, height: 40, border: 0, background: 'transparent', cursor: 'pointer',
    display: 'grid', placeItems: 'center', color: color || 'var(--fg-1)', borderRadius: 10,
  }}>
    <Icon name={name} size={20} />
    {badge ? <span style={{
      position: 'absolute', top: 6, right: 6, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8,
      background: 'var(--coral-500)', color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'grid', placeItems: 'center',
    }}>{badge}</span> : null}
  </button>
);

export const TabBar = ({ items, active, onChange }) => (
  <div style={{
    height: 'var(--tabbar-h)', flexShrink: 0, display: 'flex', borderTop: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)', paddingBottom: 'var(--safe-bottom)',
  }}>
    {items.map((it) => {
      const on = active === it.id;
      return (
        <button key={it.id} onClick={() => onChange(it.id)} style={{
          flex: 1, border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 3, color: on ? 'var(--indigo-600)' : 'var(--fg-3)',
        }}>
          <Icon name={it.icon} size={21} stroke={on ? 2.1 : 1.75} />
          <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 600 }}>{it.label}</span>
        </button>
      );
    })}
  </div>
);

export const Avatar = ({ name = '', size = 32 }) => {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const hue = Math.abs(hashCode(name)) % 8;
  const palette = ['#4F46E5', '#F2994A', '#0EA5A0', '#8B5CF6', '#2F7EE8', '#DB7F2E', '#22A06B', '#D9342B'];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: palette[hue], color: '#fff',
      display: 'grid', placeItems: 'center', fontFamily: 'var(--font-sans)', fontWeight: 700,
      fontSize: size * 0.38, flexShrink: 0,
    }}>{initials || '?'}</div>
  );
};
function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i); return h; }

export const Chip = ({ variant = 'muted', children }) => {
  const variants = {
    muted:   { bg: 'var(--ink-100)', fg: 'var(--fg-2)' },
    info:    { bg: 'var(--info-100)', fg: '#1B5BB8' },
    warning: { bg: 'var(--warning-100)', fg: '#8C6207' },
    danger:  { bg: 'var(--danger-100)', fg: '#9E241C' },
    success: { bg: 'var(--success-100)', fg: '#166F49' },
    brand:   { bg: 'var(--indigo-50)', fg: 'var(--indigo-600)' },
  };
  const v = variants[variant] || variants.muted;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999,
      background: v.bg, color: v.fg, fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font-sans)',
    }}>{children}</span>
  );
};

export const StatusDot = ({ status }) => {
  const map = {
    live: '#22A06B', online: '#2F7EE8', offline: 'var(--ink-400)',
    Activo: '#22A06B', Prueba: '#E8A317', Suspendido: 'var(--danger-500)', Suspendida: 'var(--danger-500)',
    Activa: '#22A06B', Invitada: '#E8A317', Pagado: '#22A06B', Pendiente: '#E8A317', Vencido: 'var(--danger-500)',
    Asignado: '#22A06B',
  };
  const c = map[status] || 'var(--ink-400)';
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />;
};

export const EmptyState = ({ icon, title, body, action }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', color: 'var(--fg-3)' }}>
    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--ink-100)', display: 'grid', placeItems: 'center', marginBottom: 14, color: 'var(--fg-3)' }}>
      <Icon name={icon} size={26} />
    </div>
    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--fg-1)', marginBottom: 4 }}>{title}</div>
    {body && <div style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>{body}</div>}
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

export const SectionHeader = ({ children, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 10px' }}>
    <div className="eyebrow">{children}</div>
    {action}
  </div>
);

export const MATERIAL_VISUAL = {
  pdf:     { icon: 'filePdf', color: '#D9342B', bg: '#FADAD7' },
  slides:  { icon: 'fileSlides', color: '#DB7F2E', bg: '#FEF0DC' },
  docx:    { icon: 'file', color: '#2F7EE8', bg: '#D5E4FA' },
  youtube: { icon: 'youtube', color: '#D9342B', bg: '#FADAD7' },
  image:   { icon: 'fileImg', color: '#8B5CF6', bg: '#EEF2FF' },
  video:   { icon: 'video', color: '#4F46E5', bg: '#E0E7FF' },
  canva:   { icon: 'canva', color: '#0EA5A0', bg: '#D4EFE1' },
  link:    { icon: 'link', color: 'var(--fg-2)', bg: 'var(--ink-100)' },
  img:     { icon: 'fileImg', color: '#8B5CF6', bg: '#EEF2FF' },
};

export const FileRow = ({ file, onClick, trailing, selected }) => {
  const v = MATERIAL_VISUAL[file.kind] || MATERIAL_VISUAL.pdf;
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 12px',
      border: selected ? `1.5px solid var(--indigo-500)` : '1px solid var(--border-subtle)', borderRadius: 12,
      background: selected ? 'var(--indigo-50)' : 'var(--bg-surface)', cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: v.bg, color: v.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon name={v.icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
        {file.meta && <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{file.meta}</div>}
      </div>
      {trailing}
    </button>
  );
};

export const MaterialRow = ({ material, onClick, onProject, compact }) => {
  const v = MATERIAL_VISUAL[material.kind] || MATERIAL_VISUAL.pdf;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '9px 10px' : '12px',
      border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--bg-surface)',
    }}>
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : 'default' }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: v.bg, color: v.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={v.icon} size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{material.name}</div>
          {material.meta && <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>{material.meta}</div>}
        </div>
      </div>
      {onProject && (
        <button onClick={() => onProject(material)} style={{
          border: 0, background: 'var(--coral-50)', color: 'var(--coral-600)', borderRadius: 9, padding: '7px 11px',
          fontWeight: 700, fontSize: 11.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
        }}><Icon name="cast" size={13} stroke={2.2} /> Proyectar</button>
      )}
    </div>
  );
};

export const TopicAccordion = ({ topic, materials, isTeacher, canProject = isTeacher, defaultOpen, onPickMaterial, onProject, onAddMaterial }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const accent = topic.accent === 'coral' ? 'var(--coral-500)' : topic.accent === 'teal' ? '#0EA5A0' : topic.accent === 'violet' ? '#8B5CF6' : 'var(--indigo-500)';
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', padding: '14px 16px', border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: `${accent}1A`, color: accent, display: 'grid', placeItems: 'center' }}>
          <Icon name="folder" size={20} stroke={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, color: 'var(--fg-1)' }}>{topic.name}</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{topic.count} material{topic.count !== 1 ? 'es' : ''}</div>
        </div>
        <Icon name="chevron" size={18} color="var(--fg-3)" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 200ms' }} />
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(materials || []).map((m) => (
            <MaterialRow key={m.id} material={m} onClick={() => onPickMaterial?.(m)} onProject={canProject ? onProject : undefined} />
          ))}
          {isTeacher && (
            <button onClick={() => onAddMaterial?.(topic.id)} style={{
              padding: '10px 12px', border: '1.5px dashed var(--ink-300)', background: 'transparent', borderRadius: 12,
              cursor: 'pointer', color: 'var(--fg-2)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}><Icon name="plus" size={16} stroke={2.2} /> Agregar material</button>
          )}
        </div>
      )}
    </div>
  );
};

export const StatGrid = ({ stats }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
    {stats.map((s, i) => (
      <div key={i} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 22, color: 'var(--fg-1)' }}>{s.n}</div>
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{s.l}</div>
      </div>
    ))}
  </div>
);

export const SideNav = ({ items, active, onChange, footer }) => (
  <div style={{
    width: 220, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-surface)',
    display: 'flex', flexDirection: 'column', height: '100%',
  }}>
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((it) => {
        const on = active === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, border: 0, borderRadius: 10, padding: '10px 12px',
            background: on ? 'var(--indigo-50)' : 'transparent', color: on ? 'var(--indigo-600)' : 'var(--fg-2)',
            fontWeight: on ? 700 : 600, fontSize: 13.5, cursor: 'pointer', textAlign: 'left',
          }}>
            <Icon name={it.icon} size={17} stroke={on ? 2.1 : 1.75} />
            {it.label}
          </button>
        );
      })}
    </div>
    {footer && <div style={{ padding: 10, borderTop: '1px solid var(--border-subtle)' }}>{footer}</div>}
  </div>
);

export const AccountBar = ({ name, subtitle, onLogout }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
    <Avatar name={name} size={34} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{subtitle}</div>}
    </div>
    <button onClick={onLogout} aria-label="Cerrar sesión" style={{ border: 0, background: 'transparent', color: 'var(--fg-3)', cursor: 'pointer', display: 'grid', placeItems: 'center', width: 32, height: 32 }}>
      <Icon name="logout" size={16} />
    </button>
  </div>
);

export const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-subtle)', padding: '0 4px' }}>
    {tabs.map((t) => {
      const on = active === t.id;
      return (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          border: 0, background: 'transparent', cursor: 'pointer', padding: '10px 14px', fontSize: 13,
          fontWeight: on ? 700 : 600, color: on ? 'var(--indigo-600)' : 'var(--fg-3)',
          borderBottom: on ? '2.5px solid var(--indigo-500)' : '2.5px solid transparent', marginBottom: -1,
        }}>{t.label}</button>
      );
    })}
  </div>
);

export const PrimaryButton = ({ children, onClick, style, disabled, color = 'var(--indigo-500)' }) => (
  <button onClick={onClick} disabled={disabled} style={{
    height: 48, border: 0, borderRadius: 12, background: disabled ? 'var(--ink-300)' : color, color: '#fff',
    fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14.5, cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '0 18px', ...style,
  }}>{children}</button>
);

export const SecondaryButton = ({ children, onClick, style }) => (
  <button onClick={onClick} style={{
    height: 44, border: '1px solid var(--border-default)', borderRadius: 12, background: 'var(--bg-surface)',
    color: 'var(--fg-1)', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
    padding: '0 16px', ...style,
  }}>{children}</button>
);

export const coverPalettes = [
  { bg: 'var(--indigo-500)', accent: 'var(--coral-400)' },
  { bg: '#3730A3', accent: '#FDDEB8' },
  { bg: '#2F7EE8', accent: '#FDFBF7' },
  { bg: '#0EA5A0', accent: '#F8F4EB' },
  { bg: '#8B5CF6', accent: '#FDFBF7' },
  { bg: '#F2994A', accent: '#FEF0DC' },
];

export const ClassCard = ({ cls, onClick, projecting }) => {
  const pal = coverPalettes[(cls.paletteIdx || 0) % coverPalettes.length];
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: 0, border: '1px solid var(--border-subtle)',
      background: 'var(--white)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
      textAlign: 'left', display: 'block',
    }}>
      <div style={{
        height: 104, padding: 16, color: '#fff', background: pal.bg,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative',
      }}>
        <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 18, lineHeight: 1.2, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.name}</div>
          <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.85, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.section} · {cls.studentCount ?? 0} estudiantes</div>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: pal.accent, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 16, color: pal.bg }}>
          {cls.name.slice(0, 2).toUpperCase()}
        </div>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--fg-3)' }}>CÓDIGO</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>{cls.code}</span>
        </div>
        {projecting ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 999, background: 'var(--coral-50)', color: 'var(--coral-700)', border: '1px solid var(--coral-200)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--coral-500)', animation: 'pulse 1.4s infinite' }} />
            En vivo
          </span>
        ) : (
          cls.pending > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 999, background: 'var(--indigo-50)', color: 'var(--indigo-700)', border: '1px solid var(--indigo-100)' }}>
              {cls.pending} por revisar
            </span>
          )
        )}
      </div>
    </button>
  );
};

export const TaskRow = ({ task, onClick, subtitle }) => {
  const dueColor = task.status === 'late' ? 'var(--danger-500)' : task.status === 'dueSoon' ? 'var(--coral-600)' : task.status === 'done' ? 'var(--success-500)' : 'var(--fg-3)';
  return (
    <button onClick={onClick} style={{
      width: '100%', padding: 14, border: '1px solid var(--border-subtle)', background: 'var(--white)', borderRadius: 14,
      cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'var(--indigo-50)', color: 'var(--indigo-600)', display: 'grid', placeItems: 'center' }}>
        <Icon name="clipboard" size={20} stroke={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 15, lineHeight: 1.25, color: 'var(--fg-1)' }}>{task.title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>{subtitle}</div>}
        {task.desc && <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 3, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{task.desc}</div>}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, fontSize: 12, fontWeight: 600 }}>
          <span style={{ color: dueColor }}>{task.due}</span>
          {task.total != null && <><span style={{ color: 'var(--fg-3)' }}>·</span><span style={{ color: 'var(--fg-3)' }}>{task.submitted}/{task.total} entregaron</span></>}
        </div>
      </div>
      <Icon name="chevron" size={18} color="var(--fg-3)" style={{ marginTop: 6 }} />
    </button>
  );
};

export const inputStyle ={ width: '100%', boxSizing: 'border-box', height: 46, padding: '0 13px', border: '1px solid var(--ink-300)', borderRadius: 11, background: 'var(--white)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--fg-1)', outline: 'none' };
export const labelStyle = { display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--fg-2)', textTransform: 'uppercase', marginBottom: 6 };

export const Field = ({ label, value, onChange, placeholder, type = 'text', style }) => (
  <div style={{ flex: '1 1 160px', ...style }}>
    <label style={labelStyle}>{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={inputStyle} />
  </div>
);
