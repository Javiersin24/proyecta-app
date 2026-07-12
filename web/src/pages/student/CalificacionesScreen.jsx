import { useEffect, useState } from 'react';
import { get } from '../../lib/api.js';
import { TopBar, EmptyState } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const PALETTE = ['var(--indigo-500)', 'var(--coral-500)', '#0EA5A0', '#8B5CF6', '#D99400'];
const GB_PASS = 3;
const gbFmt = (n) => (n == null ? '—' : n.toFixed(1));
const gbColor = (n) => (n == null ? 'var(--fg-3)' : n >= GB_PASS ? '#1a6b47' : '#B42318');

export default function StudentCalificacionesScreen() {
  const [rows, setRows] = useState(null);
  const [selId, setSelId] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => { get('/student/gradebook').then((d) => setRows(d.classes)); }, []);
  useEffect(() => { if (selId) get(`/student/classes/${selId}/gradebook`).then((d) => setDetail(d.gradebook)); }, [selId]);

  if (!rows) return null;

  if (!rows.length) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Mis calificaciones" subtitle="Tus notas por materia" />
        <div style={{ padding: '4px 16px 24px' }}><EmptyState icon="award" title="Sin clases" body="Cuando estés inscrito en una clase, verás tus notas aquí." /></div>
      </div>
    );
  }

  const selClass = rows.find((r) => r.classId === selId);

  if (!selId) {
    const withDef = rows.map((r) => r.definitiva).filter((x) => x != null);
    const promedioGeneral = withDef.length ? withDef.reduce((a, b) => a + b, 0) / withDef.length : null;
    const th = { padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', textTransform: 'uppercase', borderBottom: '1px solid var(--ink-200)', background: 'var(--paper-50)', textAlign: 'left', whiteSpace: 'nowrap' };
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Mis calificaciones" subtitle="Boletín por materia" />
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--indigo-700)', fontWeight: 700, textTransform: 'uppercase' }}>Promedio general</div>
              <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>{rows.length} materias · escala 0–5.0 · aprueba con {GB_PASS.toFixed(1)}</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, color: gbColor(promedioGeneral) }}>{gbFmt(promedioGeneral)}</div>
          </div>

          <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                <thead><tr><th style={th}>Materia</th><th style={{ ...th, textAlign: 'left' }}>Profesor</th><th style={{ ...th, textAlign: 'center' }}>Estado</th><th style={{ ...th, textAlign: 'right' }}>Definitiva</th><th style={{ ...th, width: 34 }} /></tr></thead>
                <tbody>
                  {rows.map((r, i) => {
                    const color = PALETTE[(r.paletteIdx || 0) % PALETTE.length];
                    const estado = r.definitiva == null ? { t: 'Sin notas', bg: 'var(--ink-100)', fg: 'var(--fg-3)' } : r.definitiva >= GB_PASS ? { t: 'Aprobada', bg: '#DCFCE7', fg: '#1a6b47' } : { t: 'En riesgo', bg: '#FEE2E2', fg: '#B42318' };
                    return (
                      <tr key={r.classId} onClick={() => setSelId(r.classId)} style={{ cursor: 'pointer', borderTop: i ? '1px solid var(--ink-100)' : 0 }}>
                        <td style={{ padding: '11px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: color, display: 'grid', placeItems: 'center', color: '#fff', flexShrink: 0, fontWeight: 800, fontSize: 13 }}>{r.name.charAt(0)}</div>
                            <div style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{r.name}</div><div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{r.section}</div></div>
                          </div>
                        </td>
                        <td style={{ padding: '11px 12px', fontSize: 12.5, color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>{r.teacherName || '—'}</td>
                        <td style={{ padding: '11px 12px', textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: estado.bg, color: estado.fg, whiteSpace: 'nowrap' }}>{estado.t}</span></td>
                        <td style={{ padding: '11px 12px', textAlign: 'right', fontSize: 18, fontWeight: 800, color: gbColor(r.definitiva) }}>{gbFmt(r.definitiva)}</td>
                        <td style={{ padding: '11px 8px', textAlign: 'center' }}><Icon name="chevron" size={16} color="var(--fg-3)" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textAlign: 'center' }}>Toca una materia para ver el detalle de tus notas.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar title="Mis calificaciones" subtitle={`${selClass?.name} · ${selClass?.section || ''}`} onBack={() => { setSelId(null); setDetail(null); }} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!detail ? (
          <EmptyState icon="award" title="Sin notas todavía" body="El profesor aún no ha publicado calificaciones para esta materia." />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--indigo-50)', border: '1px solid var(--indigo-100)', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--indigo-700)', fontWeight: 700, textTransform: 'uppercase' }}>Definitiva</div>
                <div style={{ fontSize: 12.5, color: 'var(--fg-3)', marginTop: 2 }}>escala 0–5.0 · aprueba con {GB_PASS.toFixed(1)}</div>
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: gbColor(detail.definitiva) }}>{gbFmt(detail.definitiva)}</div>
            </div>
            {detail.cats.map((cat) => (
              <div key={cat.id} style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--ink-100)', background: 'var(--paper-50)' }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>{cat.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600 }}>Prom.</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: gbColor(cat.avg), minWidth: 38, textAlign: 'right' }}>{gbFmt(cat.avg)}</span>
                </div>
                <div>
                  {cat.cols.map((col, i) => (
                    <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: i ? '1px solid var(--ink-100)' : 0 }}>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{col.label}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: gbColor(col.val), minWidth: 38, textAlign: 'right' }}>{gbFmt(col.val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: 'var(--fg-3)', textAlign: 'center' }}>Estas notas las publica tu profesor. Si ves un error, contáctalo por el chat.</div>
          </>
        )}
      </div>
    </div>
  );
}
