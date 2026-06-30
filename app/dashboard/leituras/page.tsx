'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const lbl = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' as const };

export default function LeiturasPage() {
  const { user, isAdmin } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [leituras, setLeituras] = useState<any[]>([]);
  const [form, setForm] = useState({ cliente_id: '', mes: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'), anterior: 0, atual: 0 });
  const [consumo, setConsumo] = useState(0);
  const [fatura, setFatura] = useState<any>(null);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  const load = async () => {
    setErro('');
    try {
      const [c, l] = await Promise.all([
        supabase.from('clientes').select('id, nome, numero_hidrometro').eq('status', 'ativo').order('nome'),
        supabase.from('leituras').select('*, clientes(nome, numero_hidrometro)').order('mes', { ascending: false }),
      ]);
      setClientes(c.data || []);
      setLeituras(l.data || []);
    } catch {
      setErro('Erro ao carregar leituras.');
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setConsumo(form.atual - form.anterior); }, [form.atual, form.anterior]);

  const loadAnterior = async (clienteId: string) => {
    if (!clienteId) return;
    const { data } = await supabase.from('leituras').select('*').eq('cliente_id', clienteId).order('mes', { ascending: false }).limit(1).maybeSingle();
    setForm(f => ({ ...f, anterior: data?.atual || 0 }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id || form.atual < form.anterior) return alert('Verifique os dados');
    try {
      const existente = await supabase.from('leituras').select('*').eq('cliente_id', form.cliente_id).eq('mes', form.mes).maybeSingle();
      if (existente.data) {
        await supabase.from('leituras').update({ anterior: form.anterior, atual: form.atual }).eq('id', existente.data.id);
      } else {
        await supabase.from('leituras').insert({ ...form, usuario_id: user?.id });
      }
      setForm(f => ({ ...f, atual: 0 }));
      load();
    } catch {
      alert('Erro ao salvar leitura. Tente novamente.');
    }
  };

  const gerarFatura = async (leitura: any) => {
    try {
      const { data: cfg } = await supabase.from('config').select('*').limit(1);
      const c = cfg?.[0] || { empresa: 'Saneamento Básico', valor_m3: 8.50, taxa_fixa: 15.00 };
      const venc = new Date();
      venc.setDate(venc.getDate() + 10);
      setFatura({
        cliente: leitura.clientes,
        mes: leitura.mes,
        consumo: leitura.consumo,
        valorM3: Number(c.valor_m3),
        taxaFixa: Number(c.taxa_fixa),
        valorTotal: Number(leitura.consumo) * Number(c.valor_m3) + Number(c.taxa_fixa),
        vencimento: venc.toISOString().split('T')[0],
        empresa: c.empresa,
        codigo: 'AG' + Date.now().toString().slice(-8),
      });
    } catch {
      alert('Erro ao gerar fatura.');
    }
  };

  const fecharFatura = () => setFatura(null);

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Nova Leitura</h3>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={lbl}>Cliente *</label>
            <select style={inp} value={form.cliente_id} onChange={e => { setForm({ ...form, cliente_id: e.target.value }); loadAnterior(e.target.value); }} required>
              <option value="">Selecione</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.numero_hidrometro})</option>)}
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
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Histórico de Leituras</h3>
        <table>
          <thead><tr><th>Cliente</th><th>Mês</th><th>Anterior</th><th>Atual</th><th>Consumo</th><th>Ações</th></tr></thead>
          <tbody>
            {leituras.map(l => (
              <tr key={l.id}>
                <td>{l.clientes?.nome}</td><td>{l.mes}</td><td>{l.anterior} m³</td><td>{l.atual} m³</td><td><strong>{l.consumo} m³</strong></td>
                <td>
                  <button onClick={() => gerarFatura(l)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Gerar Fatura">📄</button>
                  {(isAdmin || l.usuario_id === user?.id) && (
                    <button onClick={async () => { if (confirm('Excluir?')) { await supabase.from('leituras').delete().eq('id', l.id); load(); } }} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Excluir">🗑️</button>
                  )}
                </td>
              </tr>
            ))}
            {leituras.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma leitura</td></tr>}
          </tbody>
        </table>
      </div>

      {fatura && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={e => { if (e.target === e.currentTarget) fecharFatura(); }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 550, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1E293B', paddingBottom: 16, marginBottom: 20 }}>
              <h2>{fatura.empresa}</h2>
              <p style={{ color: '#64748B' }}>FATURA DE FORNECIMENTO DE ÁGUA</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Cliente</label><div>{fatura.cliente.nome}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Hidrômetro</label><div>{fatura.cliente.numero_hidrometro}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Referência</label><div>{fatura.mes}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Consumo</label><div>{fatura.consumo} m³</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Vencimento</label><div>{new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div></div>
            </div>
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 8, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ color: '#64748B', fontSize: '0.85rem' }}>VALOR TOTAL</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3B82F6' }}>R$ {fatura.valorTotal.toFixed(2).replace('.', ',')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 8 }}>Código</div>
                <div style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '8px 16px', borderRadius: 4 }}>{fatura.codigo}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => window.print()} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>🖨️ Imprimir</button>
              <button onClick={fecharFatura} style={{ padding: '0.625rem 1.5rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
