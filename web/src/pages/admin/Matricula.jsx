import { useEffect, useState } from 'react';
import { get, post, patch } from '../../lib/api.js';
import { Screen } from '../../ui/Screen.jsx';
import { Avatar, Chip, labelStyle, inputStyle, Field } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const btnPrimary = { border: 0, background: 'var(--indigo-500)', color: '#fff', borderRadius: 10, padding: '9px 14px', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 };
const FieldsetHeader = ({ children }) => <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 12, color: 'var(--indigo-600)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 8 }}>{children}</div>;
const statusVariant = (s) => (s === 'Asignado' ? 'success' : s === 'Pagado' ? 'info' : 'warning');
const blankForm = (grado) => ({ name: '', fechaNacimiento: '', documento: '', grado, direccion: '', acudiente: '', parentesco: '', telAcudiente: '', emailAcudiente: '', alergias: '', condiciones: '', eps: '', emergenciaNombre: '', emergenciaTel: '', colegioAnterior: '', ultimoGrado: '', boletinNombre: '' });

export default function AdminMatricula() {
  const [data, setData] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [form, setForm] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [gradoSorteo, setGradoSorteo] = useState(null);
  const [sorteoMsg, setSorteoMsg] = useState('');

  const load = () => get('/admin/matricula').then((d) => { setData(d); if (!gradoSorteo) setGradoSorteo(d.grados[0]?.name); });
  useEffect(() => { load(); }, []);

  if (!data) return null;
  const { config: cfg, matriculados, grados } = data;
  const cupoTotal = (g) => { const c = cfg?.porGrado?.[g] || { cupoPorGrupo: 25, numGrupos: 1 }; return c.cupoPorGrupo * c.numGrupos; };
  const ocupadosGrado = (g) => matriculados.filter((m) => m.grado === g && (m.status === 'Pagado' || m.status === 'Asignado')).length;
  const pagadosPorGrado = (g) => matriculados.filter((m) => m.grado === g && m.status === 'Pagado').length;

  const setAbierta = (val) => patch('/admin/matricula/config', { abierta: val }).then(load);
  const setFechas = (patchObj) => patch('/admin/matricula/config', patchObj).then(load);
  const setGradoConfig = (grado, p) => patch('/admin/matricula/config', { porGrado: { [grado]: { ...(cfg.porGrado[grado] || { cupoPorGrupo: 25, numGrupos: 1 }), ...p } } }).then(load);
  const marcarPagado = (id) => post(`/admin/matricula/${id}/pagar`).then(load);
  const addInscripcion = async () => { if (!form?.name) return; await post('/admin/matricula', form); setForm(null); load(); };
  const sortear = async () => {
    setSorteoMsg('');
    try { const r = await post('/admin/matricula/sorteo', { grado: gradoSorteo }); setSorteoMsg(`✅ ${r.gruposCreados} grupo(s) creado(s): ${r.grupos.join(', ')}`); load(); }
    catch (e) { setSorteoMsg(`❌ ${e.message}`); }
  };

  return (
    <Screen>
      <div className="h2" style={{ marginBottom: 6 }}>Matrícula</div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 14 }}>
        Los padres inscriben al estudiante, llenan el formulario completo y pagan la matrícula en línea o en el colegio. Al cerrar matrícula, el sistema reparte a los pagados en grupos al azar y les asigna profesores según su materia y disponibilidad.
      </div>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
        <button onClick={() => setShowConfig((v) => !v)} style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
          <Icon name="settings" size={17} stroke={2} />
          <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>Configuración del proceso de matrícula</span>
          <Chip variant={cfg?.abierta ? 'success' : 'muted'}>{cfg?.abierta ? 'Abierto' : 'Cerrado'}</Chip>
          <Icon name="chevron" size={16} style={{ transform: showConfig ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 160ms' }} />
        </button>
        {showConfig && (
          <div style={{ borderTop: '1px solid var(--ink-200)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '50vh', overflowY: 'auto' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!cfg?.abierta} onChange={(e) => setAbierta(e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Habilitar proceso de matrícula (visible a los padres)</span>
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px' }}><label style={labelStyle}>Apertura</label><input type="date" style={inputStyle} value={cfg?.fechaInicio || ''} onChange={(e) => setFechas({ fechaInicio: e.target.value })} /></div>
              <div style={{ flex: '1 1 160px' }}><label style={labelStyle}>Cierre</label><input type="date" style={inputStyle} value={cfg?.fechaFin || ''} onChange={(e) => setFechas({ fechaFin: e.target.value })} /></div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--indigo-600)', marginBottom: 8 }}>Cupos por grado</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grados.map((g) => {
                  const c = cfg?.porGrado?.[g.name] || { cupoPorGrupo: 25, numGrupos: 1 };
                  return (
                    <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 10px', background: 'var(--paper-50)', borderRadius: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, width: 36 }}>{g.name}</span>
                      <label style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>Estudiantes/grupo</label>
                      <input type="number" min={1} value={c.cupoPorGrupo} onChange={(e) => setGradoConfig(g.name, { cupoPorGrupo: Number(e.target.value) || 1 })} style={{ width: 60, textAlign: 'center', padding: '6px 4px', border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700 }} />
                      <label style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>N.º de grupos</label>
                      <input type="number" min={1} value={c.numGrupos} onChange={(e) => setGradoConfig(g.name, { numGrupos: Number(e.target.value) || 1 })} style={{ width: 60, textAlign: 'center', padding: '6px 4px', border: '1px solid var(--ink-200)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700 }} />
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-3)' }}>{ocupadosGrado(g.name)}/{cupoTotal(g.name)} cupos ocupados</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button style={btnPrimary} onClick={() => setForm(form ? null : blankForm(grados[0]?.name))}><Icon name="plus" size={16} stroke={2.3} /> Nueva inscripción</button>
      </div>

      {form && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <FieldsetHeader>Estudiante</FieldsetHeader>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label="Nombre completo" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre y apellidos" />
            <Field label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={(e) => setForm((p) => ({ ...p, fechaNacimiento: e.target.value }))} />
            <Field label="Documento de identidad" value={form.documento} onChange={(e) => setForm((p) => ({ ...p, documento: e.target.value }))} placeholder="Registro civil / TI" />
            <div style={{ flex: '1 1 100px' }}>
              <label style={labelStyle}>Grado</label>
              <select style={inputStyle} value={form.grado} onChange={(e) => setForm((p) => ({ ...p, grado: e.target.value }))}>
                {grados.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <Field label="Dirección de residencia" value={form.direccion} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} placeholder="Calle, ciudad" />
          </div>
          <FieldsetHeader>Acudiente</FieldsetHeader>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label="Nombre del acudiente" value={form.acudiente} onChange={(e) => setForm((p) => ({ ...p, acudiente: e.target.value }))} placeholder="Nombre completo" />
            <Field label="Parentesco" value={form.parentesco} onChange={(e) => setForm((p) => ({ ...p, parentesco: e.target.value }))} placeholder="Madre / Padre / Tutor" />
            <Field label="Teléfono" value={form.telAcudiente} onChange={(e) => setForm((p) => ({ ...p, telAcudiente: e.target.value }))} placeholder="300 000 0000" />
            <Field label="Correo" type="email" value={form.emailAcudiente} onChange={(e) => setForm((p) => ({ ...p, emailAcudiente: e.target.value }))} placeholder="correo@ejemplo.com" />
          </div>
          <FieldsetHeader>Salud</FieldsetHeader>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label="Alergias" value={form.alergias} onChange={(e) => setForm((p) => ({ ...p, alergias: e.target.value }))} placeholder="Ninguna / especificar" />
            <Field label="Condiciones médicas" value={form.condiciones} onChange={(e) => setForm((p) => ({ ...p, condiciones: e.target.value }))} placeholder="Asma, diabetes, etc." />
            <Field label="EPS / seguro médico" value={form.eps} onChange={(e) => setForm((p) => ({ ...p, eps: e.target.value }))} placeholder="Nombre de la EPS" />
          </div>
          <FieldsetHeader>Colegio anterior</FieldsetHeader>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label="Nombre del colegio" value={form.colegioAnterior} onChange={(e) => setForm((p) => ({ ...p, colegioAnterior: e.target.value }))} placeholder="Institución de procedencia" />
            <Field label="Último grado cursado" value={form.ultimoGrado} onChange={(e) => setForm((p) => ({ ...p, ultimoGrado: e.target.value }))} placeholder="9°" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
            <button onClick={() => setForm(null)} style={{ height: 40, padding: '0 16px', border: '1px solid var(--ink-200)', background: 'var(--white)', color: 'var(--fg-2)', borderRadius: 11, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            <button style={btnPrimary} onClick={addInscripcion}>Guardar inscripción</button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
        {matriculados.map((m, i) => (
          <div key={m.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--ink-200)' }}>
            <div onClick={() => setDetalle(detalle === m.id ? null : m.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap', cursor: 'pointer' }}>
              <Avatar name={m.name} size={32} />
              <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--fg-3)' }}>Grado {m.grado} · {m.metodoPago} · Acudiente: {m.acudiente}</div>
              </div>
              <Chip variant={statusVariant(m.status)}>{m.status === 'Asignado' ? `Grupo ${m.grupoNombre}` : m.status}</Chip>
              {m.status === 'Pendiente' && <button onClick={(e) => { e.stopPropagation(); marcarPagado(m.id); }} style={{ ...btnPrimary, height: 32, fontSize: 11.5, padding: '0 12px' }}>Marcar pagado</button>}
            </div>
            {detalle === m.id && (
              <div style={{ padding: '2px 16px 16px 60px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5, color: 'var(--fg-2)' }}>
                {m.fechaNacimiento && <div><b>Nace:</b> {m.fechaNacimiento} · <b>Doc:</b> {m.documento || '—'}</div>}
                {m.direccion && <div><b>Dirección:</b> {m.direccion}</div>}
                <div><b>Acudiente:</b> {m.acudiente} ({m.parentesco || '—'}) · {m.telAcudiente || '—'} · {m.emailAcudiente || '—'}</div>
                <div><b>Salud:</b> Alergias: {m.alergias || 'Ninguna'} · {m.condiciones || 'Sin condiciones'} · EPS: {m.eps || '—'}</div>
                {(m.colegioAnterior || m.ultimoGrado) && <div><b>Colegio anterior:</b> {m.colegioAnterior || '—'} · último grado {m.ultimoGrado || '—'}</div>}
              </div>
            )}
          </div>
        ))}
        {matriculados.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--fg-3)' }}>Sin inscripciones todavía.</div>}
      </div>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14 }}>Cerrar matrícula y formar grupos</div>
          <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }}>Reparte al azar a los pagados del grado elegido y asigna profesores según materia y cupo.</div>
          {sorteoMsg && <div style={{ fontSize: 12, marginTop: 6 }}>{sorteoMsg}</div>}
        </div>
        <select style={{ ...inputStyle, width: 110, height: 40 }} value={gradoSorteo || ''} onChange={(e) => setGradoSorteo(e.target.value)}>
          {grados.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
        </select>
        <button style={btnPrimary} disabled={!pagadosPorGrado(gradoSorteo)} onClick={sortear}>
          Ejecutar sorteo ({pagadosPorGrado(gradoSorteo)} pagados)
        </button>
      </div>
    </Screen>
  );
}
