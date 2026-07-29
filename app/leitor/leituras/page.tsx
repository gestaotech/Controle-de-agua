'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { Card, Input, Select, Button, Table } from '@/components'

export default function LeitorLeiturasPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const [unidades, setUnidades] = useState<any[]>([])
  const [leituras, setLeituras] = useState<any[]>([])
  const [form, setForm] = useState({
    unidade_id: '', mes: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
    anterior: 0, atual: 0,
  })
  const [consumo, setConsumo] = useState(0)
  const [erro, setErro] = useState('')

  const load = async () => {
    if (!user || !profile) return
    setErro('')
    try {
      const [u, l] = await Promise.all([
        supabase.from('unidades').select('id, endereco, numero_hidrometro, leitura_inicial').eq('bairro_id', profile.bairro_id).eq('status', 'ativo').order('endereco'),
        supabase.from('leituras').select('*, unidades(endereco, numero_hidrometro)').eq('usuario_id', user.id).order('mes', { ascending: false }),
      ])
      setUnidades(u.data || [])
      setLeituras(l.data || [])
    } catch { setErro('Erro ao carregar leituras.') }
  }

  useEffect(() => { load() }, [user, profile])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('leituras-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leituras', filter: `usuario_id=eq.${user.id}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => { setConsumo(form.atual - form.anterior) }, [form.atual, form.anterior])

  const loadAnterior = async (unidadeId: string) => {
    if (!unidadeId) return
    const { data } = await supabase.from('leituras').select('*').eq('unidade_id', unidadeId).order('mes', { ascending: false }).limit(1).maybeSingle()
    if (data) setForm(f => ({ ...f, anterior: data.atual || 0 }))
    else {
      const { data: unidade } = await supabase.from('unidades').select('leitura_inicial').eq('id', unidadeId).single()
      setForm(f => ({ ...f, anterior: Number(unidade?.leitura_inicial) || 0 }))
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.unidade_id || form.atual < form.anterior) return alert('Verifique os dados')
    try {
      const existente = await supabase.from('leituras').select('*').eq('unidade_id', form.unidade_id).eq('mes', form.mes).maybeSingle()
      if (existente.data) await supabase.from('leituras').update({ anterior: form.anterior, atual: form.atual }).eq('id', existente.data.id)
      else await supabase.from('leituras').insert({ unidade_id: form.unidade_id, mes: form.mes, anterior: form.anterior, atual: form.atual, usuario_id: user?.id })
      setForm(f => ({ ...f, atual: 0 }))
      load()
    } catch { alert('Erro ao salvar leitura.') }
  }

  return (
    <div>
      <Card title="Nova Leitura" style={{ marginBottom: 24 }}>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Select label="Unidade *" value={form.unidade_id} onChange={(e: any) => { setForm({ ...form, unidade_id: e.target.value }); loadAnterior(e.target.value) }} required>
              <option value="">Selecione</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.endereco} ({u.numero_hidrometro})</option>)}
            </Select>
            <Input label="Mês/Ano *" type="month" value={form.mes} onChange={(e: any) => setForm({ ...form, mes: e.target.value })} required />
            <Input label="Anterior (m³)" type="number" value={form.anterior} readOnly style={{ background: '#F8FAFC' }} />
            <Input label="Atual (m³) *" type="number" step="0.01" value={form.atual || ''} onChange={(e: any) => setForm({ ...form, atual: parseFloat(e.target.value) || 0 })} required />
            <Input label="Consumo (m³)" value={consumo.toFixed(2)} readOnly style={{ background: '#F8FAFC' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit">Registrar</Button>
          </div>
        </form>
      </Card>

      <Card title="Minhas Leituras">
        <Table
          columns={[
            { key: 'unidade', label: 'Unidade', render: (r: any) => `${r.unidades?.endereco} - ${r.unidades?.numero_hidrometro}` },
            { key: 'mes', label: 'Mês' },
            { key: 'anterior', label: 'Anterior', render: (r: any) => `${r.anterior} m³` },
            { key: 'atual', label: 'Atual', render: (r: any) => `${r.atual} m³` },
            { key: 'consumo', label: 'Consumo', render: (r: any) => <strong>{r.consumo} m³</strong> },
          ]}
          data={leituras}
          emptyMessage="Nenhuma leitura registrada."
        />
      </Card>
    </div>
  )
}
