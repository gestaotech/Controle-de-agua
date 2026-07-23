'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { useRouter } from 'next/navigation'
import { Card, Input, Button, Table, statusBadge } from '@/components'

interface Bairro { id: string; nome: string; ativo: boolean; criado_em: string }

export default function BairrosPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [bairros, setBairros] = useState<Bairro[]>([])
  const [novoBairro, setNovoBairro] = useState('')
  const [editando, setEditando] = useState<Bairro | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => { if (!authLoading && !isAdmin) router.push('/dashboard') }, [isAdmin, authLoading, router])

  const load = async () => {
    if (!isAdmin) return
    setErro('')
    try {
      const { data, error } = await supabase.from('bairros').select('*').order('nome')
      if (error) throw error
      setBairros(data || [])
    } catch { setErro('Erro ao carregar bairros.') }
  }

  useEffect(() => { load() }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    const channel = supabase.channel('bairros-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bairros' }, load)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAdmin])

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setSucesso('')
    if (!novoBairro.trim()) { setErro('Digite o nome do bairro.'); return }
    try {
      if (editando) {
        const { error } = await supabase.from('bairros').update({ nome: novoBairro.trim() }).eq('id', editando.id)
        if (error) { if (error.code === '23505') setErro('Já existe um bairro com esse nome.'); else throw error }
        setSucesso('Bairro atualizado!'); setEditando(null)
      } else {
        const { error } = await supabase.from('bairros').insert({ nome: novoBairro.trim() })
        if (error) { if (error.code === '23505') setErro('Já existe um bairro com esse nome.'); else throw error }
        setSucesso('Bairro cadastrado!')
      }
      setNovoBairro(''); load()
      setTimeout(() => setSucesso(''), 3000)
    } catch { setErro('Erro ao salvar bairro.') }
  }

  const toggleAtivo = async (bairro: Bairro) => {
    try { await supabase.from('bairros').update({ ativo: !bairro.ativo }).eq('id', bairro.id); load() } catch { setErro('Erro ao alterar status.') }
  }

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza?')) return
    try {
      const { error } = await supabase.from('bairros').delete().eq('id', id)
      if (error) { if (error.code === '23503') setErro('Bairro vinculado a unidades ou leitores.'); else throw error }
      load()
    } catch { setErro('Erro ao excluir bairro.') }
  }

  const iniciarEdicao = (bairro: Bairro) => { setEditando(bairro); setNovoBairro(bairro.nome); setErro(''); setSucesso('') }
  const cancelarEdicao = () => { setEditando(null); setNovoBairro(''); setErro('') }

  if (authLoading) return <p>Carregando...</p>
  if (!isAdmin) return null

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <Card title={editando ? 'Editar Bairro/Condomínio' : 'Cadastrar Bairro/Condomínio'} style={{ maxWidth: 500 }}>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12, fontSize: '0.85rem' }}>{erro}</p>}
        {sucesso && <p style={{ color: '#16A34A', marginBottom: 12, fontSize: '0.85rem' }}>{sucesso}</p>}
        <form onSubmit={salvar} style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input value={novoBairro} onChange={(e: any) => setNovoBairro(e.target.value)} placeholder="Ex: Centro, Jardim das Flores..." />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 16 }}>
            <Button type="submit" variant={editando ? 'warning' : 'primary'}>{editando ? 'Atualizar' : 'Cadastrar'}</Button>
            {editando && <Button type="button" variant="secondary" onClick={cancelarEdicao}>Cancelar</Button>}
          </div>
        </form>
      </Card>

      <Card title={`Bairros Cadastrados (${bairros.length})`}>
        <Table
          columns={[
            { key: 'nome', label: 'Nome', render: (r: Bairro) => <span style={{ fontWeight: 500 }}>{r.nome}</span> },
            { key: 'status', label: 'Status', render: (r: Bairro) => (
              <span onClick={() => toggleAtivo(r)} style={{ cursor: 'pointer' }}>
                {statusBadge(r.ativo ? 'ativo' : 'inativo')}
              </span>
            )},
            { key: 'criado_em', label: 'Cadastro', render: (r: Bairro) => <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{new Date(r.criado_em).toLocaleDateString('pt-BR')}</span> },
            { key: 'acoes', label: 'Ações', render: (r: Bairro) => (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="warning" onClick={() => iniciarEdicao(r)}>Editar</Button>
                <Button size="sm" variant="danger" onClick={() => excluir(r.id)}>Excluir</Button>
              </div>
            )},
          ]}
          data={bairros}
          emptyMessage="Nenhum bairro cadastrado."
        />
      </Card>
    </div>
  )
}
