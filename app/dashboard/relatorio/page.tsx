'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { Card, Table, Button, Input, Select, statusBadge } from '@/components'
import { useRouter } from 'next/navigation'

const fmt = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

const monthOptions = [
  { label: 'Este Mês', value: '' },
  { label: 'Há 1 Mês', value: '-1' },
  { label: 'Há 2 Meses', value: '-2' },
  { label: 'Há 3 Meses', value: '-3' },
]

export default function DashboardRelatorioPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const [periodo, setPeriodo] = useState<''
#' | '-1' | '-2' | '-3'>( '')
  const [cobrancas, setCobrancas] = useState<any[]>([])
  const [leituras, setLeituras] = useState<any[]>([])
  const [erro, setErro] = useState('')

  const calculateDateOffset = (offset: string) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 + Number(offset)
    const calculatedMonth = ((month - 1) % 12) + 1
    const calculatedYear = year + Math.floor((month - 1) / 12)
    return `${calculatedYear}-${String(calculatedMonth).padStart(2, '0')}`
  }

  const load = useCallback(async () => {
    if (!user || !profile) return
    setErro('')
    try {
      const mesRef = periodo ? calculateDateOffset(periodo) : null
      // Carregar cobranças do período
      let query = supabase
        .from('cobrancas')
        .select('*, unidades!inner(endereco, numero_hidrometro, bairros!inner(nome))')
        .eq('usuario_id', user.id)
      if (mesRef) {
        query = query.eq('mes', mesRef)
      }
      const { data: cob, error: cobErr } = await query.order('criado_em', { ascending: false })
      if (cobErr) throw cobErr
      setCobrancas(cob || [])

      // Carregar leituras do período
      query = supabase
        .from('leituras')
        .select('*, unidades!inner(endereco, numero_hidrometro, bairros!inner(nome))')
        .eq('usuario_id', user.id)
      if (mesRef) {
        query = query.eq('mes', mesRef)
      }
      const { data: leit, error: leitErr } = await query.order('criado_em', { ascending: false })
      if (leitErr) throw leitErr
      setLeituras(leit || [])
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar relatório.')
      setCobrancas([])
      setLeituras([])
    }
  }, [user, profile, periodo, supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('admin-relatorio')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobrancas', filter: `usuario_id=eq.${user.id}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leituras', filter: `usuario_id=eq.${user.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, load])

  // Calcular totais considering only pending bills
  const pendentes = cobrancas.filter(c => c.status === 'pendente')
  const totalAReceber = pendentes.reduce((s, c) => s + Number(c.valor_total), 0)
  const totalEsgoto = pendentes.reduce((s, c) => s + Number(c.consumo) * Number(c.taxa_esgoto), 0)
  const totalM3 = pendentes.reduce((s, c) => s + Number(c.consumo) * Number(c.valor_m3), 0)
  const totalTaxaFixa = pendentes.reduce((s, c) => s + Number(c.taxa_fixa), 0)

  // Estatísticas de leitura
  const totalConsumo = leituras.reduce((s, r) => s + Number(r.consumo), 0)
  const totalUnidadesComLeitura = new Set(leituras.map((r: any) => r.unidade_id)).size
  const avgConsumo = totalUnidadesComLeitura > 0 ? (totalConsumo / totalUnidadesComLeitura).toFixed(2) : '0,00'

  const cards = [
    { icon: '💰', label: 'Total a Receber', value: fmt(totalAReceber), color: '#FEE2E2' },
    { icon: '🚿', label: 'Total de Esgoto a Receber', value: fmt(totalEsgoto), color: '#DBEAFE' },
    { icon: '💧', label: 'Total do m³ (Água)', value: fmt(totalM3), color: '#D1FAE5' },
    { icon: '📌', label: 'Total da Taxa Mínima', value: fmt(totalTaxaFixa), color: '#FEF3C7' },
  ]

  const leitorCards = [
    { icon: '📊', label: 'Total Consumos', value: fmt(totalConsumo), color: '#E0E7FF' },
    { icon: '👥', label: 'Unidades com Leitura', value: totalUnidadesComLeitura.toString(), color: '#CBD5E1' },
    { icon: '📈', label: 'Média por Unidade', value: avgConsumo, color: '#98FB98' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Relatório Gerencial</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Select
            label="Período"
            value={periodo}
            onChange={(e: any) => setPeriodo(e.target.value)}
          >
            <option value="">Selecione</option>
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Button size="sm" variant="secondary" onClick={load}>Atualizar</Button>
        </div>
      </div>

      {erro && <p style={{ color: '#DC2626', marginBottom: 16 }}>{erro}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map((c, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{c.icon}</div>
              <div>
                <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{c.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{c.value}</div>
              </div>
            </div>
          </Card>
        ))}
        {leitorCards.map((c, i) => (
          <Card key={i + 100}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{c.icon}</div>
              <div>
                <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{c.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{c.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabela de Unidades com Leitura e Fatura */}
      <Card title={`Unidades - Período ${periodo ? monthOptions.find(m => m.value === periodo)?.label || 'Selecionado' : 'Todos'} ${periodo ? `(${new Date().getMonth() + 1}º ${new Date().getFullYear()})` : ''}`}>
        <Table
          columns={[
            { key: 'unidade', label: 'Unidade', render: (r: any) => `${r.unidades?.endereco} - ${r.unidades?.numero_hidrometro}` },
            { key: 'bairro', label: 'Bairro', render: (r: any) => r.unidades?.bairros?.nome },
            { key: 'mes', label: 'Mês', render: (r: any) => r.mes },
            { key: 'anterior', label: 'Anterior (m³)', render: (r: any) => `${r.anterior} m³` },
            { key: 'atual', label: 'Atual (m³)', render: (r: any) => `${r.atual} m³` },
            { key: 'consumo', label: 'Consumo (m³)', render: (r: any) => <strong>{r.consumo} m³</strong> },
            { key: 'status', label: 'Status', render: (r: any) => statusBadge(r.status) },
          ]}
          data={leituras}
          emptyMessage="Nenhuma leitura encontrada para o período selecionado."
        />
      </Card>

      {/* Tabela de Faturas do Período */}
      <Card title={`Faturas - Período ${periodo ? monthOptions.find(m => m.value === periodo)?.label || 'Selecionado' : 'Todos'}`}>
        <Table
          columns={[
            { key: 'unidade', label: 'Unidade', render: (r: any) => `${r.unidades?.endereco} - ${r.unidades?.numero_hidrometro}` },
            { key: 'bairro', label: 'Bairro', render: (r: any) => r.unidades?.bairros?.nome },
            { key: 'mes', label: 'Mês' },
            { key: 'consumo', label: 'Consumo', render: (r: any) => `${r.consumo} m³` },
            { key: 'agua', label: 'Água (m³)', render: (r: any) => fmt(Number(r.consumo) * Number(r.valor_m3)) },
            { key: 'esgoto', label: 'Esgoto', render: (r: any) => fmt(Number(r.consumo) * Number(r.taxa_esgoto)) },
            { key: 'taxa_fixa', label: 'Taxa Fixa', render: (r: any) => fmt(Number(r.taxa_fixa)) },
            { key: 'valor_total', label: 'Valor Total', render: (r: any) => <strong>{fmt(r.valor_total)}</strong> },
            { key: 'status', label: 'Status', render: (r: any) => statusBadge(r.status) },
          ]}
          data={cobrancas}
          emptyMessage="Nenhuma fatura encontrada para o período selecionado."
        />
      </Card>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>Voltar ao Painel</Button>
        <Button variant="ghost" onClick={() => setPeriodo('')}>Limpar Filtro</Button>
      </div>
    </div>
  )
}