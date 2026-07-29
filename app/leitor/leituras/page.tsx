'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { Card, Input, Select, Button, Table, Modal } from '@/components'

export default function LeitorLeiturasPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [unidades, setUnidades] = useState<any[]>([])
  const [leituras, setLeituras] = useState<any[]>([])
  const [form, setForm] = useState({
    unidade_id: '', mes: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
    anterior: 0, atual: 0,
  })
  const [consumo, setConsumo] = useState(0)
  const [erro, setErro] = useState('')
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [fotoModal, setFotoModal] = useState('')

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

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const uploadFoto = async (): Promise<string | null> => {
    if (!fotoFile || !user) return null
    const body = new FormData()
    body.append('file', fotoFile)
    body.append('userId', user.id)

    const res = await fetch('/api/upload-foto', { method: 'POST', body })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao enviar foto')
    return data.url
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.unidade_id || form.atual < form.anterior) return alert('Verifique os dados')
    setEnviando(true)
    try {
      let fotoUrl = ''
      if (fotoFile) {
        const url = await uploadFoto()
        if (url) fotoUrl = url
      }

      const existente = await supabase.from('leituras').select('*').eq('unidade_id', form.unidade_id).eq('mes', form.mes).maybeSingle()
      if (existente.data) {
        await supabase.from('leituras').update({ anterior: form.anterior, atual: form.atual, foto_url: fotoUrl || undefined }).eq('id', existente.data.id)
      } else {
        await supabase.from('leituras').insert({
          unidade_id: form.unidade_id, mes: form.mes, anterior: form.anterior, atual: form.atual,
          usuario_id: user?.id, foto_url: fotoUrl || null,
        })
      }
      setForm(f => ({ ...f, atual: 0 }))
      setFotoFile(null)
      setFotoPreview('')
      if (fileRef.current) fileRef.current.value = ''
      load()
    } catch (err: any) { alert(err.message || 'Erro ao salvar leitura.') }
    finally { setEnviando(false) }
  }

  return (
    <div>
      <Card title="Nova Leitura" style={{ marginBottom: 24 }}>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <form onSubmit={save}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Select label="Unidade *" value={form.unidade_id} onChange={(e: any) => { setForm({ ...form, unidade_id: e.target.value }); loadAnterior(e.target.value) }} required>
              <option value="">Selecione</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.endereco} ({u.numero_hidrometro})</option>)}
            </Select>
            <Input label="Mês/Ano *" type="month" value={form.mes} onChange={(e: any) => setForm({ ...form, mes: e.target.value })} required />
            <Input label="Anterior (m³)" type="number" value={form.anterior} readOnly style={{ background: '#F8FAFC' }} />
            <Input label="Atual (m³) *" type="number" step="0.01" value={form.atual || ''} onChange={(e: any) => setForm({ ...form, atual: parseFloat(e.target.value) || 0 })} required />
            <Input label="Consumo (m³)" value={consumo.toFixed(2)} readOnly style={{ background: '#F8FAFC' }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' }}>Foto do Hidrômetro</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFotoChange}
              style={{ fontSize: '0.9rem' }}
            />
            {fotoPreview && (
              <div style={{ marginTop: 8 }}>
                <img src={fotoPreview} alt="Preview" style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0' }} />
                <Button size="sm" variant="ghost" onClick={() => { setFotoFile(null); setFotoPreview(''); if (fileRef.current) fileRef.current.value = '' }} style={{ marginLeft: 8 }}>
                  Remover
                </Button>
              </div>
            )}
            <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: 4 }}>Tire uma foto do relógio/hidrômetro para registrar a leitura.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={enviando} loading={enviando}>Registrar</Button>
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
            { key: 'foto', label: 'Foto', render: (r: any) => r.foto_url ? (
              <img
                src={r.foto_url}
                alt="Hidrômetro"
                style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid #E2E8F0' }}
                onClick={() => setFotoModal(r.foto_url)}
              />
            ) : <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>—</span> },
          ]}
          data={leituras}
          emptyMessage="Nenhuma leitura registrada."
        />
      </Card>

      <Modal open={!!fotoModal} onClose={() => setFotoModal('')} title="Foto do Hidrômetro">
        {fotoModal && (
          <img src={fotoModal} alt="Hidrômetro" style={{ width: '100%', borderRadius: 8 }} />
        )}
      </Modal>
    </div>
  )
}
