'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (senha !== confirmarSenha) {
          setError('As senhas não conferem');
          setLoading(false);
          return;
        }
        if (senha.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres');
          setLoading(false);
          return;
        }

        const email = `${nome.toLowerCase().replace(/\s+/g, '.')}@controle-agua.local`;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } },
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: profileError } = await supabase.from('perfis').insert({
            id: data.user.id,
            nome,
            perfil: 'admin',
            ativo: true,
            contato: '',
          });
          if (profileError) throw profileError;
        }
        router.push('/dashboard');
        router.refresh();
      } else {
        if (!nome || !senha) {
          setError('Preencha nome e senha');
          setLoading(false);
          return;
        }
        const email = `${nome.toLowerCase().replace(/\s+/g, '.')}@controle-agua.local`;
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (signInError) throw signInError;

        if (data.user) {
          const { data: profile } = await supabase.from('perfis').select('perfil').eq('id', data.user.id).single();
          const redirectUrl = profile?.perfil === 'admin' ? '/dashboard' : '/leitor';
          router.push(redirectUrl);
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '2.5rem',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48 }}>💧</div>
          <h1 style={{ fontSize: '1.25rem', marginTop: 8 }}>Controle de Água</h1>
          <p style={{ color: '#64748B', fontSize: '0.9rem' }}>Sistema de Cobrança de Tarifas</p>
        </div>

        {error && (
          <div style={{
            background: '#FEE2E2',
            color: '#991B1B',
            padding: '0.75rem',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.9rem',
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 500, color: '#64748B', marginBottom: 4, fontSize: '0.85rem' }}>Nome</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              placeholder="Seu nome"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: 8 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 500, color: '#64748B', marginBottom: 4, fontSize: '0.85rem' }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: 8 }}
            />
          </div>
          {isRegister && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 500, color: '#64748B', marginBottom: 4, fontSize: '0.85rem' }}>Confirmar Senha</label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={e => setConfirmarSenha(e.target.value)}
                required
                placeholder="Repita a senha"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: 8 }}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '1rem',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processando...' : isRegister ? 'Criar Conta Admin' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#64748B', fontSize: '0.9rem' }}>
          {isRegister ? 'Já tem conta?' : 'Primeiro acesso?'}{' '}
          <a href="#" onClick={e => { e.preventDefault(); setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? 'Fazer login' : 'Criar conta admin'}
          </a>
        </p>
      </div>
    </div>
  );
}
