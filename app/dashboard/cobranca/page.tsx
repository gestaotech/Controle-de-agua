'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '../layout';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const lbl = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' as const };

export default function CobrancaPage() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [config, setConfig] = useState({ empresa: 'Saneamento Básico', valor_m3: 8.50, taxa_fixa: 15.00 });
  const [form, setForm] = useState({ cliente_id: '', mes: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'), valor_m3: 8.50, taxa_fixa: 15.00, vencimento: '' });
  const [consumo, setConsumo] = useState('');
  const [total, setTotal] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const supabase = createClient();

  const load = async () => {
    let q = supabase.from('cobrancas').select('*, clientes(nome, numero_hidrometro, endereco)');
    if (busca) q = q.ilike('clientes.nome', `%${busca}%`);
    if (filtro) q = q.eq('status', filtro);
    const [c, cl, cfg] = await Promise.all([
      q.order('criado_em', { ascending: false }),
      supabase.from('clientes').select('id, nome, numero_hidrometro').eq('status', 'ativo').order('nome'),
      supabase.from('config').select('*').limit(1),
    ]);
    setCobrancas(c.data || []);
    setClientes(cl.data || []);
    if (cfg.data?.[0]) setConfig({ empresa: cfg.data[0].empresa, valor_m3: cfg.data[0].valor_m3, taxa_fixa: cfg.data[0].taxa_fixa });
  };

  useEffect(() => { load(); }, [busca, filtro]);

  const loadLeitura = async (clienteId: string, mes: string) => {
    if (!clienteId || !mes) { setConsumo(''); return; }
    const { data } = await supabase.from('leituras').select('consumo').eq('cliente_id', clienteId).eq('mes', mes).maybeSingle();
    if (data) {
      setConsumo(data.consumo);
      setTotal(`R$ ${(Number(data.consumo) * form.valor_m3 + form.taxa_fixa).toFixed(2).replace('.', ',')}`);
    } else {
      setConsumo('Leitura não encontrada');
      setTotal('');
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id || !form.vencimento) return alert('Preencha todos os campos');
    const { data: leitura } = await supabase.from('leituras').select('consumo').eq('cliente_id', form.cliente_id).eq('mes', form.mes).maybeSingle();
    if (!leitura) return alert('Leitura não encontrada para este mês');
    const existe = await supabase.from('cobrancas').select('*').eq('cliente_id', form.cliente_id).eq('mes', form.mes).maybeSingle();
    if (existe.data) return alert('Já existe cobrança para este mês');
    await supabase.from('cobrancas').insert({
      cliente_id: form.cliente_id, mes: form.mes, consumo: Number(leitura.consumo),
      valor_m3: form.valor_m3, taxa_fixa: form.taxa_fixa,
      valor_total: Number(leitura.consumo) * form.valor_m3 + form.taxa_fixa,
      vencimento: form.vencimento, usuario_id: user?.id, status: 'pendente',
    });
    setForm(f => ({ ...f, cliente_id: '', vencimento: '' }));
    setConsumo('');
    setTotal('');
    load();
  };

  const marcarPago = async (id: string) => {
    if (!confirm('Marcar como pago?')) return;
    await supabase.from('cobrancas').update({ status: 'pago' }).eq('id', id);
    load();
  };

  const del = async (id: string) => {
    if (!confirm('Excluir esta cobrança?')) return;
    await supabase.from('cobrancas').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Nova Cobrança</h3>
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={lbl}>Cliente *</label>
            <select style={inp} value={form.cliente_id} onChange={e => { setForm({ ...form, cliente_id: e.target.value }); loadLeitura(e.target.value, form.mes); }} required>
              <option value="">Selecione</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Mês *</label>
            <input type="month" style={inp} value={form.mes} onChange={e => { setForm({ ...form, mes: e.target.value }); loadLeitura(form.cliente_id, e.target.value); }} required />
          </div>
          <div><label style={lbl}>Consumo</label><input style={{ ...inp, background: '#F8FAFC' }} value={consumo} readOnly /></div>
          <div><label style={lbl}>Valor/m³</label><input type="number" step="0.01" style={inp} value={form.valor_m3} onChange={e => setForm({ ...form, valor_m3: parseFloat(e.target.value) || 0 })} /></div>
          <div><label style={lbl}>Taxa Fixa</label><input type="number" step="0.01" style={inp} value={form.taxa_fixa} onChange={e => setForm({ ...form, taxa_fixa: parseFloat(e.target.value) || 0 })} /></div>
          <div><label style={lbl}>Total</label><input style={{ ...inp, background: '#F8FAFC' }} value={total} readOnly /></div>
          <div><label style={lbl}>Vencimento *</label><input type="date" style={inp} value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} required /></div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Gerar Boleto</button>
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input placeholder="Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)} style={{ ...inp, maxWidth: 250 }} />
          <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...inp, maxWidth: 180 }}>
            <option value="">Todos</option><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option>
          </select>
        </div>
        <table>
          <thead><tr><th>Cliente</th><th>Mês</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {cobrancas.map(c => (
              <tr key={c.id}>
                <td>{c.clientes?.nome}</td><td>{c.mes}</td><td>R$ {Number(c.valor_total).toFixed(2).replace('.', ',')}</td>
                <td>{new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td><span className={`badge badge-${c.status === 'pago' ? 'success' : c.status === 'atrasado' ? 'danger' : 'warning'}`}>{c.status}</span></td>
                <td>
                  {c.status === 'pendente' && <button onClick={() => marcarPago(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Marcar Pago">✅</button>}
                  <button onClick={() => del(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Excluir">🗑️</button>
                </td>
              </tr>
            ))}
            {cobrancas.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma cobrança</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
