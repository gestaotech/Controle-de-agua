'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMonthYear, formatCurrency, formatDate } from '@/lib/utils';
import styles from './page.module.css';

interface Faturamento {
  nome: string;
  mes: string;
  valor_total: number;
  status: string;
}

interface Inadimplencia {
  nome: string;
  telefone: string | null;
  mes: string;
  valor_total: number;
  vencimento: string;
  dias: number;
}

export default function RelatoriosPage() {
  const [mesInicio, setMesInicio] = useState('');
  const [mesFim, setMesFim] = useState('');
  const [faturamento, setFaturamento] = useState<Faturamento[]>([]);
  const [inadimplencia, setInadimplencia] = useState<Inadimplencia[]>([]);

  const gerarFaturamento = async () => {
    if (!mesInicio || !mesFim) {
      alert('Selecione o período!');
      return;
    }

    const db = createClient();
    const { data } = await db
      .from('cobrancas')
      .select('*, clientes(nome)')
      .gte('mes', mesInicio)
      .lte('mes', mesFim)
      .order('mes');

    setFaturamento(data || []);
  };

  const gerarInadimplencia = async () => {
    const db = createClient();
    const { data } = await db
      .from('cobrancas')
      .select('*, clientes(nome, telefone)')
      .in('status', ['pendente', 'atrasado'])
      .order('vencimento');

    if (data) {
      const hoje = new Date();
      const withDias = data.map(c => ({
        nome: c.clientes?.nome || 'N/A',
        telefone: c.clientes?.telefone,
        mes: c.mes,
        valor_total: c.valor_total,
        vencimento: c.vencimento,
        dias: Math.floor((hoje.getTime() - new Date(c.vencimento).getTime()) / (1000 * 60 * 60 * 24)),
      }));
      setInadimplencia(withDias);
    }
  };

  const exportCSV = async (tipo: string) => {
    const db = createClient();
    let data: any[] = [];
    let filename = '';

    switch (tipo) {
      case 'clientes':
        const { data: clientes } = await db.from('clientes').select('*').order('nome');
        data = clientes || [];
        filename = 'clientes.csv';
        break;
      case 'leituras':
        const { data: leituras } = await db.from('leituras').select('*, clientes(nome)').order('mes', { ascending: false });
        data = leituras || [];
        filename = 'leituras.csv';
        break;
      case 'cobrancas':
        const { data: cobrancas } = await db.from('cobrancas').select('*, clientes(nome)').order('criado_em', { ascending: false });
        data = cobrancas || [];
        filename = 'cobrancas.csv';
        break;
      case 'pagamentos':
        const { data: pagamentos } = await db.from('pagamentos').select('*, cobrancas(clientes(nome), mes)').order('data_pagamento', { ascending: false });
        data = pagamentos || [];
        filename = 'pagamentos.csv';
        break;
    }

    if (data.length === 0) {
      alert('Nenhum dado para exportar!');
      return;
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        let val = row[h];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) val = `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const totalFaturado = faturamento.reduce((sum, f) => sum + f.valor_total, 0);
  const totalInadimplente = inadimplencia.reduce((sum, i) => sum + i.valor_total, 0);

  return (
    <div className={styles.container}>
      <div className={styles.exportButtons}>
        <button onClick={() => exportCSV('clientes')}>📋 Exportar Clientes</button>
        <button onClick={() => exportCSV('leituras')}>📋 Exportar Leituras</button>
        <button onClick={() => exportCSV('cobrancas')}>📋 Exportar Cobranças</button>
        <button onClick={() => exportCSV('pagamentos')}>📋 Exportar Pagamentos</button>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Relatório de Faturamento</h3>
          <div className={styles.formInline}>
            <input type="month" value={mesInicio} onChange={e => setMesInicio(e.target.value)} />
            <input type="month" value={mesFim} onChange={e => setMesFim(e.target.value)} />
            <button onClick={gerarFaturamento} className={styles.primary}>Gerar</button>
          </div>

          {faturamento.length > 0 && (
            <>
              <div className={styles.summary}>
                <div><strong>Total:</strong> {formatCurrency(totalFaturado)}</div>
                <div><strong>Pagos:</strong> {faturamento.filter(f => f.status === 'pago').length}</div>
                <div><strong>Pendentes:</strong> {faturamento.filter(f => f.status !== 'pago').length}</div>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Mês</th>
                    <th>Valor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {faturamento.map((f, i) => (
                    <tr key={i}>
                      <td>{f.nome}</td>
                      <td>{formatMonthYear(f.mes)}</td>
                      <td>{formatCurrency(f.valor_total)}</td>
                      <td><span className={`badge badge-${f.status === 'pago' ? 'success' : 'warning'}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className={styles.card}>
          <h3>Inadimplência</h3>
          <button onClick={gerarInadimplencia} className={styles.primary}>Gerar Relatório</button>

          {inadimplencia.length > 0 && (
            <>
              <div className={styles.summary}>
                <div><strong>Total:</strong> {formatCurrency(totalInadimplente)}</div>
                <div><strong>Clientes:</strong> {inadimplencia.length}</div>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Mês</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {inadimplencia.map((i, idx) => (
                    <tr key={idx}>
                      <td>{i.nome}</td>
                      <td>{formatMonthYear(i.mes)}</td>
                      <td>{formatCurrency(i.valor_total)}</td>
                      <td>{formatDate(i.vencimento)}</td>
                      <td><span className="badge badge-danger">{i.dias > 0 ? `${i.dias} dias` : 'A vencer'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
