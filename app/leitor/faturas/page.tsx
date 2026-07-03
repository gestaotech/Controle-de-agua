'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';

function gerarPayloadPIX(params: {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  identificador: string;
}): string {
  const { chave, nome, cidade, valor, identificador } = params;

  function crc16(str: string): string {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
        else crc <<= 1;
        crc &= 0xFFFF;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  function tlv(id: string, value: string): string {
    return id + value.length.toString().padStart(2, '0') + value;
  }

  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', chave);
  const merchantInfo = tlv('26', merchantAccount);
  const txAmount = tlv('54', valor.toFixed(2));
  const txId = tlv('05', identificador.substring(0, 25));
  const additionalData = tlv('62', txId);

  const payload =
    tlv('00', '01') +
    tlv('01', '12') +
    merchantInfo +
    tlv('52', '0000') +
    tlv('53', '986') +
    txAmount +
    tlv('58', 'BR') +
    tlv('60', 'BRASILIA') +
    tlv('61', '00000000') +
    additionalData;

  return payload + tlv('63', crc16(payload + '6304'));
}

export default function LeitorFaturasPage() {
  const { user } = useAuth();
  const [leituras, setLeituras] = useState<any[]>([]);
  const [fatura, setFatura] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
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
    try {
      const { data: cfg } = await supabase.from('config').select('*').limit(1);
      const c = cfg?.[0] || { empresa: 'Saneamento Básico', valor_m3: 8.50, taxa_fixa: 15.00, cnpj: '', contato: '', pix_tipo: '', pix_chave: '' };
      const venc = new Date();
      venc.setDate(venc.getDate() + 10);
      const valorTotal = Number(leitura.consumo) * Number(c.valor_m3) + Number(c.taxa_fixa);
      const codigo = 'AG' + Date.now().toString().slice(-8);

      let payload = '';
      if (c.pix_chave) {
        payload = gerarPayloadPIX({
          chave: c.pix_chave,
          nome: c.empresa || 'Saneamento Basico',
          cidade: 'BRASILIA',
          valor: valorTotal,
          identificador: codigo,
        });
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
        pixPayload: payload,
        temPIX: !!c.pix_chave,
      });
    } catch {
      alert('Erro ao gerar fatura.');
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
          <thead><tr><th>Unidade</th><th>Mês</th><th>Consumo</th><th>Ações</th></tr></thead>
          <tbody>
            {leituras.map(l => (
              <tr key={l.id}>
                <td>{l.unidades?.endereco} - {l.unidades?.numero_hidrometro}</td>
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
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1E293B', paddingBottom: 16, marginBottom: 20 }}>
              <h2>{fatura.empresa}</h2>
              {fatura.cnpj && <p style={{ color: '#64748B', fontSize: '0.85rem' }}>CNPJ: {fatura.cnpj}</p>}
              <p style={{ color: '#64748B' }}>FATURA DE FORNECIMENTO DE ÁGUA</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Endereço</label><div>{fatura.unidade?.endereco}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Hidrômetro</label><div>{fatura.unidade?.numero_hidrometro}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Bairro</label><div>{fatura.unidade?.bairro_condominio}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Referência</label><div>{fatura.mes}</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Consumo</label><div>{fatura.consumo} m³</div></div>
              <div><label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' as const }}>Vencimento</label><div>{new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div></div>
            </div>

            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 8, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ color: '#64748B', fontSize: '0.85rem' }}>VALOR TOTAL</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3B82F6' }}>R$ {fatura.valorTotal.toFixed(2).replace('.', ',')}</div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 4 }}>Código da Fatura</div>
              <div style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '8px 16px', borderRadius: 4, display: 'inline-block' }}>{fatura.codigo}</div>
            </div>

            {fatura.temPIX && (
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' as const }}>PIX QR Code</div>
                    <div style={{ background: '#fff', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', display: 'inline-block' }}>
                      <QRCodeSVG value={fatura.pixPayload} size={160} level="M" includeMargin={false} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' as const }}>Código de Barras</div>
                    <Barcode value={fatura.codigo} format="CODE128" width={1.5} height={60} displayValue={true} fontSize={12} margin={4} />
                  </div>
                </div>
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <button onClick={copiarPix} style={{ padding: '6px 16px', background: copiado ? '#10B981' : '#F1F5F9', color: copiado ? '#fff' : '#1E293B', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    {copiado ? '✓ Copiado!' : '📋 Copiar Código PIX'}
                  </button>
                </div>
              </div>
            )}

            {!fatura.temPIX && (
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' as const }}>Código de Barras</div>
                  <Barcode value={fatura.codigo} format="CODE128" width={1.5} height={60} displayValue={true} fontSize={12} margin={4} />
                </div>
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem' }}>PIX não configurado. Configure nas Configurações do sistema.</p>
              </div>
            )}

            {fatura.contato && (
              <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.8rem', marginBottom: 16 }}>Contato: {fatura.contato}</p>
            )}

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
