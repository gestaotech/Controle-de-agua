'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { useRouter } from 'next/navigation'
import { Card, Input, Select, Button, Table, Modal, statusBadge } from '@/components'

interface Bairro { id: string; nome: string }
interface Leitor {
  id: string; nome: string; perfil: string; ativo: boolean
  bairro_id: string | null; bairros: { nome: string } | null
  contato: string; criado_em: string
}

export default function CadastrarLeitorPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ nome: '', contato: '', bairro_id: '', senha: '', confirmarSenha: '' })
  const [bairros, setBairros] = useState<Bairro[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [linkGerado, setLinkGerado] = useState('')
  const [senhaGerada, setSenhaGerada] = useState('')
  const [leitores, setLeitores] = useState<Leitor[]>([])
  const [leitorSelecionado, setLeitorSelecionado] = useState<Leitor | null>(null)
  const [showDetalhes, setShowDetalhes] = useState(false)
  const [senhaModal, setSenhaModal] = useState('')
  const [autenticado, setAutenticado] = useState(false)
  const [erroSenha, setErroSenha] = useState('')
  const [loadingModal, setLoadingModal] = useState(false)

  if (!authLoading && !isAdmin) { router.push('/dashboard'); return null }

  const loadLeitores = async () => {
    try {
      const { data } = await supabase.from('perfis').select('*, bairros(nome)').eq('perfil', 'leitor').order('nome')
      setLeitores(data || [])
    } catch {}
  }

  const loadBairros = async () => {
    const { data } = await supabase.from('bairros').select('id, nome').eq('ativo', true).order('nome')
    setBairros(data || [])
  }

  useEffect(() => {
    if (!authLoading && isAdmin) { loadLeitores(); loadBairros() }
  }, [authLoading, isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    const channel = supabase.channel('cadastrar-leitor-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfis', filter: 'perfil=eq.leitor' }, loadLeitores)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAdmin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setSucesso(''); setLinkGerado(''); setSenhaGerada('')
    if (!form.nome || !form.senha || !form.bairro_id) return alert('Preencha nome, bairro e senha')
    if (form.senha !== form.confirmarSenha) return alert('As senhas não conferem')
    if (form.senha.length < 6) return alert('A senha deve ter pelo menos 6 caracteres')

    setLoading(true)
    try {
      const email = form.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') + '@controle-agua.app'
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        body: JSON.stringify({ email, password: form.senha, data: { nome: form.nome } }),
      })
      const signupBody = await res.json()
      if (!res.ok && (res.status !== 422 || (!signupBody.msg?.toLowerCase().includes('already') && !signupBody.error?.toLowerCase().includes('already')))) {
        throw new Error(signupBody.msg || signupBody.error || `Erro ${res.status}`)
      }

      let userId = signupBody.id || signupBody.user?.id
      if (!res.ok) {
        const lookup = await fetch('/api/lookup-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
        const lookupBody = await lookup.json()
        if (lookupBody?.id) userId = lookupBody.id
      }

      if (userId) {
        const { error: profileError } = await supabase.from('perfis').insert({
          id: userId, nome: form.nome, perfil: 'leitor', ativo: true, bairro_id: form.bairro_id, contato: form.contato,
        })
        if (profileError && !profileError.message?.includes('duplicate key')) throw profileError
      }

      setLinkGerado(`${window.location.origin}/login`)
      setSenhaGerada(form.senha)
      setSucesso(`Leitor "${form.nome}" cadastrado com sucesso!`)
      setForm({ nome: '', contato: '', bairro_id: '', senha: '', confirmarSenha: '' })
      loadLeitores()
    } catch (err: any) { setErro(err.message || 'Erro ao cadastrar leitor') }
    finally { setLoading(false) }
  }

  const abrirDetalhes = (leitor: Leitor) => { setLeitorSelecionado(leitor); setShowDetalhes(true); setAutenticado(false); setSenhaModal(''); setErroSenha('') }
  const fecharModal = () => { setShowDetalhes(false); setLeitorSelecionado(null); setAutenticado(false); setSenhaModal(''); setErroSenha('') }

  const verificarSenha = async () => {
    if (!senhaModal) return
    setLoadingModal(true); setErroSenha('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email
      if (!email) { setErroSenha('Erro ao verificar senha.'); setLoadingModal(false); return }
      const { error } = await supabase.auth.signInWithPassword({ email, password: senhaModal })
      if (error) setErroSenha('Senha incorreta.')
      else setAutenticado(true)
    } catch { setErroSenha('Erro ao verificar senha.') }
    finally { setLoadingModal(false) }
  }

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try { await supabase.from('perfis').update({ ativo }).eq('id', id); loadLeitores() } catch { alert('Erro ao alterar status.') }
  }

  if (authLoading) return <p>Carregando...</p>

  return (
    <div>
      <Card title="Cadastrar Novo Leitor" style={{ marginBottom: 24, maxWidth: 700 }}>
        {erro && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{erro}</div>}
        {sucesso && <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{sucesso}</div>}
        {linkGerado && <div style={{ background: '#EFF6FF', color: '#1E40AF', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', wordBreak: 'break-all' }}><strong>Link de acesso:</strong> {linkGerado}</div>}
        {senhaGerada && (
          <div style={{ background: '#FEF3C7', color: '#92400E', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', border: '1px solid #F59E0B' }}>
            <strong>Senha do leitor:</strong> <code style={{ background: '#fff', padding: '2px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: 1 }}>{senhaGerada}</code>
            <p style={{ marginTop: 6, fontSize: '0.8rem', opacity: 0.8 }}>Anote ou copie esta senha. Ela não poderá ser visualizada novamente.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <Input label="Nome Completo *" value={form.nome} onChange={(e: any) => setForm({ ...form, nome: e.target.value })} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Contato" value={form.contato} onChange={(e: any) => setForm({ ...form, contato: e.target.value })} placeholder="(00) 00000-0000" />
            <Select label="Bairro de Atuação *" value={form.bairro_id} onChange={(e: any) => setForm({ ...form, bairro_id: e.target.value })} required>
              <option value="">Selecione</option>
              {bairros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </Select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Senha *" type="password" value={form.senha} onChange={(e: any) => setForm({ ...form, senha: e.target.value })} required placeholder="Mínimo 6 caracteres" />
            <Input label="Confirmar Senha *" type="password" value={form.confirmarSenha} onChange={(e: any) => setForm({ ...form, confirmarSenha: e.target.value })} required placeholder="Repita a senha" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" disabled={loading} loading={loading}>Cadastrar Leitor</Button>
          </div>
        </form>
      </Card>

      <Card title={`Leitores Cadastrados (${leitores.length})`}>
        <Table
          columns={[
            { key: 'nome', label: 'Nome' },
            { key: 'contato', label: 'Contato', render: (r: Leitor) => r.contato || '-' },
            { key: 'bairro', label: 'Bairro', render: (r: Leitor) => r.bairros?.nome || '-' },
            { key: 'status', label: 'Status', render: (r: Leitor) => statusBadge(r.ativo ? 'ativo' : 'inativo') },
            { key: 'acoes', label: 'Ações', render: (r: Leitor) => (
              <div style={{ display: 'flex', gap: 4 }}>
                <Button size="sm" variant="secondary" onClick={() => abrirDetalhes(r)}>Ver</Button>
                <Button size="sm" variant={r.ativo ? 'warning' : 'success'} onClick={() => toggleAtivo(r.id, !r.ativo)}>
                  {r.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            )},
          ]}
          data={leitores}
          emptyMessage="Nenhum leitor cadastrado."
        />
      </Card>

      <Modal open={showDetalhes} onClose={fecharModal} title={autenticado ? 'Dados do Leitor' : 'Acesso Restrito'}>
        {!autenticado ? (
          <>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: 20 }}>Insira sua senha para ver as informações do leitor.</p>
            {erroSenha && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{erroSenha}</div>}
            <Input label="Sua Senha" type="password" value={senhaModal} onChange={(e: any) => setSenhaModal(e.target.value)} placeholder="••••••••" onKeyDown={(e: any) => e.key === 'Enter' && verificarSenha()} autoFocus />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" onClick={fecharModal}>Cancelar</Button>
              <Button onClick={verificarSenha} disabled={loadingModal} loading={loadingModal}>Confirmar</Button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Nome', leitorSelecionado?.nome],
                ['Contato', leitorSelecionado?.contato || '-'],
                ['Bairro/Condomínio', leitorSelecionado?.bairros?.nome || '-'],
                ['Status', leitorSelecionado?.ativo ? 'Ativo' : 'Inativo'],
                ['Cadastrado em', leitorSelecionado?.criado_em ? new Date(leitorSelecionado.criado_em).toLocaleDateString('pt-BR') : '-'],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B', fontSize: '0.85rem' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value as string}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <Button variant="secondary" onClick={fecharModal}>Fechar</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
