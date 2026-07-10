import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import { labelStyle, inputStyle, Field } from '../../ui/kit.jsx';
import Icon from '../../ui/Icon.jsx';

const GRADOS = ['6°', '8°', '10°'];

const FieldsetHeader = ({ children }) => (
  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 12.5, color: 'var(--indigo-600)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 12, marginBottom: 2 }}>
    {children}
  </div>
);

export default function SignupForm({ onBack }) {
  const nav = useNavigate();
  const { signupMatricula } = useAuth();
  const [form, setForm] = useState({
    name: '', fechaNacimiento: '', documento: '', grado: GRADOS[0], direccion: '',
    acudiente: '', parentesco: '', telAcudiente: '', emailAcudiente: '',
    alergias: '', condiciones: '', eps: '', emergenciaNombre: '', emergenciaTel: '',
    colegioAnterior: '', ultimoGrado: '', boletinNombre: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setError('');
    if (!form.name || !form.acudiente) { setError('Completa al menos el nombre del estudiante y del acudiente.'); return; }
    setBusy(true);
    try {
      const user = await signupMatricula(form);
      nav('/matricula');
    } catch (e) {
      setError(e.message || 'No se pudo completar la inscripción');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ width: '100%', maxWidth: 460 }}>
      <button onClick={onBack} style={{ border: 0, background: 'transparent', color: 'var(--indigo-600)', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 14 }}>← Volver a inicio de sesión</button>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 20, marginBottom: 4 }}>Formulario de inscripción</div>
      <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '0 0 16px' }}>Completa todos los datos del estudiante. Al finalizar podrás pagar la matrícula.</p>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '56vh', overflowY: 'auto' }}>
        <FieldsetHeader>Estudiante</FieldsetHeader>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Field label="Nombre completo" value={form.name} onChange={set('name')} placeholder="Nombre y apellidos" />
          <Field label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} />
          <Field label="Documento de identidad" value={form.documento} onChange={set('documento')} placeholder="Registro civil / TI" />
          <div style={{ flex: '1 1 140px' }}>
            <label style={labelStyle}>Grado</label>
            <select style={inputStyle} value={form.grado} onChange={set('grado')}>
              {GRADOS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <Field label="Dirección de residencia" value={form.direccion} onChange={set('direccion')} placeholder="Calle, ciudad" />
        </div>

        <FieldsetHeader>Acudiente</FieldsetHeader>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Field label="Nombre del acudiente" value={form.acudiente} onChange={set('acudiente')} placeholder="Nombre completo" />
          <Field label="Parentesco" value={form.parentesco} onChange={set('parentesco')} placeholder="Madre / Padre / Tutor" />
          <Field label="Teléfono" value={form.telAcudiente} onChange={set('telAcudiente')} placeholder="300 000 0000" />
          <Field label="Correo" type="email" value={form.emailAcudiente} onChange={set('emailAcudiente')} placeholder="correo@ejemplo.com" />
        </div>

        <FieldsetHeader>Salud</FieldsetHeader>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Field label="Alergias" value={form.alergias} onChange={set('alergias')} placeholder="Ninguna / especificar" />
          <Field label="Condiciones médicas" value={form.condiciones} onChange={set('condiciones')} placeholder="Asma, diabetes, etc." />
          <Field label="EPS / seguro médico" value={form.eps} onChange={set('eps')} placeholder="Nombre de la EPS" />
          <Field label="Contacto de emergencia" value={form.emergenciaNombre} onChange={set('emergenciaNombre')} placeholder="Nombre" />
          <Field label="Teléfono de emergencia" value={form.emergenciaTel} onChange={set('emergenciaTel')} placeholder="300 000 0000" />
        </div>

        <FieldsetHeader>Colegio anterior</FieldsetHeader>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="Nombre del colegio" value={form.colegioAnterior} onChange={set('colegioAnterior')} placeholder="Institución de procedencia" />
          <Field label="Último grado cursado" value={form.ultimoGrado} onChange={set('ultimoGrado')} placeholder="9°" />
          <div style={{ flex: '1 1 220px' }}>
            <label style={labelStyle}>Boletín / certificado</label>
            <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: form.boletinNombre ? 'var(--fg-1)' : 'var(--fg-3)' }}>
              <Icon name="upload" size={15} stroke={2.2} />
              {form.boletinNombre || 'Adjuntar archivo'}
              <input type="file" style={{ display: 'none' }} onChange={(e) => setForm((p) => ({ ...p, boletinNombre: e.target.files[0]?.name || '' }))} />
            </label>
          </div>
        </div>
      </div>

      {error && <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--danger-500)', fontWeight: 600 }}>{error}</div>}

      <button onClick={submit} disabled={busy} style={{
        marginTop: 14, width: '100%', height: 52, border: 0, borderRadius: 14,
        background: 'var(--indigo-500)', color: '#fff', fontFamily: 'var(--font-sans)',
        fontWeight: 700, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
      }}>{busy ? 'Enviando…' : 'Enviar inscripción'}</button>
    </div>
  );
}
