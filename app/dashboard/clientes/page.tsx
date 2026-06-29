'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Cliente { id: string; nome: string; cpf: string; endereco: string; numero_hidrometro: string; telefone: string; status: string; }

const inputStyle = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const labelStyle = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' };

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({ nome: '', cpf: '', endereco: '', numero_hidrometro: '', telefone: '', status: 'ativo' });
  const [editId, setEditId] = useState('');
  const [busca, setBusca] = useState('');
  const supabase = createClient();

  const load = async () => {
    let q = supabase.from('clientes').select('*');
    if (busca) q = q.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,numero_hidrometro.ilike.%${busca}%`);
    const { data } = await q.order('nome');
    setClientes(data || []);
  };

  useEffect(() => { load(); }, [busca]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.numero_hidrometro) return alert('Preencha os campos obrigatórios');
    if (editId) {
      await supabase.from('clientes').update(form).eq('id', editId);
    } else {
      await supabase.from('clientes').insert(form);
    }
    setForm({ nome: '', cpf: '', endereco: '', numero_hidrometro: '', telefone: '', status: 'ativo' });
    setEditId('');
    load();
  };

  const edit = (c: Cliente) => {
    setForm({ nome: c.nome, cpf: c.cpf || '', endereco: c.endereco || '', numero_hidrometro: c.numero_hidrometro, telefone: c.telefone || '', status: c.status });
    setEditId(c.id);
  };

  const del = async (id: string) => {
    if (!confirm('Excluir?')) return;
    await supabase.from('clientes').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>{editId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div><label style={labelStyle}>Nome *</label><input style={inputStyle} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label style={labelStyle}>CPF</label><input style={inputStyle} value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} /></div>
          <div><label style={labelStyle}>Endereço</label><input style={inputStyle} value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></div>
          <div><label style={labelStyle}>Hidrômetro *</label><input style={inputStyle} value={form.numero_hidrometro} onChange={e => setForm({ ...form, numero_hidrometro: e.target.value })} required /></div>
          <div><label style={labelStyle}>Telefone</label><input style={inputStyle} value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
          <div><label style={labelStyle}>Status</label><select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></select></div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            {editId && <button type="button" onClick={() => { setEditId(''); setForm({ nome: '', cpf: '', endereco: '', numero_hidrometro: '', telefone: '', status: 'ativo' }); }} style={{ padding: '0.625rem 1.25rem', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>}
            <button type="submit" style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>Salvar</button>
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ ...inputStyle, maxWidth: 300 }} />
        </div>
        <table>
          <thead><tr><th>Nome</th><th>CPF</th><th>Hidrômetro</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id}>
                <td>{c.nome}</td><td>{c.cpf || '-'}</td><td>{c.numero_hidrometro}</td>
                <td><span className={`badge badge-${c.status === 'ativo' ? 'success' : 'danger'}`}>{c.status}</span></td>
                <td>
                  <button onClick={() => edit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => del(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
