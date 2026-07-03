'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function LeitorCobrancasPage() {
  const { user } = useAuth();
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  const load = async () => {
    if (!user) return;
    setErro('');
    try {
      const { data } = await supabase
        .from('cobrancas').select('*, clientes(nome, numero_hidrometro)')
        .eq('usuario_id', user.id)
        .order('criado_em', { ascending: false });
      setCobrancas(data || []);
    } catch {
      setErro('Erro ao carregar cobranças.');
    }
  };

  useEffect(() => { load(); }, [user]);

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Cobranças das Minhas Leituras</h3>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <table>
          <thead><tr><th>Cliente</th><th>Mês</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead>
          <tbody>
            {cobrancas.map(c => (
              <tr key={c.id}>
                <td>{c.clientes?.nome}</td>
                <td>{c.mes}</td>
                <td>R$ {Number(c.valor_total).toFixed(2).replace('.', ',')}</td>
                <td>{new Date(c.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td><span className={`badge badge-${c.status === 'pago' ? 'success' : c.status === 'atrasado' ? 'danger' : 'warning'}`}>{c.status}</span></td>
              </tr>
            ))}
            {cobrancas.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma cobrança encontrada</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
