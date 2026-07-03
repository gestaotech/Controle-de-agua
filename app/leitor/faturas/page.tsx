'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function LeitorFaturasPage() {
  const { user } = useAuth();
  const [leituras, setLeituras] = useState<any[]>([]);
  const [fatura, setFatura] = useState<any>(null);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  const load = async () => {
    if (!user) return;
    setErro('');
    try {
      const { data } = await supabase
        .from('leituras').select('*, clientes(nome, numero_hidrometro, endereco)')
        .eq('usuario_id', user.id)
        .order('mes', { ascending: false });
      setLeituras(data || []);
    } catch {
      setErro('Erro ao carregar faturas.');
    }
  };

  useEffect(() => { load(); }, [user]);

  const gerarFatura = async (leitura: any) => {
    try {
      const { data: cfg } = await supabase.from('config').select('*').limit(1);
      const c = cfg?.[0] || { empresa: 'Saneamento Básico', valor_m3: 8.50, taxa_fixa: 15.00 };
      const venc = new Date();
      venc.setDate(venc.getDate() + 10);
      setFatura({
        cliente: leitura.clientes,
        mes: leitura.mes,
        consumo: leitura.consumo,
        valorM3: Number(c.valor_m3),
        taxaFixa: Number(c.taxa_fixa),
        valorTotal: Number(leitura.consumo) * Number(c.valor_m3) + Number(c.taxa_fixa),
        vencimento: venc.toISOString().split('T')[0],
        empresa: c.empresa,
        codigo: 'AG' + Date.now().toString().slice(-8),
      });
    } catch {
      alert('Erro ao gerar fatura.');
    }
  };

  const fecharFatura = () => setFatura(null);

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Gerar Faturas</h3>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <table>
          <thead><tr><th>Cliente</th><th>Mês</th><th>Consumo</th><th>Ações</th></tr></thead>
          <tbody>
            {leituras.map(l => (
              <tr key={l.id}>
                <td>{l.clientes?.nome}</td>
                <td>{l.mes}</td>
                <td>{l.consumo} m³</td>
                <td>
                  <button onClick={() => gerarFatura(l)} style={{ padding: '4px 12px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}>📄 Gerar Fatura</button>
                </td>
              </tr>
            ))}
            {leituras.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma leitura para gerar fatura</td></tr>}
          </tbody>
        </table>
      </div>

      {fatura && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={e => { if (e.target === e.currentTarget) fecharFatura(); }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 550, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1E293B', paddingBottom: 16, marginBottom: 20 }}>
              <h2>{fatura.empresa}</h2>
              <p style={{ color: '#64748B' }}>FATURA DE FORNECIMENTO DE ÁGUA</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Cliente</label><div>{fatura.cliente.nome}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Hidrômetro</label><div>{fatura.cliente.numero_hidrometro}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Referência</label><div>{fatura.mes}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Consumo</label><div>{fatura.consumo} m³</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Vencimento</label><div>{new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div></div>
            </div>
            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 8, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ color: '#64748B', fontSize: '0.85rem' }}>VALOR TOTAL</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3B82F6' }}>R$ {fatura.valorTotal.toFixed(2).replace('.', ',')}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 8 }}>Código</div>
                <div style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '8px 16px', borderRadius: 4 }}>{fatura.codigo}</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => window.print()} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>🖨️ Imprimir</button>
              <button onClick={fecharFatura} style={{ padding: '0.625rem 1.5rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
