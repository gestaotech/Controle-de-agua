'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function LeitorDashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ unidades: 0, leituras: 0, pendentes: 0 });
  const [ultimasLeituras, setUltimasLeituras] = useState<any[]>([]);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      setErro('');
      try {
        const [u, l, unids] = await Promise.all([
          supabase.from('unidades').select('*', { count: 'exact', head: true }).eq('bairro_id', profile.bairro_id).eq('status', 'ativo'),
          supabase.from('leituras').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id),
          supabase.from('unidades').select('id').eq('bairro_id', profile.bairro_id).eq('status', 'ativo'),
        ]);

        const ids = (unids.data || []).map(u => u.id);
        let pendentes = 0;
        if (ids.length > 0) {
          const { count } = await supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pendente').in('unidade_id', ids);
          pendentes = count || 0;
        }
        setStats({ unidades: u.count || 0, leituras: l.count || 0, pendentes });

        const { data: leituras } = await supabase
          .from('leituras').select('*, unidades(endereco, numero_hidrometro, bairros(nome))')
          .eq('usuario_id', user.id).order('criado_em', { ascending: false }).limit(5);
        setUltimasLeituras(leituras || []);
      } catch { setErro('Erro ao carregar dados.'); }
    })();
  }, [user, profile]);

  const cards = [
    { icon: '🏠', label: 'Unidades no Bairro', value: stats.unidades, color: '#DBEAFE' },
    { icon: '📏', label: 'Minhas Leituras', value: stats.leituras, color: '#D1FAE5' },
    { icon: '⏳', label: 'Cobranças Pendentes', value: stats.pendentes, color: '#FEF3C7' },
  ];

  return (
    <div>
      {erro && <p style={{ color: '#DC2626', marginBottom: 16 }}>{erro}</p>}
      {profile?.bairro_nome && (
        <p style={{ color: '#64748B', marginBottom: 16, fontSize: '0.9rem' }}>
          Área de atuação: <strong>{profile.bairro_nome}</strong>
        </p>
      )}
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
          <thead><tr><th>Unidade</th><th>Bairro</th><th>Mês</th><th>Consumo</th><th>Data</th></tr></thead>
          <tbody>
            {ultimasLeituras.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma leitura registrada</td></tr>
            ) : ultimasLeituras.map(l => (
              <tr key={l.id}>
                <td>{l.unidades?.endereco} - {l.unidades?.numero_hidrometro}</td>
                <td>{l.unidades?.bairros?.nome}</td>
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
