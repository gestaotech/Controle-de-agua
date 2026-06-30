'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };

export default function RelatoriosPage() {
  const [mesInicio, setMesInicio] = useState('');
  const [mesFim, setMesFim] = useState('');
  const [faturamento, setFaturamento] = useState<any[]>([]);
  const [inadimplencia, setInadimplencia] = useState<any[]>([]);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  const genFaturamento = async () => {
    if (!mesInicio || !mesFim) return alert('Selecione o período');
    setErro('');
    try {
      const { data } = await supabase.from('cobrancas').select('*, clientes(nome)').gte('mes', mesInicio).lte('mes', mesFim).order('mes');
      setFaturamento(data || []);
    } catch {
      setErro('Erro ao gerar relatório de faturamento.');
    }
  };

  const genInadimplencia = async () => {
    setErro('');
    try {
      const { data } = await supabase.from('cobrancas').select('*, clientes(nome, telefone)').in('status', ['pendente', 'atrasado']).order('vencimento');
      const hoje = new Date();
      setInadimplencia((data || []).map(c => ({
        ...c,
        dias: Math.floor((hoje.getTime() - new Date(c.vencimento).getTime()) / 86400000),
      })));
    } catch {
      setErro('Erro ao gerar relatório de inadimplência.');
    }
  };

  const exportCSV = async (tipo: string) => {
    try {
      let data: any[] = [];
      if (tipo === 'clientes') { const { data: d } = await supabase.from('clientes').select('*').order('nome'); data = d || []; }
      if (tipo === 'leituras') { const { data: d } = await supabase.from('leituras').select('*, clientes(nome)'); data = d || []; }
      if (tipo === 'cobrancas') { const { data: d } = await supabase.from('cobrancas').select('*, clientes(nome)'); data = d || []; }
      if (tipo === 'pagamentos') { const { data: d } = await supabase.from('pagamentos').select('*'); data = d || []; }
      if (!data.length) return alert('Nenhum dado para exportar');
      const headers = Object.keys(data[0]);
      const csv = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${tipo}.csv`;
      a.click();
    } catch {
      alert('Erro ao exportar dados.');
    }
  };

  const totalFat = faturamento.reduce((s, f) => s + Number(f.valor_total), 0);
  const totalInad = inadimplencia.reduce((s, i) => s + Number(i.valor_total), 0);

  return (
    <div>
      {erro && <p style={{ color: '#DC2626', marginBottom: 16 }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['clientes', 'leituras', 'cobrancas', 'pagamentos'].map(t => (
          <button key={t} onClick={() => exportCSV(t)} style={{ padding: '0.625rem 1.25rem', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>📋 Exportar {t}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: 16, color: '#64748B' }}>Relatório de Faturamento</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input type="month" value={mesInicio} onChange={e => setMesInicio(e.target.value)} style={inp} />
            <input type="month" value={mesFim} onChange={e => setMesFim(e.target.value)} style={inp} />
            <button onClick={genFaturamento} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>Gerar</button>
          </div>
          {faturamento.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 20, padding: 12, background: '#F8FAFC', borderRadius: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <div><strong>Total:</strong> R$ {totalFat.toFixed(2).replace('.', ',')}</div>
                <div><strong>Pagos:</strong> {faturamento.filter(f => f.status === 'pago').length}</div>
                <div><strong>Pendentes:</strong> {faturamento.filter(f => f.status !== 'pago').length}</div>
              </div>
              <table>
                <thead><tr><th>Cliente</th><th>Mês</th><th>Valor</th><th>Status</th></tr></thead>
                <tbody>{faturamento.map((f, i) => (
                  <tr key={i}>
                    <td>{f.clientes?.nome}</td><td>{f.mes}</td>
                    <td>R$ {Number(f.valor_total).toFixed(2).replace('.', ',')}</td>
                    <td><span className={`badge badge-${f.status === 'pago' ? 'success' : 'warning'}`}>{f.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: 16, color: '#64748B' }}>Inadimplência</h3>
          <button onClick={genInadimplencia} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 16 }}>Gerar Relatório</button>
          {inadimplencia.length > 0 && (
            <>
              <div style={{ display: 'flex', gap: 20, padding: 12, background: '#F8FAFC', borderRadius: 8, marginBottom: 16 }}>
                <div><strong>Total:</strong> R$ {totalInad.toFixed(2).replace('.', ',')}</div>
                <div><strong>Clientes:</strong> {inadimplencia.length}</div>
              </div>
              <table>
                <thead><tr><th>Cliente</th><th>Valor</th><th>Vencimento</th><th>Dias</th></tr></thead>
                <tbody>{inadimplencia.map((c, i) => (
                  <tr key={i}>
                    <td>{c.clientes?.nome}</td>
                    <td>R$ {Number(c.valor_total).toFixed(2).replace('.', ',')}</td>
                    <td>{new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td><span className="badge badge-danger">{c.dias > 0 ? `${c.dias} dias` : 'A vencer'}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
