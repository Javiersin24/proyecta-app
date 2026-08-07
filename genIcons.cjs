import { useEffect, useState } from 'react';
import { get } from '../../lib/api.js';
import { fmtCOP, fmtFecha } from '../../lib/format.js';
import { Screen } from '../../ui/Screen.jsx';
import { Chip } from '../../ui/kit.jsx';

const PLAN_COLOR = { Campus: 'var(--indigo-500)', Plantel: 'var(--coral-500)', Aula: 'var(--success-500)' };

export default function SuperFacturacion() {
  const [data, setData] = useState(null);
  useEffect(() => { get('/superadmin/facturacion').then(setData); }, []);
  if (!data) return null;

  const serie = data.ingresosMensuales;
  const max = Math.max(...serie.map((r) => r.n));
  const crecimiento = serie.length > 1 ? ((serie.at(-1).n - serie.at(-2).n) / serie.at(-2).n) * 100 : 0;
  const totalPlan = data.desglosePlan.reduce((t, p) => t + p.monto, 0) || 1;

  return (
    <Screen>
      <div className="h2" style={{ marginBottom: 14 }}>Ingresos</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
        {[
          { l: 'Ingreso mensual (MRR)', v: fmtCOP(data.mrr), sub: `${crecimiento >= 0 ? '▲ ' : '▼ '}${Math.abs(crecimiento).toFixed(1)}% vs mes anterior`, good: crecimiento >= 0 },
          { l: 'Ingreso anual (ARR)', v: fmtCOP(data.arr), sub: 'proyección' },
          { l: 'Próximas renovaciones', v: data.renovaciones.filter((r) => r.proxima).length, sub: 'en 30 días o menos', warn: data.renovaciones.some((r) => r.proxima) },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '15px 16px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--fg-3)', textTransform: 'uppercase', fontWeight: 700 }}>{k.l}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 24, marginTop: 6 }}>{k.v}</div>
            <div style={{ fontSize: 11.5, color: k.warn ? 'var(--coral-600)' : k.good ? '#1a6b47' : 'var(--fg-3)', marginTop: 3, fontWeight: 600 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', marginTop: 16 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Ingresos recurrentes · últimos 6 meses</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160 }}>
          {serie.map((r, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)' }}>${r.n.toFixed(0)}M</span>
              <div style={{ width: '100%', maxWidth: 44, height: (r.n / max) * 110 + 'px', borderRadius: '8px 8px 0 0', background: i === serie.length - 1 ? 'var(--coral-500)' : 'var(--indigo-400)' }} />
              <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 600 }}>{r.m}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', marginTop: 16 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Ingreso mensual por plan</div>
        <div style={{ display: 'flex', height: 12, borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
          {data.desglosePlan.map((p) => <div key={p.plan} style={{ width: (p.monto / totalPlan) * 100 + '%', background: PLAN_COLOR[p.plan] || 'var(--ink-400)' }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.desglosePlan.map((p) => (
            <div key={p.plan} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: PLAN_COLOR[p.plan] || 'var(--ink-400)' }} />
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.plan}</span>
              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 80, textAlign: 'right' }}>{fmtCOP(p.monto)}</span>
            </div>
          ))}
        </div>
      </div>

      {data.renovaciones.length > 0 && (
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: '16px 18px', marginTop: 16 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Próximas renovaciones</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.renovaciones.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{r.colegio}</span>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{fmtFecha(r.renueva)}</span>
                <Chip variant={r.dias <= 7 ? 'warning' : 'info'}>{r.dias >= 0 ? `en ${r.dias} días` : 'vencida'}</Chip>
              </div>
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}
