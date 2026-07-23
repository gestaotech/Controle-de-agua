'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card, Input, Select, Button, Table, statusBadge } from '@/components'

interface Bairro { id: string; nome: string }
interface Unidade {
  id: string; endereco: string; numero_hidrometro: string
  bairro_id: string; leitura_inicial: number; data_leitura_inicial: string
  status: string; bairros: { nome: string } | null
}

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [bairros, setBairros] = useState<Bairro[]>([])
  const [form, setForm] = useState({ endereco: '', numero_hidrometro: '', bairro_id: '', leitura_inicial: 0, data_leitura_inicial: new Date().toISOString().split('T')[0], status: 'ativo' })
  const [editId, setEditId] = useState('')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const supabase = createClient()

  const load = async () => {
    setErro('')
    try {
      let q = supabase.from('unidades').select('*, bairros(nome)')
      if (busca) q = q.or(`endereco.ilike.%${busca}%,numero_hidrometro.ilike.%${busca}%`)
      const [u, b] = await Promise.all([q.order('endereco'), supabase.from('bairros').select('id, nome').eq('ativo', true).order('nome')])
      setUnidades(u.data || [])
      setBairros(b.data || [])
    } catch { setErro('Erro ao carregar unidades.') }
  }

  useEffect(() => { load() }, [busca])
  useEffect(() => {
    const channel = supabase.channel('unidades-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.endereco || !form.numero_hidrometro || !form.bairro_id) return alert('Preencha endereço, hidrômetro e bairro')
    try {
      if (editId) {
        await supabase.from('unidades').update({ endereco: form.endereco, numero_hidrometro: form.numero_hidrometro, bairro_id: form.bairro_id, status: form.status }).eq('id', editId)
      } else {
        await supabase.from('unidades').insert({ endereco: form.endereco, numero_hidrometro: form.numero_hidrometro, bairro_id: form.bairro_id, leitura_inicial: form.leitura_inicial, data_leitura_inicial: form.data_leitura_inicial, status: form.status })
      }
      resetForm(); load()
    } catch { alert('Erro ao salvar unidade.') }
  }

  const resetForm = () => {
    setForm({ endereco: '', numero_hidrometro: '', bairro_id: '', leitura_inicial: 0, data_leitura_inicial: new Date().toISOString().split('T')[0], status: 'ativo' })
    setEditId('')
  }

  const edit = (u: Unidade) => {
    setForm({ endereco: u.endereco, numero_hidrometro: u.numero_hidrometro, bairro_id: u.bairro_id, leitura_inicial: Number(u.leitura_inicial), data_leitura_inicial: u.data_leitura_inicial, status: u.status })
    setEditId(u.id)
  }

  const del = async (id: string) => {
    if (!confirm('Excluir esta unidade?')) return
    try { await supabase.from('unidades').delete().eq('id', id); load() } catch { alert('Erro ao excluir unidade.') }
  }

  return (
    <div>
      <Card title={editId ? 'Editar Unidade' : 'Nova Unidade'} style={{ marginBottom: 24 }}>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <form onSubmit={save} style={{ display: 'grid', gap: 12 }}>
          <Input label="Endereço *" value={form.endereco} onChange={(e: any) => setForm({ ...form, endereco: e.target.value })} required placeholder="Rua, avenida..." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <Input label="Nº Hidrômetro *" value={form.numero_hidrometro} onChange={(e: any) => setForm({ ...form, numero_hidrometro: e.target.value })} required />
            <Select label="Bairro/Condomínio *" value={form.bairro_id} onChange={(e: any) => setForm({ ...form, bairro_id: e.target.value })} required>
              <option value="">Selecione</option>
              {bairros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Select>
            <Select label="Status" value={form.status} onChange={(e: any) => setForm({ ...form, status: e.target.value })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </div>
          {!editId && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Leitura Inicial (m³)" type="number" step="0.01" value={form.leitura_inicial} onChange={(e: any) => setForm({ ...form, leitura_inicial: parseFloat(e.target.value) || 0 })} />
              <Input label="Data da Leitura Inicial" type="date" value={form.data_leitura_inicial} onChange={(e: any) => setForm({ ...form, data_leitura_inicial: e.target.value })} />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            {editId && <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>}
            <Button type="submit">{editId ? 'Atualizar' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Card>

      <Card title={`Unidades (${unidades.length})`}>
        <div style={{ marginBottom: 16 }}>
          <Input placeholder="Buscar endereço ou hidrômetro..." value={busca} onChange={(e: any) => setBusca(e.target.value)} style={{ maxWidth: 400 }} />
        </div>
        <Table
          columns={[
            { key: 'endereco', label: 'Endereço' },
            { key: 'numero_hidrometro', label: 'Hidrômetro' },
            { key: 'bairro', label: 'Bairro', render: (r: Unidade) => r.bairros?.nome || '-' },
            { key: 'leitura_inicial', label: 'Leitura Inicial', render: (r: Unidade) => `${Number(r.leitura_inicial).toFixed(2)} m³` },
            { key: 'status', label: 'Status', render: (r: Unidade) => statusBadge(r.status) },
            { key: 'acoes', label: 'Ações', render: (r: Unidade) => (
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="sm" variant="secondary" onClick={() => edit(r)}>Editar</Button>
                <Button size="sm" variant="danger" onClick={() => del(r.id)}>Excluir</Button>
              </div>
            )},
          ]}
          data={unidades}
          emptyMessage="Nenhuma unidade encontrada."
        />
      </Card>
    </div>
  )
}
