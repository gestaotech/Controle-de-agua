'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { Card, Input, Button } from '@/components'

export default function LeitorPerfilPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const [nome, setNome] = useState('')
  const [contato, setContato] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    if (profile) { setNome(profile.nome || ''); setContato(profile.contato || '') }
  }, [profile])

  const salvarDados = async () => {
    if (!nome.trim()) return alert('Preencha o nome')
    setErro(''); setSucesso('')
    try { await supabase.from('perfis').update({ nome, contato }).eq('id', user?.id); setSucesso('Dados atualizados!') }
    catch { setErro('Erro ao atualizar dados.') }
  }

  const alterarSenha = async () => {
    if (!senha) return alert('Preencha a nova senha')
    if (senha !== confirmarSenha) return alert('As senhas não conferem')
    if (senha.length < 6) return alert('A senha deve ter pelo menos 6 caracteres')
    setErro(''); setSucesso('')
    try {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) throw error
      setSucesso('Senha alterada com sucesso!')
      setSenha(''); setConfirmarSenha('')
    } catch { setErro('Erro ao alterar senha.') }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      {erro && <p style={{ color: '#DC2626', marginBottom: 16 }}>{erro}</p>}
      {sucesso && <p style={{ color: '#059669', marginBottom: 16 }}>{sucesso}</p>}

      <Card title="Meus Dados" style={{ marginBottom: 24 }}>
        <Input label="Nome" value={nome} onChange={(e: any) => setNome(e.target.value)} />
        <Input label="Contato" value={contato} onChange={(e: any) => setContato(e.target.value)} placeholder="(00) 00000-0000" />
        <Input label="Bairro" value={profile?.bairro_nome || ''} readOnly style={{ background: '#F8FAFC' }} />
        <Input label="Perfil" value="Leitor" readOnly style={{ background: '#F8FAFC' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={salvarDados}>Salvar</Button>
        </div>
      </Card>

      <Card title="Alterar Senha">
        <Input label="Nova Senha" type="password" value={senha} onChange={(e: any) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
        <Input label="Confirmar Senha" type="password" value={confirmarSenha} onChange={(e: any) => setConfirmarSenha(e.target.value)} placeholder="Repita a senha" />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={alterarSenha}>Alterar Senha</Button>
        </div>
      </Card>
    </div>
  )
}
