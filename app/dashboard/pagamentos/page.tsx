'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const lbl = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' as const };

export default function PagamentosPage() {
  const [pendentes, setPendentes] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [form, setForm] = useState({ cobranca_id: '', data_pagamento: new Date().toISOString().split('T')[0], valor: '', metodo: 'dinheiro' });
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [erro, setErro] = useState('');
  const supabase = createClient();

  const load = async () => {
    setErro('');
    try {
      let pq = supabase.from('pagamentos').select('*, cobrancas(mes, clientes(nome))');
      if (filtroInicio) pq = pq.gte('data_pagamento', `${filtroInicio}-01`);
      if (filtroFim) {
        const [ano, mes] = filtroFim.split('-').map(Number);
        const proximoMes = new Date(ano, mes, 1).toISOString().split('T')[0];
        pq = pq.lt('data_pagamento', proximoMes);
      }
      const [p, c] = await Promise.all([
        pq.order('data_pagamento', { ascending: false }),
        supabase.from('cobrancas').select('*, clientes(nome)').eq('status', 'pendente').order('vencimento'),
      ]);
      setPagamentos(p.data || []);
      setPendentes(c.data || []);
    } catch {
      setErro('Erro ao carregar pagamentos.');
    }
  };

  useEffect(() => { load(); }, [filtroInicio, filtroFim]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cobranca_id || !form.valor) return alert('Preencha os campos');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('pagamentos').insert({ ...form, valor: parseFloat(form.valor), usuario_id: user?.id });
      await supabase.from('cobrancas').update({ status: 'pago' }).eq('id', form.cobranca_id);
      setForm({ cobranca_id: '', data_pagamento: new Date().toISOString().split('T')[0], valor: '', metodo: 'dinheiro' });
      load();
    } catch {
      alert('Erro ao registrar pagamento. Tente novamente.');
    }
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Registrar Pagamento</h3>
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <label style={lbl}>Boleto *</label>
            <select style={inp} value={form.cobranca_id} onChange={e => {
              const cob = pendentes.find(p => p.id === e.target.value);
              setForm({ ...form, cobranca_id: e.target.value, valor: cob ? cob.valor_total : '' });
            }} required>
              <option value="">Selecione um boleto pendente</option>
              {pendentes.map(c => (
                <option key={c.id} value={c.id}>{c.clientes?.nome} - R$ {Number(c.valor_total).toFixed(2).replace('.', ',')}</option>
              ))}
            </select>
          </div>
          <div><label style={lbl}>Data Pagamento *</label><input type="date" style={inp} value={form.data_pagamento} onChange={e => setForm({ ...form, data_pagamento: e.target.value })} required /></div>
          <div><label style={lbl}>Valor Pago (R$) *</label><input type="number" step="0.01" style={inp} value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} required /></div>
          <div>
            <label style={lbl}>Método</label>
            <select style={inp} value={form.metodo} onChange={e => setForm({ ...form, metodo: e.target.value })}>
              <option value="dinheiro">Dinheiro</option><option value="pix">PIX</option><option value="transferencia">Transferência</option><option value="cartao">Cartão</option>
            </select>
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Registrar</button>
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Histórico de Pagamentos</h3>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ fontWeight: 500, color: '#64748B', fontSize: '0.85rem' }}>De:</label>
          <input type="month" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} style={{ ...inp, maxWidth: 200 }} />
          <label style={{ fontWeight: 500, color: '#64748B', fontSize: '0.85rem' }}>Até:</label>
          <input type="month" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} style={{ ...inp, maxWidth: 200 }} />
        </div>
        <table>
          <thead><tr><th>Cliente</th><th>Mês Ref.</th><th>Valor</th><th>Data</th><th>Método</th></tr></thead>
          <tbody>
            {pagamentos.map(p => (
              <tr key={p.id}>
                <td>{p.cobrancas?.clientes?.nome || '-'}</td>
                <td>{p.cobrancas?.mes || '-'}</td>
                <td>R$ {Number(p.valor).toFixed(2).replace('.', ',')}</td>
                <td>{new Date(p.data_pagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td><span className="badge badge-info">{p.metodo}</span></td>
              </tr>
            ))}
            {pagamentos.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhum pagamento</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
