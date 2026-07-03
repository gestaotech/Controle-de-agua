'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function LeitorDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ leituras: 0, faturas: 0, pendentes: 0 });
  const [ultimasLeituras, setUltimasLeituras] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [l, c, lt] = await Promise.all([
          supabase.from('leituras').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id),
          supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id),
          supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id).eq('status', 'pendente'),
        ]);
        setStats({ leituras: l.count || 0, faturas: c.count || 0, pendentes: lt.count || 0 });

        const { data: leituras } = await supabase
          .from('leituras').select('*, clientes(nome, numero_hidrometro)')
          .eq('usuario_id', user.id)
          .order('criado_em', { ascending: false })
          .limit(5);
        setUltimasLeituras(leituras || []);
      } catch {}
    })();
  }, [user]);

  const cards = [
    { icon: '📏', label: 'Minhas Leituras', value: stats.leituras, color: '#DBEAFE' },
    { icon: '📄', label: 'Faturas Geradas', value: stats.faturas, color: '#D1FAE5' },
    { icon: '⏳', label: 'Pendentes', value: stats.pendentes, color: '#FEF3C7' },
  ];

  return (
    <div>
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
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Últimas Leituras</h3>
        <table>
          <thead><tr><th>Cliente</th><th>Mês</th><th>Consumo</th><th>Data</th></tr></thead>
          <tbody>
            {ultimasLeituras.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma leitura registrada</td></tr>
            ) : ultimasLeituras.map(l => (
              <tr key={l.id}>
                <td>{l.clientes?.nome}</td>
                <td>{l.mes}</td>
                <td><strong>{l.consumo} m³</strong></td>
                <td>{new Date(l.criado_em).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
