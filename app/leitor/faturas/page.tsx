'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function LeitorFaturasPage() {
  const { user } = useAuth();
  const [leituras, setLeituras] = useState<any[]>([]);
  const [fatura, setFatura] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const supabase = createClient();

  const load = async () => {
    if (!user) return;
    setErro('');
    try {
      const { data } = await supabase
        .from('leituras').select('*, unidades(endereco, numero_hidrometro, bairro_condominio)')
        .eq('usuario_id', user.id)
        .order('mes', { ascending: false });
      setLeituras(data || []);
    } catch {
      setErro('Erro ao carregar faturas.');
    }
  };

  useEffect(() => { load(); }, [user]);

  const gerarFatura = async (leitura: any) => {
    if (gerando) return;
    setGerando(true);
    setErro('');
    try {
      const { data: cfg } = await supabase.from('config').select('*').limit(1);
      const c = cfg?.[0] || { empresa: 'Saneamento Basico', valor_m3: 8.50, taxa_fixa: 15.00, cnpj: '', contato: '' };
      const venc = new Date();
      venc.setDate(venc.getDate() + 10);
      const valorTotal = Number(leitura.consumo) * Number(c.valor_m3) + Number(c.taxa_fixa);
      const codigo = 'AG' + Date.now().toString().slice(-8);

      const { data: existentes } = await supabase
        .from('cobrancas')
        .select('id, asaas_payment_id, pix_payload')
        .eq('unidade_id', leitura.unidade_id)
        .eq('mes', leitura.mes)
        .limit(1);

      const existente = existentes?.[0];
      let cobrancaId = existente?.id;
      let paymentId = existente?.asaas_payment_id;
      let pixPayload = existente?.pix_payload;

      if (!cobrancaId) {
        const { data: nova, error: insertErr } = await supabase
          .from('cobrancas')
          .insert({
            unidade_id: leitura.unidade_id,
            mes: leitura.mes,
            consumo: leitura.consumo,
            valor_m3: Number(c.valor_m3),
            taxa_fixa: Number(c.taxa_fixa),
            valor_total: valorTotal,
            vencimento: venc.toISOString().split('T')[0],
            status: 'pendente',
            usuario_id: user?.id,
          })
          .select('id')
          .single();

        if (insertErr) {
          if (insertErr.code === '23505') {
            const { data: exist } = await supabase
              .from('cobrancas')
              .select('id')
              .eq('unidade_id', leitura.unidade_id)
              .eq('mes', leitura.mes)
              .limit(1);
            if (exist?.[0]) { cobrancaId = exist[0].id; }
          } else {
            throw insertErr;
          }
        }
        cobrancaId = nova.id;
      }

      let qrCodeBase64 = '';
      let pixErro = '';

      const body: any = {
        cobrancaId,
        unidadeEndereco: leitura.unidades?.endereco,
        mes: leitura.mes,
        valorTotal,
        vencimento: venc.toISOString().split('T')[0],
        empresa: c.empresa,
      };

      if (paymentId) {
        body.existingPaymentId = paymentId;
      }

      const res = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        pixErro = data.error || 'Erro ao gerar PIX';
      } else {
        paymentId = data.paymentId;
        pixPayload = data.pixPayload;
        qrCodeBase64 = `data:image/png;base64,${data.qrCodeBase64}`;

        await supabase
          .from('cobrancas')
          .update({ asaas_payment_id: paymentId, pix_payload: pixPayload })
          .eq('id', cobrancaId);
      }

      setFatura({
        unidade: leitura.unidades,
        mes: leitura.mes,
        consumo: leitura.consumo,
        valorM3: Number(c.valor_m3),
        taxaFixa: Number(c.taxa_fixa),
        valorTotal,
        vencimento: venc.toISOString().split('T')[0],
        empresa: c.empresa,
        cnpj: c.cnpj,
        contato: c.contato,
        codigo,
        pixPayload: pixPayload || '',
        qrCodeBase64,
        temPIX: !!qrCodeBase64,
        pixErro,
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar fatura.');
    } finally {
      setGerando(false);
    }
  };

  const fecharFatura = () => { setFatura(null); setCopiado(false); };

  const copiarPix = async () => {
    if (!fatura?.pixPayload) return;
    try {
      await navigator.clipboard.writeText(fatura.pixPayload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert('Erro ao copiar. Selecione e copie manualmente.');
    }
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Gerar Faturas</h3>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <table>
          <thead><tr><th>Unidade</th><th>Mes</th><th>Consumo</th><th>Acoes</th></tr></thead>
          <tbody>
            {leituras.map(l => (
              <tr key={l.id}>
                <td>{l.unidades?.endereco} - {l.unidades?.numero_hidrometro}</td>
                <td>{l.mes}</td>
                <td>{l.consumo} m3</td>
                <td>
                  <button onClick={() => gerarFatura(l)} disabled={gerando} style={{ padding: '4px 12px', background: gerando ? '#94A3B8' : '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, cursor: gerando ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                    {gerando ? 'Gerando...' : 'Gerar Fatura'}
                  </button>
                </td>
              </tr>
            ))}
            {leituras.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma leitura para gerar fatura</td></tr>}
          </tbody>
        </table>
      </div>

      {fatura && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={e => { if (e.target === e.currentTarget) fecharFatura(); }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1E293B', paddingBottom: 16, marginBottom: 20 }}>
              <h2>{fatura.empresa}</h2>
              {fatura.cnpj && <p style={{ color: '#64748B', fontSize: '0.85rem' }}>CNPJ: {fatura.cnpj}</p>}
              <p style={{ color: '#64748B' }}>FATURA DE FORNECIMENTO DE AGUA</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Endereco</label><div>{fatura.unidade?.endereco}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Hidrometro</label><div>{fatura.unidade?.numero_hidrometro}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Bairro</label><div>{fatura.unidade?.bairro_condominio}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Referencia</label><div>{fatura.mes}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Consumo</label><div>{fatura.consumo} m3</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Vencimento</label><div>{new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div></div>
            </div>

            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 8, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ color: '#64748B', fontSize: '0.85rem' }}>VALOR TOTAL</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3B82F6' }}>R$ {fatura.valorTotal.toFixed(2).replace('.', ',')}</div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 4 }}>Codigo da Fatura</div>
              <div style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '8px 16px', borderRadius: 4, display: 'inline-block' }}>{fatura.codigo}</div>
            </div>

            {fatura.pixErro && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <p style={{ color: '#92400E', fontSize: '0.85rem', margin: 0 }}>
                  Erro ao gerar PIX: {fatura.pixErro}
                </p>
                <p style={{ color: '#92400E', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                  Verifique se a chave API do Asaas esta configurada corretamente.
                </p>
              </div>
            )}

            {fatura.temPIX && fatura.qrCodeBase64 && (
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' as const }}>PIX QR Code</div>
                  <div style={{ background: '#fff', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', display: 'inline-block' }}>
                    <img src={fatura.qrCodeBase64} alt="QR Code PIX" style={{ width: 200, height: 200 }} />
                  </div>
                </div>
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <button onClick={copiarPix} style={{ padding: '6px 16px', background: copiado ? '#10B981' : '#F1F5F9', color: copiado ? '#fff' : '#1E293B', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    {copiado ? 'Copiado!' : 'Copiar Codigo PIX'}
                  </button>
                </div>
              </div>
            )}

            {fatura.contato && (
              <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.8rem', marginBottom: 16 }}>Contato: {fatura.contato}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button onClick={() => window.print()} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Imprimir</button>
              <button onClick={fecharFatura} style={{ padding: '0.625rem 1.5rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
