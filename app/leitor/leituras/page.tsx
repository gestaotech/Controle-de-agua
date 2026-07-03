'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const lbl = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' as const };

export default function LeitorLeiturasPage() {
  const { user, profile } = useAuth();
  const [unidades, setUnidades] = useState<any[]>([]);
  const [leituras, setLeituras] = useState<any[]>([]);
  const [form, setForm] = useState({
    unidade_id: '', mes: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
    anterior: 0, atual: 0,
  });
  const [consumo, setConsumo] = useState(0);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  const load = async () => {
    if (!user || !profile) return;
    setErro('');
    try {
      const bairro = profile.bairro_condominio;
      const [u, l] = await Promise.all([
        supabase.from('unidades').select('id, endereco, numero_hidrometro, leitura_inicial').eq('bairro_condominio', bairro).eq('status', 'ativo').order('endereco'),
        supabase.from('leituras').select('*, unidades(endereco, numero_hidrometro)').eq('usuario_id', user.id).order('mes', { ascending: false }),
      ]);
      setUnidades(u.data || []);
      setLeituras(l.data || []);
    } catch {
      setErro('Erro ao carregar leituras.');
    }
  };

  useEffect(() => { load(); }, [user, profile]);
  useEffect(() => { setConsumo(form.atual - form.anterior); }, [form.atual, form.anterior]);

  const loadAnterior = async (unidadeId: string) => {
    if (!unidadeId) return;
    const { data } = await supabase.from('leituras').select('*').eq('unidade_id', unidadeId).order('mes', { ascending: false }).limit(1).maybeSingle();
    if (data) {
      setForm(f => ({ ...f, anterior: data.atual || 0 }));
    } else {
      const { data: unidade } = await supabase.from('unidades').select('leitura_inicial').eq('id', unidadeId).single();
      setForm(f => ({ ...f, anterior: Number(unidade?.leitura_inicial) || 0 }));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.unidade_id || form.atual < form.anterior) return alert('Verifique os dados');
    try {
      const existente = await supabase.from('leituras').select('*').eq('unidade_id', form.unidade_id).eq('mes', form.mes).maybeSingle();
      if (existente.data) {
        await supabase.from('leituras').update({ anterior: form.anterior, atual: form.atual }).eq('id', existente.data.id);
      } else {
        await supabase.from('leituras').insert({ unidade_id: form.unidade_id, mes: form.mes, anterior: form.anterior, atual: form.atual, usuario_id: user?.id });
      }
      setForm(f => ({ ...f, atual: 0 }));
      load();
    } catch {
      alert('Erro ao salvar leitura.');
    }
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Nova Leitura</h3>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={lbl}>Unidade *</label>
            <select style={inp} value={form.unidade_id} onChange={e => { setForm({ ...form, unidade_id: e.target.value }); loadAnterior(e.target.value); }} required>
              <option value="">Selecione</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.endereco} ({u.numero_hidrometro})</option>)}
            </select>
          </div>
          <div><label style={lbl}>Mês/Ano *</label><input type="month" style={inp} value={form.mes} onChange={e => setForm({ ...form, mes: e.target.value })} required /></div>
          <div><label style={lbl}>Anterior (m³)</label><input type="number" style={{ ...inp, background: '#F8FAFC' }} value={form.anterior} readOnly /></div>
          <div><label style={lbl}>Atual (m³) *</label><input type="number" step="0.01" style={inp} value={form.atual || ''} onChange={e => setForm({ ...form, atual: parseFloat(e.target.value) || 0 })} required /></div>
          <div><label style={lbl}>Consumo (m³)</label><input style={{ ...inp, background: '#F8FAFC' }} value={consumo.toFixed(2)} readOnly /></div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Registrar</button>
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Minhas Leituras</h3>
        <table>
          <thead><tr><th>Unidade</th><th>Mês</th><th>Anterior</th><th>Atual</th><th>Consumo</th></tr></thead>
          <tbody>
            {leituras.map(l => (
              <tr key={l.id}>
                <td>{l.unidades?.endereco} - {l.unidades?.numero_hidrometro}</td>
                <td>{l.mes}</td>
                <td>{l.anterior} m³</td>
                <td>{l.atual} m³</td>
                <td><strong>{l.consumo} m³</strong></td>
              </tr>
            ))}
            {leituras.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma leitura</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
