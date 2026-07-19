'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({ unidades: 0, ativas: 0, pendentes: 0, leitores: 0, leiturasMes: 0, cobrancasPendentes: 0, cobrancasPagas: 0 });
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  const load = async () => {
    setErro('');
    try {
      const mesAtual = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
      const [u, a, p, l, lm, cp, cg, c] = await Promise.all([
        supabase.from('unidades').select('*', { count: 'exact', head: true }),
        supabase.from('unidades').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('perfil', 'leitor'),
        supabase.from('leituras').select('*', { count: 'exact', head: true }).eq('mes', mesAtual),
        supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pago'),
        supabase.from('cobrancas').select('*, unidades!inner(endereco, numero_hidrometro, bairros!inner(nome))').order('criado_em', { ascending: false }).limit(10),
      ]);

      setStats({
        unidades: u.count || 0,
        ativas: a.count || 0,
        pendentes: p.count || 0,
        leitores: l.count || 0,
        leiturasMes: lm.count || 0,
        cobrancasPendentes: cp.count || 0,
        cobrancasPagas: cg.count || 0,
      });
      setCobrancas(c.data || []);
    } catch {
      setErro('Erro ao carregar dados do dashboard.');
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const channel = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobrancas' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leituras' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { icon: '🏠', label: 'Unidades', value: stats.unidades, sub: `${stats.ativas} ativas`, color: '#DBEAFE' },
    { icon: '👥', label: 'Leitores', value: stats.leitores, color: '#E0E7FF' },
    { icon: '📏', label: 'Leituras no Mês', value: stats.leiturasMes, color: '#D1FAE5' },
    { icon: '⏳', label: 'Pendentes', value: stats.cobrancasPendentes, color: '#FEF3C7' },
    { icon: '✅', label: 'Pagas', value: stats.cobrancasPagas, color: '#D1FAE5' },
    { icon: '🔴', label: 'Total Pendentes', value: stats.pendentes, color: '#FEE2E2' },
  ];

  return (
    <div>
      {erro && <p style={{ color: '#DC2626', marginBottom: 16 }}>{erro}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 12 }}>{c.icon}</div>
            <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{c.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{c.value}</div>
            {(c as any).sub && <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{(c as any).sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Últimas Cobranças</h3>
        <table>
          <thead><tr><th>Unidade</th><th>Bairro</th><th>Mês</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
          <tbody>
            {cobrancas.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma cobrança</td></tr>
            ) : cobrancas.map(c => (
              <tr key={c.id}>
                <td>{c.unidades?.endereco} - {c.unidades?.numero_hidrometro}</td>
                <td>{c.unidades?.bairros?.nome}</td>
                <td>{c.mes}</td>
                <td>R$ {Number(c.valor_total).toFixed(2).replace('.', ',')}</td>
                <td style={{ fontSize: '0.85rem' }}>{new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td><span className={`badge badge-${c.status === 'pago' ? 'success' : c.status === 'atrasado' ? 'danger' : 'warning'}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
