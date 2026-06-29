'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatMonthYear, formatCurrency, formatDate } from '@/lib/utils';
import PagamentoForm from '@/components/features/pagamentos/PagamentoForm';
import styles from './page.module.css';

interface Pagamento {
  id: string;
  data_pagamento: string;
  valor: number;
  metodo: string;
  cobrancas: {
    mes: string;
    clientes: { nome: string } | null;
  } | null;
}

interface CobrancaPendente {
  id: string;
  mes: string;
  valor_total: number;
  clientes: { nome: string } | null;
}

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [pendentes, setPendentes] = useState<CobrancaPendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');

  useEffect(() => {
    loadData();
  }, [filtroInicio, filtroFim, filtroMetodo]);

  const loadData = async () => {
    setLoading(true);
    const db = createClient();

    let pagamentosQuery = db
      .from('pagamentos')
      .select('*, cobrancas(mes, clientes(nome))');

    if (filtroInicio) {
      pagamentosQuery = pagamentosQuery.gte('data_pagamento', `${filtroInicio}-01`);
    }

    if (filtroFim) {
      const [year, month] = filtroFim.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      pagamentosQuery = pagamentosQuery.lte('data_pagamento', `${filtroFim}-${lastDay}`);
    }

    if (filtroMetodo) {
      pagamentosQuery = pagamentosQuery.eq('metodo', filtroMetodo);
    }

    const [pagamentosRes, pendentesRes] = await Promise.all([
      pagamentosQuery.order('data_pagamento', { ascending: false }),
      db.from('cobrancas').select('*, clientes(nome)').eq('status', 'pendente').order('vencimento'),
    ]);

    setPagamentos(pagamentosRes.data || []);
    setPendentes(pendentesRes.data || []);
    setLoading(false);
  };

  const handleSave = async (pagamento: { cobranca_id: string; data_pagamento: string; valor: number; metodo: string }) => {
    const db = createClient();
    const { user } = await db.auth.getUser();

    await db.from('pagamentos').insert({
      ...pagamento,
      usuario_id: user.id,
    });

    await db.from('cobrancas').update({ status: 'pago' }).eq('id', pagamento.cobranca_id);

    loadData();
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className={styles.container}>
      <PagamentoForm pendentes={pendentes} onSave={handleSave} />

      <div className={styles.card}>
        <h3>Histórico de Pagamentos</h3>

        <div className={styles.filters}>
          <input
            type="month"
            value={filtroInicio}
            onChange={e => setFiltroInicio(e.target.value)}
            placeholder="Período Início"
          />
          <input
            type="month"
            value={filtroFim}
            onChange={e => setFiltroFim(e.target.value)}
            placeholder="Período Fim"
          />
          <select value={filtroMetodo} onChange={e => setFiltroMetodo(e.target.value)}>
            <option value="">Todos</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="transferencia">Transferência</option>
            <option value="cartao">Cartão</option>
          </select>
        </div>

        {pagamentos.length === 0 ? (
          <p className={styles.empty}>Nenhum pagamento encontrado</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Mês</th>
                <th>Valor</th>
                <th>Data</th>
                <th>Método</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map(pagamento => (
                <tr key={pagamento.id}>
                  <td>{pagamento.cobrancas?.clientes?.nome || 'N/A'}</td>
                  <td>{formatMonthYear(pagamento.cobrancas?.mes || '')}</td>
                  <td>{formatCurrency(pagamento.valor)}</td>
                  <td>{formatDate(pagamento.data_pagamento)}</td>
                  <td><span className="badge badge-info">{pagamento.metodo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
