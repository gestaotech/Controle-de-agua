'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { Card, Table, Button, Modal, statusBadge } from '@/components'

const fmt = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

export default function LeitorFaturasPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [leituras, setLeituras] = useState<any[]>([])
  const [cobrancas, setCobrancas] = useState<any[]>([])
  const [fatura, setFatura] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [ambiente, setAmbiente] = useState('')
  const [simulando, setSimulando] = useState(false)

  const load = async () => {
    if (!user) return
    setErro('')
    try {
      const [leit, cob] = await Promise.all([
        supabase
          .from('leituras').select('*, unidades!inner(endereco, numero_hidrometro, bairro_id, bairros!inner(nome))')
          .eq('usuario_id', user.id).order('mes', { ascending: false }),
        supabase
          .from('cobrancas').select('*, unidades!inner(endereco, numero_hidrometro)')
          .eq('usuario_id', user.id).order('criado_em', { ascending: false }),
      ])
      setLeituras(leit.data || [])
      setCobrancas(cob.data || [])
    } catch { setErro('Erro ao carregar dados.') }
  }

  useEffect(() => { load() }, [user])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('faturas-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leituras', filter: `usuario_id=eq.${user.id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobrancas', filter: `usuario_id=eq.${user.id}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user])

  const gerarFatura = async (leitura: any) => {
    if (gerando) return
    setGerando(true); setErro('')
    try {
      const { data: cfg } = await supabase.from('config').select('*').limit(1)
      const c = cfg?.[0] || { empresa: 'Saneamento Basico', valor_m3: 8.50, taxa_esgoto: 0, taxa_fixa: 15.00, cnpj: '', contato: '' }
      const venc = new Date(); venc.setDate(venc.getDate() + 10)
      const valorEsgoto = Number(leitura.consumo) * Number(c.taxa_esgoto || 0)
      const valorTotal = Number(leitura.consumo) * Number(c.valor_m3) + valorEsgoto + Number(c.taxa_fixa)
      const codigo = 'AG' + Date.now().toString().slice(-8)

      const { data: existentes } = await supabase
        .from('cobrancas').select('id, asaas_payment_id, pix_payload')
        .eq('unidade_id', leitura.unidade_id).eq('mes', leitura.mes).limit(1)
      const existente = existentes?.[0]
      let cobrancaId = existente?.id
      let paymentId = existente?.asaas_payment_id
      let pixPayload = existente?.pix_payload

      if (!cobrancaId) {
        const { data: nova, error: insertErr } = await supabase
          .from('cobrancas').insert({
            unidade_id: leitura.unidade_id, mes: leitura.mes, consumo: leitura.consumo,
            valor_m3: Number(c.valor_m3), taxa_esgoto: Number(c.taxa_esgoto || 0), taxa_fixa: Number(c.taxa_fixa),
            valor_total: valorTotal, vencimento: venc.toISOString().split('T')[0],
            status: 'pendente', usuario_id: user?.id,
          }).select('id').single()
        if (insertErr) {
          if (insertErr.code === '23505') {
            const { data: exist } = await supabase
              .from('cobrancas').select('id').eq('unidade_id', leitura.unidade_id).eq('mes', leitura.mes).limit(1)
            cobrancaId = exist?.[0]?.id || ''
          } else { throw insertErr }
        } else { cobrancaId = nova.id }
      }

      let qrCodeBase64 = ''
      let pixErro = ''

      const body: any = {
        cobrancaId, unidadeId: leitura.unidade_id,
        unidadeEndereco: leitura.unidades?.endereco,
        mes: leitura.mes, valorTotal,
        vencimento: venc.toISOString().split('T')[0],
      }
      if (paymentId) body.existingPaymentId = paymentId

      const res = await fetch('/api/pix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        pixErro = data.error || 'Erro ao gerar PIX'
      } else {
        paymentId = data.paymentId
        pixPayload = data.pixPayload
        qrCodeBase64 = `data:image/png;base64,${data.qrCodeBase64}`
        await supabase.from('cobrancas').update({ asaas_payment_id: paymentId, pix_payload: pixPayload }).eq('id', cobrancaId)
      }

      const envRes = await fetch('/api/asaas-env')
      if (envRes.ok) { const e = await envRes.json(); setAmbiente(e.environment || '') }

      setFatura({
        unidade: leitura.unidades, mes: leitura.mes, consumo: leitura.consumo,
        valorM3: Number(c.valor_m3), taxaEsgoto: Number(c.taxa_esgoto || 0),
        valorEsgoto, taxaFixa: Number(c.taxa_fixa), valorTotal,
        vencimento: venc.toISOString().split('T')[0], empresa: c.empresa,
        cnpj: c.cnpj, contato: c.contato, codigo,
        pixPayload: pixPayload || '', qrCodeBase64, temPIX: !!qrCodeBase64, pixErro,
        paymentId,
        leituraAnterior: leitura.anterior,
        leituraAtual: leitura.atual,
      })
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar fatura.')
    } finally { setGerando(false) }
  }

  const verFatura = async (cobranca: any) => {
    setErro('')
    try {
      const [{ data: leitura }, { data: unidadeCompleta }] = await Promise.all([
        supabase
          .from('leituras')
          .select('anterior, atual, consumo')
          .eq('unidade_id', cobranca.unidade_id)
          .eq('mes', cobranca.mes)
          .maybeSingle(),
        supabase
          .from('unidades')
          .select('*, bairros(nome)')
          .eq('id', cobranca.unidade_id)
          .maybeSingle(),
      ])

      const { data: cfg } = await supabase.from('config').select('empresa, cnpj, contato').limit(1)
      const empresa = cfg?.[0]?.empresa || 'Saneamento Basico'
      const cnpj = cfg?.[0]?.cnpj || ''
      const contato = cfg?.[0]?.contato || ''

      const paymentId = cobranca.asaas_payment_id
      const pixPayload = cobranca.pix_payload

      let qrCodeBase64 = ''
      let pixErro = ''
      let temPIX = false

      if (paymentId) {
        const res = await fetch('/api/pix', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cobrancaId: cobranca.id, existingPaymentId: paymentId }),
        })
        const data = await res.json()
        if (res.ok) {
          qrCodeBase64 = `data:image/png;base64,${data.qrCodeBase64}`
          temPIX = true
        } else {
          pixErro = data.error || 'Erro ao carregar PIX'
        }
      }

      const envRes = await fetch('/api/asaas-env')
      if (envRes.ok) { const e = await envRes.json(); setAmbiente(e.environment || '') }

      setFatura({
        unidade: unidadeCompleta,
        mes: cobranca.mes,
        consumo: cobranca.consumo,
        valorM3: Number(cobranca.valor_m3),
        taxaEsgoto: Number(cobranca.taxa_esgoto),
        valorEsgoto: Number(cobranca.consumo) * Number(cobranca.taxa_esgoto),
        taxaFixa: Number(cobranca.taxa_fixa),
        valorTotal: Number(cobranca.valor_total),
        vencimento: cobranca.vencimento,
        status: cobranca.status,
        empresa,
        cnpj,
        contato,
        codigo: cobranca.id?.slice(-8).toUpperCase() || '',
        pixPayload: pixPayload || '',
        qrCodeBase64,
        temPIX,
        pixErro,
        paymentId,
        leituraAnterior: leitura?.anterior,
        leituraAtual: leitura?.atual,
        isHistorical: true,
      })
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar fatura.')
    }
  }

  const simularPagamento = async () => {
    if (!fatura?.paymentId || simulando) return
    setSimulando(true)
    try {
      const res = await fetch('/api/simular-pagamento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: fatura.paymentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao simular')
      alert('Pagamento simulado com sucesso! O status da fatura foi atualizado.')
      setFatura(null); setCopiado(false)
      load()
    } catch (err: any) { alert(err.message) }
    finally { setSimulando(false) }
  }

  const copiarPix = async () => {
    if (!fatura?.pixPayload) return
    try { await navigator.clipboard.writeText(fatura.pixPayload); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }
    catch { alert('Erro ao copiar. Selecione e copie manualmente.') }
  }

  const enderecoCompleto = (u: any) => {
    if (!u) return ''
    const partes = [u.endereco]
    if (u.numero) partes.push(u.numero)
    if (u.complemento) partes.push(u.complemento)
    if (u.bloco) partes.push(`Bloco ${u.bloco}`)
    if (u.unidade_numero) partes.push(`Apto/Unidade ${u.unidade_numero}`)
    return partes.join(', ')
  }

  return (
    <div>
      <Card title="Faturas Geradas" style={{ marginBottom: 24 }}>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <Table
          columns={[
            { key: 'unidade', label: 'Unidade', render: (r: any) => `${r.unidades?.endereco} - ${r.unidades?.numero_hidrometro}` },
            { key: 'mes', label: 'Mês' },
            { key: 'consumo', label: 'Consumo', render: (r: any) => `${r.consumo} m³` },
            { key: 'valor_total', label: 'Valor', render: (r: any) => fmt(r.valor_total) },
            { key: 'vencimento', label: 'Vencimento', render: (r: any) => new Date(r.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') },
            { key: 'status', label: 'Status', render: (r: any) => statusBadge(r.status) },
            { key: 'acoes', label: 'Ações', render: (r: any) => (
              <Button size="sm" variant="secondary" onClick={() => verFatura(r)}>Ver Fatura</Button>
            )},
          ]}
          data={cobrancas}
          emptyMessage="Nenhuma fatura gerada ainda."
        />
      </Card>

      <Card title="Gerar Nova Fatura">
        <Table
          columns={[
            { key: 'unidade', label: 'Unidade', render: (r: any) => `${r.unidades?.endereco} - ${r.unidades?.numero_hidrometro}` },
            { key: 'mes', label: 'Mês' },
            { key: 'consumo', label: 'Consumo', render: (r: any) => `${r.consumo} m³` },
            { key: 'acoes', label: 'Ações', render: (r: any) => (
              <Button size="sm" variant="primary" onClick={() => gerarFatura(r)} disabled={gerando} loading={gerando}>Gerar Fatura</Button>
            )},
          ]}
          data={leituras}
          emptyMessage="Nenhuma leitura pendente de fatura."
        />
      </Card>

      <Modal open={!!fatura} onClose={() => { setFatura(null); setCopiado(false) }}>
        {fatura && (
          <div>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #1E293B', paddingBottom: 12, marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>{fatura.empresa}</h2>
              {fatura.cnpj && <p style={{ color: '#64748B', fontSize: '0.85rem' }}>CNPJ: {fatura.cnpj}</p>}
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>FATURA DE FORNECIMENTO DE ÁGUA</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Código da Unidade</label>
                <div>{fatura.unidade?.codigo || '-'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Hidrômetro</label>
                <div>{fatura.unidade?.numero_hidrometro}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Endereço</label>
                <div>{enderecoCompleto(fatura.unidade)}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Bairro</label>
                <div>{fatura.unidade?.bairros?.nome || '-'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Referência</label>
                <div>{fatura.mes}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Responsável</label>
                <div>{fatura.unidade?.responsavel_nome || '-'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Telefone</label>
                <div>{fatura.unidade?.responsavel_telefone || '-'}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>E-mail</label>
                <div>{fatura.unidade?.responsavel_email || '-'}</div>
              </div>
            </div>

            {fatura.leituraAnterior !== undefined && fatura.leituraAtual !== undefined && (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, color: '#166534', marginBottom: 8 }}>Leituras do Período</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Anterior</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{fatura.leituraAnterior} m³</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Atual</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{fatura.leituraAtual} m³</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Consumo</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16A34A' }}>{fatura.consumo} m³</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', color: '#475569' }}>
                <span>Consumo de água ({fatura.consumo} m³ × R$ {fatura.valorM3.toFixed(2)})</span>
                <span>R$ {(fatura.consumo * fatura.valorM3).toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', color: '#475569' }}>
                <span>Taxa de esgoto ({fatura.consumo} m³ × R$ {fatura.taxaEsgoto.toFixed(2)})</span>
                <span>R$ {fatura.valorEsgoto.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', padding: '4px 0', color: '#475569' }}>
                <span>Taxa fixa</span>
                <span>R$ {fatura.taxaFixa.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ borderTop: '1px solid #E2E8F0', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontSize: '0.85rem' }}>VALOR TOTAL</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3B82F6' }}>{fmt(fatura.valorTotal)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Vencimento</label>
                <div>{new Date(fatura.vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>Status</label>
                <div>{statusBadge(fatura.status)}</div>
              </div>
              <div style={{ gridColumn: 'span 2', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: 4 }}>Código da Fatura</div>
                <div style={{ fontFamily: 'monospace', background: '#F8FAFC', padding: '8px 16px', borderRadius: 4, display: 'inline-block' }}>{fatura.codigo}</div>
              </div>
            </div>

            {fatura.pixErro && (
              <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <p style={{ color: '#92400E', fontSize: '0.85rem', margin: 0 }}>Erro ao gerar PIX: {fatura.pixErro}</p>
                <p style={{ color: '#92400E', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Verifique se a chave API do Asaas está configurada corretamente.</p>
              </div>
            )}

            {fatura.temPIX && fatura.qrCodeBase64 && (
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' }}>PIX QR Code</div>
                  <div style={{ background: '#fff', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', display: 'inline-block' }}>
                    <img src={fatura.qrCodeBase64} alt="QR Code PIX" style={{ width: 200, height: 200 }} />
                  </div>
                </div>
                <div style={{ marginTop: 12, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <Button variant="secondary" size="sm" onClick={copiarPix}>{copiado ? 'Copiado!' : 'Copiar Código PIX'}</Button>
                  {ambiente === 'sandbox' && fatura.paymentId && (
                    <Button variant="warning" size="sm" onClick={simularPagamento} disabled={simulando} loading={simulando}>Simular Pagamento</Button>
                  )}
                </div>
              </div>
            )}

            {fatura.contato && <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.8rem', marginBottom: 16 }}>Contato: {fatura.contato}</p>}

            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button onClick={() => window.print()}>Imprimir</Button>
              <Button variant="secondary" onClick={() => { setFatura(null); setCopiado(false) }}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}