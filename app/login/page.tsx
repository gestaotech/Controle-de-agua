'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [nome, setNome] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nome } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from('perfis').insert({
            id: data.user.id,
            nome,
            perfil: 'leitor',
            ativo: true,
          });
        }
        alert('Conta criada! Verifique seu email.');
        setIsRegister(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase.from('perfis').select('perfil').eq('id', data.user.id).single();
          const redirectUrl = profile?.perfil === 'admin' ? '/dashboard' : '/leitor';
          router.push(redirectUrl);
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
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
          {isRegister && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontWeight: 500, color: '#64748B', marginBottom: 4, fontSize: '0.85rem' }}>Nome</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: 8 }}
              />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 500, color: '#64748B', marginBottom: 4, fontSize: '0.85rem' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: 8 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 500, color: '#64748B', marginBottom: 4, fontSize: '0.85rem' }}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: 8 }}
            />
          </div>
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
            {loading ? 'Entrando...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#64748B', fontSize: '0.9rem' }}>
          {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
          <a href="#" onClick={e => { e.preventDefault(); setIsRegister(!isRegister); setError(''); }}>
            {isRegister ? 'Fazer login' : 'Criar conta'}
          </a>
        </p>
      </div>
    </div>
  );
}
