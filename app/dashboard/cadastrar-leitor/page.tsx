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
  const [form, setForm] = useState({ nome: '', contato: '', bairro_condominio: '', senha: '', confirmarSenha: '' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [linkGerado, setLinkGerado] = useState('');
  const supabase = createClient();

  if (!authLoading && !isAdmin) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLinkGerado('');

    if (!form.nome || !form.senha || !form.bairro_condominio) {
      return alert('Preencha nome, bairro/condomínio e senha');
    }
    if (form.senha !== form.confirmarSenha) {
      return alert('As senhas não conferem');
    }
    if (form.senha.length < 6) {
      return alert('A senha deve ter pelo menos 6 caracteres');
    }

    setLoading(true);
    try {
      const email = `${form.nome.toLowerCase().replace(/\s+/g, '.')}@controle-agua.local`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.senha,
        options: {
          data: { nome: form.nome },
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
          bairro_condominio: form.bairro_condominio,
          contato: form.contato,
        });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError);
        }
      }

      const link = `${window.location.origin}/login`;
      setLinkGerado(link);
      setSucesso(`Leitor "${form.nome}" cadastrado com sucesso! Envie o link abaixo para ele acessar:`);
      setForm({ nome: '', contato: '', bairro_condominio: '', senha: '', confirmarSenha: '' });
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
        <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: 20 }}>O leitor fará leituras de hidrômetro e gerará faturas na área dele.</p>

        {erro && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{erro}</div>
        )}
        {sucesso && (
          <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{sucesso}</div>
        )}
        {linkGerado && (
          <div style={{ background: '#EFF6FF', color: '#1E40AF', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem', wordBreak: 'break-all' }}>
            <strong>Link de acesso:</strong> {linkGerado}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Nome Completo *</label>
            <input style={inp} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div>
            <label style={lbl}>Contato</label>
            <input style={inp} value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label style={lbl}>Bairro/Condomínio de Atuação *</label>
            <input style={inp} value={form.bairro_condominio} onChange={e => setForm({ ...form, bairro_condominio: e.target.value })} required placeholder="Ex: Centro, Jardim Europa" />
          </div>
          <div>
            <label style={lbl}>Senha *</label>
            <input type="password" style={inp} value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} required placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label style={lbl}>Confirmar Senha *</label>
            <input type="password" style={inp} value={form.confirmarSenha} onChange={e => setForm({ ...form, confirmarSenha: e.target.value })} required placeholder="Repita a senha" />
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={() => router.push('/dashboard')} style={{ padding: '0.625rem 1.25rem', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Voltar</button>
            <button type="submit" disabled={loading} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Cadastrando...' : 'Cadastrar Leitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
