'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const lbl = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' as const };

export default function ConfigPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState({ empresa: '', cnpj: '', contato: '', valor_m3: 8.50, taxa_fixa: 15.00, multa: 2.00, juros: 1.00 });
  const [erro, setErro] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/dashboard');
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    (async () => {
      try {
        const { data } = await supabase.from('config').select('*').limit(1);
        if (data?.[0]) {
          setConfig({
            empresa: data[0].empresa || '',
            cnpj: data[0].cnpj || '',
            contato: data[0].contato || '',
            valor_m3: data[0].valor_m3,
            taxa_fixa: data[0].taxa_fixa,
            multa: data[0].multa,
            juros: data[0].juros,
          });
        }
      } catch {
        setErro('Erro ao carregar configurações.');
      }
    })();
  }, [authLoading, isAdmin]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await supabase.from('config').select('id').limit(1);
      if (data?.[0]) {
        await supabase.from('config').update(config).eq('id', data[0].id);
      } else {
        await supabase.from('config').insert(config);
      }
      alert('Configurações salvas!');
    } catch {
      alert('Erro ao salvar configurações. Tente novamente.');
    }
  };

  if (authLoading) return <p>Carregando...</p>;
  if (!isAdmin) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: 600 }}>
      <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Configurações do Sistema</h3>
      {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={lbl}>Nome da Empresa</label>
          <input style={inp} value={config.empresa} onChange={e => setConfig({ ...config, empresa: e.target.value })} />
        </div>
        <div>
          <label style={lbl}>CNPJ</label>
          <input style={inp} value={config.cnpj} onChange={e => setConfig({ ...config, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
        </div>
        <div>
          <label style={lbl}>Contato</label>
          <input style={inp} value={config.contato} onChange={e => setConfig({ ...config, contato: e.target.value })} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label style={lbl}>Valor por m³ (R$)</label>
          <input type="number" step="0.01" style={inp} value={config.valor_m3} onChange={e => setConfig({ ...config, valor_m3: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label style={lbl}>Taxa Fixa Mensal (R$)</label>
          <input type="number" step="0.01" style={inp} value={config.taxa_fixa} onChange={e => setConfig({ ...config, taxa_fixa: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label style={lbl}>Multa Atraso (%)</label>
          <input type="number" step="0.01" style={inp} value={config.multa} onChange={e => setConfig({ ...config, multa: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label style={lbl}>Juros ao Mês (%)</label>
          <input type="number" step="0.01" style={inp} value={config.juros} onChange={e => setConfig({ ...config, juros: parseFloat(e.target.value) || 0 })} />
        </div>

        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #E2E8F0', paddingTop: 16, marginTop: 8 }}>
          <h4 style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: 12 }}>Pagamento PIX (Asaas)</h4>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ color: '#166534', fontSize: '0.85rem', margin: 0 }}>
              O pagamento PIX é processado automaticamente via Asaas. Para configurar:
            </p>
            <ol style={{ color: '#166534', fontSize: '0.85rem', margin: '8px 0 0 20px', padding: 0 }}>
              <li>Crie uma conta em <strong>asaas.com</strong></li>
              <li>Gere sua API Key em Configurações {'>'} Integrações {'>'} API</li>
              <li>Adicione a API Key no arquivo <code>.env.local</code></li>
              <li>Configure o webhook no painel do Asaas</li>
            </ol>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 6 }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Ambiente</span>
              <div style={{ fontSize: '0.9rem' }}>{process.env.ASAAS_ENVIRONMENT === 'production' ? 'Produção' : 'Sandbox (teste)'}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 6 }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Status</span>
              <div style={{ fontSize: '0.9rem', color: '#16A34A' }}>Ativo</div>
            </div>
          </div>
        </div>

        <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Salvar Configurações</button>
        </div>
      </form>
    </div>
  );
}
