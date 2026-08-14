'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { Card, Table, Button, Input, statusBadge } from '@/components'
import { useRouter } from 'next/navigation'

const fmt = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

export default function LeitorRelatorioPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const [mes, setMes] = useState(new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'))
  const [cobrancas, setCobrancas] = useState<any[]>([])
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setErro('')
    try {
      const { data, error } = await supabase
        .from('cobrancas')
        .select('*, unidades!inner(endereco, numero_hidrometro, bairros!inner(nome))')
        .eq('usuario_id', user.id)
        .eq('mes', mes)
        .order('criado_em', { ascending: false })
      if (error) throw error
      setCobrancas(data || [])
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar relatório.')
      setCobrancas([])
    }
  }, [user, mes, supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('relatorio-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobrancas', filter: `usuario_id=eq.${user.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, load])

  const pendentes = cobrancas.filter(c => c.status === 'pendente')

  const totalAReceber = pendentes.reduce((s, c) => s + Number(c.valor_total), 0)
  const totalEsgoto = pendentes.reduce((s, c) => s + Number(c.consumo) * Number(c.taxa_esgoto), 0)
  const totalM3 = pendentes.reduce((s, c) => s + Number(c.consumo) * Number(c.valor_m3), 0)
  const totalTaxaFixa = pendentes.reduce((s, c) => s + Number(c.taxa_fixa), 0)

  const cards = [
    { icon: '💰', label: 'Total a Receber', value: fmt(totalAReceber), color: '#FEE2E2' },
    { icon: '🚿', label: 'Total de Esgoto a Receber', value: fmt(totalEsgoto), color: '#DBEAFE' },
    { icon: '💧', label: 'Total do m³ (Água)', value: fmt(totalM3), color: '#D1FAE5' },
    { icon: '📌', label: 'Total da Taxa Mínima', value: fmt(totalTaxaFixa), color: '#FEF3C7' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Relatório Mensal</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ minWidth: 180 }}>
            <label style={{ fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' }}>Mês de Referência</label>
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' }}
            />
          </div>
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
      </div>

      <Card title={`Faturas do mês ${mes}`}>
        <Table
          columns={[
            { key: 'unidade', label: 'Unidade', render: (r: any) => `${r.unidades?.endereco} - ${r.unidades?.numero_hidrometro}` },
            { key: 'bairro', label: 'Bairro', render: (r: any) => r.unidades?.bairros?.nome },
            { key: 'consumo', label: 'Consumo', render: (r: any) => `${r.consumo} m³` },
            { key: 'agua', label: 'Água (m³)', render: (r: any) => fmt(Number(r.consumo) * Number(r.valor_m3)) },
            { key: 'esgoto', label: 'Esgoto', render: (r: any) => fmt(Number(r.consumo) * Number(r.taxa_esgoto)) },
            { key: 'taxa_fixa', label: 'Taxa Fixa', render: (r: any) => fmt(Number(r.taxa_fixa)) },
            { key: 'valor_total', label: 'Valor Total', render: (r: any) => <strong>{fmt(r.valor_total)}</strong> },
            { key: 'status', label: 'Status', render: (r: any) => statusBadge(r.status) },
          ]}
          data={cobrancas}
          emptyMessage="Nenhuma fatura encontrada para o mês selecionado."
        />
      </Card>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={() => window.print()}>Imprimir</Button>
        <Button variant="ghost" onClick={() => router.push('/leitor')}>Voltar</Button>
      </div>
    </div>
  )
}
