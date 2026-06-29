'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import StatsCard from '@/components/features/dashboard/StatsCard';
import styles from './page.module.css';

interface Stats {
  totalClientes: number;
  clientesAtivos: number;
  pendentes: number;
  receita: number;
}

interface Cobranca {
  id: string;
  mes: string;
  valor_total: number;
  status: string;
  clientes: { nome: string } | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalClientes: 0,
    clientesAtivos: 0,
    pendentes: 0,
    receita: 0,
  });
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = createClient();
    const now = new Date();
    const mesAtual = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    const [totalClientes, clientesAtivos, pendentes, pagamentosMes, ultimasCobrancas] = await Promise.all([
      db.from('clientes').select('*', { count: 'exact', head: true }),
      db.from('clientes').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
      db.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      db.from('pagamentos').select('valor').like('data_pagamento', `${mesAtual}%`),
      db.from('cobrancas').select('*, clientes(nome)').order('criado_em', { ascending: false }).limit(5),
    ]);

    const receita = pagamentosMes.data
      ? pagamentosMes.data.reduce((sum, p) => sum + parseFloat(p.valor), 0)
      : 0;

    setStats({
      totalClientes: totalClientes.count || 0,
      clientesAtivos: clientesAtivos.count || 0,
      pendentes: pendentes.count || 0,
      receita,
    });

    setCobrancas(ultimasCobrancas.data || []);
    setLoading(false);
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <StatsCard icon="👤" title="Total Clientes" value={stats.totalClientes} color="blue" />
        <StatsCard icon="✅" title="Clientes Ativos" value={stats.clientesAtivos} color="green" />
        <StatsCard icon="⏳" title="Pendentes" value={stats.pendentes} color="orange" />
        <StatsCard icon="💰" title="Receita Mês" value={formatCurrency(stats.receita)} color="purple" />
      </div>

      <div className={styles.card}>
        <h3>Últimas Cobranças</h3>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Mês</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cobrancas.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  Nenhuma cobrança encontrada
                </td>
              </tr>
            ) : (
              cobrancas.map(c => (
                <tr key={c.id}>
                  <td>{c.clientes?.nome || 'N/A'}</td>
                  <td>{formatMonthYear(c.mes)}</td>
                  <td>{formatCurrency(c.valor_total)}</td>
                  <td>
                    <span className={`badge badge-${c.status === 'pago' ? 'success' : c.status === 'pendente' ? 'warning' : 'danger'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
