'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({ unidades: 0, ativas: 0, pendentes: 0, receita: 0 });
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      setErro('');
      try {
        const now = new Date();
        const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const [u, a, p, r, c] = await Promise.all([
          supabase.from('unidades').select('*', { count: 'exact', head: true }),
          supabase.from('unidades').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
          supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
          supabase.from('pagamentos').select('valor').like('data_pagamento', `${mes}%`),
          supabase.from('cobrancas').select('*, unidades(endereco, numero_hidrometro, bairro_condominio)').order('criado_em', { ascending: false }).limit(5),
        ]);

        const receita = r.data?.reduce((s, pag) => s + Number(pag.valor), 0) || 0;
        setStats({ unidades: u.count || 0, ativas: a.count || 0, pendentes: p.count || 0, receita });
        setCobrancas(c.data || []);
      } catch {
        setErro('Erro ao carregar dados do dashboard.');
      }
    })();
  }, []);

  const cards = [
    { icon: '🏠', label: 'Total Unidades', value: stats.unidades, color: '#DBEAFE' },
    { icon: '✅', label: 'Ativas', value: stats.ativas, color: '#D1FAE5' },
    { icon: '⏳', label: 'Pendentes', value: stats.pendentes, color: '#FEF3C7' },
    { icon: '💰', label: 'Receita Mês', value: `R$ ${stats.receita.toFixed(2).replace('.', ',')}`, color: '#EDE9FE' },
  ];

  return (
    <div>
      {erro && <p style={{ color: '#DC2626', marginBottom: 16 }}>{erro}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{c.icon}</div>
            <div>
              <div style={{ color: '#64748B', fontSize: '0.85rem' }}>{c.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Últimas Cobranças</h3>
        <table>
          <thead>
            <tr><th>Unidade</th><th>Bairro</th><th>Mês</th><th>Valor</th><th>Status</th></tr>
          </thead>
          <tbody>
            {cobrancas.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma cobrança</td></tr>
            ) : cobrancas.map(c => (
              <tr key={c.id}>
                <td>{c.unidades?.endereco} - {c.unidades?.numero_hidrometro}</td>
                <td>{c.unidades?.bairro_condominio}</td>
                <td>{c.mes}</td>
                <td>R$ {Number(c.valor_total).toFixed(2).replace('.', ',')}</td>
                <td><span className={`badge badge-${c.status === 'pago' ? 'success' : c.status === 'atrasado' ? 'danger' : 'warning'}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
