'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const lbl = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' as const };

export default function CadastrarLeitorPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const supabase = createClient();

  if (!authLoading && !isAdmin) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!form.nome || !form.email || !form.senha) {
      return alert('Preencha nome, email e senha');
    }
    if (form.senha.length < 6) {
      return alert('A senha deve ter pelo menos 6 caracteres');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: {
          data: { nome: form.nome, telefone: form.telefone },
          emailRedirectTo: undefined,
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('perfis').insert({
          id: data.user.id,
          nome: form.nome,
          perfil: 'leitor',
          ativo: true,
        });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }
      }

      setSucesso(`Leitor "${form.nome}" cadastrado com sucesso!`);
      setForm({ nome: '', email: '', senha: '', telefone: '' });
    } catch (err: any) {
      setErro(err.message || 'Erro ao cadastrar leitor');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <p>Carregando...</p>;

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Cadastrar Novo Leitor</h3>
        <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: 20 }}>O leitor poderá fazer leituras de hidrômetro e gerar faturas.</p>

        {erro && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{erro}</div>
        )}
        {sucesso && (
          <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{sucesso}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Nome Completo *</label>
            <input style={inp} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div>
            <label style={lbl}>Email *</label>
            <input type="email" style={inp} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="leitor@email.com" />
          </div>
          <div>
            <label style={lbl}>Telefone</label>
            <input style={inp} value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label style={lbl}>Senha *</label>
            <input type="password" style={inp} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required placeholder="Mínimo 6 caracteres" />
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => router.push('/dashboard/usuarios')} style={{ padding: '0.625rem 1.25rem', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Voltar</button>
            <button type="submit" disabled={loading} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Cadastrando...' : 'Cadastrar Leitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
