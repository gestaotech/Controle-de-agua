'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { inp, lbl } from '@/lib/styles';

export default function LeitorPerfilPage() {
  const { user, profile } = useAuth();
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '');
      setContato(profile.contato || '');
    }
  }, [profile]);

  const salvarDados = async () => {
    if (!nome.trim()) return alert('Preencha o nome');
    setErro('');
    setSucesso('');
    try {
      await supabase.from('perfis').update({ nome, contato }).eq('id', user?.id);
      setSucesso('Dados atualizados!');
    } catch {
      setErro('Erro ao atualizar dados.');
    }
  };

  const alterarSenha = async () => {
    if (!senha) return alert('Preencha a nova senha');
    if (senha !== confirmarSenha) return alert('As senhas não conferem');
    if (senha.length < 6) return alert('A senha deve ter pelo menos 6 caracteres');
    setErro('');
    setSucesso('');
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      setSucesso('Senha alterada com sucesso!');
      setSenha('');
      setConfirmarSenha('');
    } catch {
      setErro('Erro ao alterar senha.');
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {erro && <p style={{ color: '#DC2626', marginBottom: 16 }}>{erro}</p>}
      {sucesso && <p style={{ color: '#059669', marginBottom: 16 }}>{sucesso}</p>}

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Meus Dados</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={lbl}>Nome</label><input style={inp} value={nome} onChange={e => setNome(e.target.value)} /></div>
          <div><label style={lbl}>Contato</label><input style={inp} value={contato} onChange={e => setContato(e.target.value)} placeholder="(00) 00000-0000" /></div>
          <div><label style={lbl}>Bairro</label><input style={{ ...inp, background: '#F8FAFC' }} value={profile?.bairro_nome || ''} readOnly /></div>
          <div><label style={lbl}>Perfil</label><input style={{ ...inp, background: '#F8FAFC' }} value="Leitor" readOnly /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={salvarDados} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Salvar</button>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Alterar Senha</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          <div><label style={lbl}>Nova Senha</label><input type="password" style={inp} value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
          <div><label style={lbl}>Confirmar Senha</label><input type="password" style={inp} value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="Repita a senha" /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={alterarSenha} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Alterar Senha</button>
          </div>
        </div>
      </div>
    </div>
  );
}
