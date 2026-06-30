'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';

export default function UsuariosPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [erro, setErro] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/dashboard');
  }, [isAdmin, authLoading, router]);

  const load = async () => {
    setErro('');
    try {
      const { data } = await supabase.from('perfis').select('*').order('nome');
      setUsuarios(data || []);
    } catch {
      setErro('Erro ao carregar usuários.');
    }
  };

  useEffect(() => { if (!authLoading && isAdmin) load(); }, [authLoading, isAdmin]);

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      await supabase.from('perfis').update({ ativo }).eq('id', id);
      load();
    } catch {
      alert('Erro ao alterar status do usuário.');
    }
  };

  const togglePerfil = async (id: string, perfilAtual: string) => {
    const novo = perfilAtual === 'admin' ? 'leitor' : 'admin';
    if (!confirm(`Alterar perfil para ${novo}?`)) return;
    try {
      await supabase.from('perfis').update({ perfil: novo }).eq('id', id);
      load();
    } catch {
      alert('Erro ao alterar perfil do usuário.');
    }
  };

  if (authLoading) return <p>Carregando...</p>;
  if (!isAdmin) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Gestão de Usuários</h3>
      {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
      <table>
        <thead><tr><th>Nome</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td>{u.nome}</td>
              <td><span className={`badge badge-${u.perfil === 'admin' ? 'info' : 'secondary'}`}>{u.perfil}</span></td>
              <td><span className={`badge badge-${u.ativo ? 'success' : 'danger'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td>
                <button onClick={() => toggleAtivo(u.id, !u.ativo)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title={u.ativo ? 'Desativar' : 'Ativar'}>
                  {u.ativo ? '⏸️' : '▶️'}
                </button>
                <button onClick={() => togglePerfil(u.id, u.perfil)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Alterar Perfil">
                  👤
                </button>
              </td>
            </tr>
          ))}
          {usuarios.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhum usuário</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
