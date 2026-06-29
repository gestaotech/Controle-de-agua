'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

const inputStyle = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const labelStyle = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' };

export default function ConfigPage() {
  const [config, setConfig] = useState({ empresa: '', valor_m3: 8.50, taxa_fixa: 15.00, multa: 2.00, juros: 1.00 });
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('config').select('*').limit(1);
      if (data?.[0]) setConfig({ empresa: data[0].empresa, valor_m3: data[0].valor_m3, taxa_fixa: data[0].taxa_fixa, multa: data[0].multa, juros: data[0].juros });
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.from('config').select('id').limit(1);
    if (data?.[0]) await supabase.from('config').update(config).eq('id', data[0].id);
    else await supabase.from('config').insert(config);
    alert('Salvo!');
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Configurações</h3>
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, maxWidth: 600 }}>
        <div><label style={labelStyle}>Empresa</label><input style={inputStyle} value={config.empresa} onChange={e => setConfig({ ...config, empresa: e.target.value })} /></div>
        <div><label style={labelStyle}>Valor/m³ (R$)</label><input type="number" step="0.01" style={inputStyle} value={config.valor_m3} onChange={e => setConfig({ ...config, valor_m3: parseFloat(e.target.value) || 0 })} /></div>
        <div><label style={labelStyle}>Taxa Fixa (R$)</label><input type="number" step="0.01" style={inputStyle} value={config.taxa_fixa} onChange={e => setConfig({ ...config, taxa_fixa: parseFloat(e.target.value) || 0 })} /></div>
        <div><label style={labelStyle}>Multa (%)</label><input type="number" step="0.01" style={inputStyle} value={config.multa} onChange={e => setConfig({ ...config, multa: parseFloat(e.target.value) || 0 })} /></div>
        <div><label style={labelStyle}>Juros (%)</label><input type="number" step="0.01" style={inputStyle} value={config.juros} onChange={e => setConfig({ ...config, juros: parseFloat(e.target.value) || 0 })} /></div>
        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Salvar</button>
        </div>
      </form>
    </div>
  );
}
