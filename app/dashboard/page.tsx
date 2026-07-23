'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, Table, Button, Badge, statusBadge, Modal, Input, Select } from '@/components'

export default function DashboardPage() {
  const [stats, setStats] = useState({ unidades: 0, ativas: 0, pendentes: 0, leitores: 0, pago: 0 })
  const [cobrancas, setCobrancas] = useState<any[]>([])
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showGerar, setShowGerar] = useState(false)
  const [bairros, setBairros] = useState<any[]>([])
  const [formGerar, setFormGerar] = useState({ bairro_id: '', mes: '' })
  const [gerando, setGerando] = useState(false)
  const [resultadoGerar, setResultadoGerar] = useState('')
  const supabase = createClient()

  const load = async () => {
    setErro('')
    try {
      const [u, a, p, l, pg, c] = await Promise.all([
        supabase.from('unidades').select('*', { count: 'exact', head: true }),
        supabase.from('unidades').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
        supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('perfil', 'leitor').eq('ativo', true),
        supabase.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pago'),
        supabase.from('cobrancas').select('*, unidades!inner(endereco, numero_hidrometro, bairros!inner(nome))').order('criado_em', { ascending: false }).limit(20),
      ])
      setStats({ unidades: u.count || 0, ativas: a.count || 0, pendentes: p.count || 0, leitores: l.count || 0, pago: pg.count || 0 })
      setCobrancas(c.data || [])
    } catch { setErro('Erro ao carregar dados.') }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const channel = supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cobrancas' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const cobrancasFiltradas = filtroStatus
    ? cobrancas.filter(c => c.status === filtroStatus)
    : cobrancas

  const abrirGerar = async () => {
    const { data } = await supabase.from('bairros').select('id, nome').eq('ativo', true).order('nome')
    setBairros(data || [])
    setFormGerar({ bairro_id: '', mes: new Date().toISOString().slice(0, 7) })
    setResultadoGerar('')
    setShowGerar(true)
  }

  const gerarFaturasMassa = async () => {
    if (!formGerar.bairro_id || !formGerar.mes) return
    setGerando(true)
    setResultadoGerar('')
    try {
      const res = await fetch('/api/gerar-faturas-massa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formGerar),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar faturas')
      setResultadoGerar(`${data.criadas} faturas geradas, ${data.ja_existentes} já existentes.`)
      load()
    } catch (err: any) {
      setResultadoGerar(`Erro: ${err.message}`)
    } finally { setGerando(false) }
  }

  const cards = [
    { icon: '🏠', label: 'Total Unidades', value: stats.unidades, color: '#DBEAFE' },
    { icon: '✅', label: 'Ativas', value: stats.ativas, color: '#D1FAE5' },
    { icon: '⏳', label: 'Pendentes', value: stats.pendentes, color: '#FEF3C7' },
    { icon: '💰', label: 'Pagas', value: stats.pago, color: '#D1FAE5' },
    { icon: '👤', label: 'Leitores Ativos', value: stats.leitores, color: '#E0E7FF' },
  ]

  return (
    <div>
      {erro && <p style={{ color: '#DC2626', marginBottom: 16 }}>{erro}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map((c, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 8, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{c.icon}</div>
              <div>
                <div style={{ color: '#64748B', fontSize: '0.8rem' }}>{c.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{c.value}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card
        title="Faturas"
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select
            style={{ width: 180 }}
            value={filtroStatus}
            onChange={(e: any) => setFiltroStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="atrasado">Atrasado</option>
          </Select>
          <Button variant="success" onClick={abrirGerar}>+ Gerar Faturas em Massa</Button>
        </div>
        <Table
          columns={[
            { key: 'unidade', label: 'Unidade', render: (r: any) => `${r.unidades?.endereco} - ${r.unidades?.numero_hidrometro}` },
            { key: 'bairro', label: 'Bairro', render: (r: any) => r.unidades?.bairros?.nome },
            { key: 'mes', label: 'Mês' },
            { key: 'valor_total', label: 'Valor', render: (r: any) => `R$ ${Number(r.valor_total).toFixed(2).replace('.', ',')}` },
            { key: 'vencimento', label: 'Vencimento', render: (r: any) => new Date(r.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') },
            { key: 'status', label: 'Status', render: (r: any) => statusBadge(r.status) },
          ]}
          data={cobrancasFiltradas}
          emptyMessage="Nenhuma cobrança encontrada."
        />
      </Card>

      <Modal open={showGerar} onClose={() => setShowGerar(false)} title="Gerar Faturas em Massa">
        <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: 16 }}>
          Gera faturas para todas as unidades de um bairro que têm leitura no mês selecionado mas ainda não possuem fatura.
        </p>
        <Select
          label="Bairro / Condomínio"
          value={formGerar.bairro_id}
          onChange={(e: any) => setFormGerar({ ...formGerar, bairro_id: e.target.value })}
        >
          <option value="">Selecione</option>
          {bairros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </Select>
        <Input
          label="Mês de Referência"
          type="month"
          value={formGerar.mes}
          onChange={(e: any) => setFormGerar({ ...formGerar, mes: e.target.value })}
        />
        {resultadoGerar && (
          <div style={{
            padding: '0.75rem', borderRadius: 8, marginBottom: 12, fontSize: '0.9rem',
            background: resultadoGerar.startsWith('Erro') ? '#FEE2E2' : '#D1FAE5',
            color: resultadoGerar.startsWith('Erro') ? '#991B1B' : '#065F46',
          }}>
            {resultadoGerar}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={() => setShowGerar(false)}>Cancelar</Button>
          <Button variant="success" onClick={gerarFaturasMassa} disabled={gerando || !formGerar.bairro_id || !formGerar.mes} loading={gerando}>
            {gerando ? 'Gerando...' : 'Gerar Faturas'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
