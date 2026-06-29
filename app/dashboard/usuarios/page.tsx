'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from('perfis').select('*').order('nome');
    setUsuarios(data || []);
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Gestão de Usuários</h3>
      <table>
        <thead><tr><th>Nome</th><th>Perfil</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id}>
              <td>{u.nome}</td>
              <td><span className={`badge badge-${u.perfil === 'admin' ? 'info' : 'secondary'}`}>{u.perfil}</span></td>
              <td><span className={`badge badge-${u.ativo ? 'success' : 'danger'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td>
                <button onClick={async () => { await supabase.from('perfis').update({ ativo: !u.ativo }).eq('id', u.id); load(); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{u.ativo ? '⏸️' : '▶️'}</button>
                <button onClick={async () => { if (confirm(`Alterar para ${u.perfil === 'admin' ? 'leitor' : 'admin'}?`)) { await supabase.from('perfis').update({ perfil: u.perfil === 'admin' ? 'leitor' : 'admin' }).eq('id', u.id); load(); } }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>👤</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
