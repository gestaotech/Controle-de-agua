'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface Perfil {
  id: string;
  nome: string;
  perfil: 'admin' | 'leitor';
  ativo: boolean;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    const db = createClient();
    const { data } = await db.from('perfis').select('*').order('nome');
    setUsuarios(data || []);
    setLoading(false);
  };

  const toggleUsuario = async (id: string, ativo: boolean) => {
    const db = createClient();
    await db.from('perfis').update({ ativo }).eq('id', id);
    loadUsuarios();
  };

  const promoverUsuario = async (id: string, perfilAtual: string) => {
    const novoPerfil = perfilAtual === 'admin' ? 'leitor' : 'admin';
    if (!confirm(`Alterar perfil para ${novoPerfil}?`)) return;

    const db = createClient();
    await db.from('perfis').update({ perfil: novoPerfil }).eq('id', id);
    loadUsuarios();
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h3>Gestão de Usuários</h3>

        {usuarios.length === 0 ? (
          <p className={styles.empty}>Nenhum usuário encontrado</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(usuario => (
                <tr key={usuario.id}>
                  <td>{usuario.nome}</td>
                  <td>
                    <span className={`badge badge-${usuario.perfil === 'admin' ? 'info' : 'secondary'}`}>
                      {usuario.perfil === 'admin' ? 'Admin' : 'Leitor'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${usuario.ativo ? 'success' : 'danger'}`}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className={styles.actions}>
                    <button onClick={() => toggleUsuario(usuario.id, !usuario.ativo)} title={usuario.ativo ? 'Desativar' : 'Ativar'}>
                      {usuario.ativo ? '⏸️' : '▶️'}
                    </button>
                    <button onClick={() => promoverUsuario(usuario.id, usuario.perfil)} title="Alterar Perfil">
                      👤
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
