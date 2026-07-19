'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { inp, lbl } from '@/lib/styles';

interface Bairro {
  id: string; nome: string;
}

interface Unidade {
  id: string; endereco: string; numero_hidrometro: string;
  bairro_id: string; leitura_inicial: number; data_leitura_inicial: string;
  status: string; bairros: { nome: string } | null;
}

export default function UnidadesPage() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [form, setForm] = useState({
    endereco: '', numero_hidrometro: '', bairro_id: '',
    leitura_inicial: 0, data_leitura_inicial: new Date().toISOString().split('T')[0], status: 'ativo',
  });
  const [editId, setEditId] = useState('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');
  const supabase = createClient();

  const load = async () => {
    setErro('');
    try {
      let q = supabase.from('unidades').select('*, bairros(nome)');
      if (busca) q = q.or(`endereco.ilike.%${busca}%,numero_hidrometro.ilike.%${busca}%`);
      const [u, b] = await Promise.all([q.order('endereco'), supabase.from('bairros').select('id, nome').eq('ativo', true).order('nome')]);
      setUnidades(u.data || []);
      setBairros(b.data || []);
    } catch {
      setErro('Erro ao carregar unidades.');
    }
  };

  useEffect(() => { load(); }, [busca]);

  useEffect(() => {
    const channel = supabase.channel('unidades-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.endereco || !form.numero_hidrometro || !form.bairro_id) {
      return alert('Preencha endereço, hidrômetro e bairro/condomínio');
    }
    try {
      if (editId) {
        await supabase.from('unidades').update({
          endereco: form.endereco, numero_hidrometro: form.numero_hidrometro,
          bairro_id: form.bairro_id, status: form.status,
        }).eq('id', editId);
      } else {
        await supabase.from('unidades').insert({
          endereco: form.endereco, numero_hidrometro: form.numero_hidrometro,
          bairro_id: form.bairro_id, leitura_inicial: form.leitura_inicial,
          data_leitura_inicial: form.data_leitura_inicial, status: form.status,
        });
      }
      resetForm();
      load();
    } catch {
      alert('Erro ao salvar unidade.');
    }
  };

  const resetForm = () => {
    setForm({ endereco: '', numero_hidrometro: '', bairro_id: '', leitura_inicial: 0, data_leitura_inicial: new Date().toISOString().split('T')[0], status: 'ativo' });
    setEditId('');
  };

  const edit = (u: Unidade) => {
    setForm({
      endereco: u.endereco, numero_hidrometro: u.numero_hidrometro, bairro_id: u.bairro_id,
      leitura_inicial: Number(u.leitura_inicial), data_leitura_inicial: u.data_leitura_inicial, status: u.status,
    });
    setEditId(u.id);
  };

  const del = async (id: string) => {
    if (!confirm('Excluir esta unidade?')) return;
    try { await supabase.from('unidades').delete().eq('id', id); load(); } catch { alert('Erro ao excluir unidade.'); }
  };

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>{editId ? 'Editar Unidade' : 'Nova Unidade'}</h3>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Endereço *</label>
            <input style={inp} value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} required placeholder="Rua, avenida..." />
          </div>
          <div>
            <label style={lbl}>Nº Hidrômetro *</label>
            <input style={inp} value={form.numero_hidrometro} onChange={e => setForm({ ...form, numero_hidrometro: e.target.value })} required />
          </div>
          <div>
            <label style={lbl}>Bairro/Condomínio *</label>
            <select style={inp} value={form.bairro_id} onChange={e => setForm({ ...form, bairro_id: e.target.value })} required>
              <option value="">Selecione</option>
              {bairros.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
          {!editId && (
            <>
              <div>
                <label style={lbl}>Leitura Inicial (m³)</label>
                <input type="number" step="0.01" style={inp} value={form.leitura_inicial} onChange={e => setForm({ ...form, leitura_inicial: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label style={lbl}>Data da Leitura Inicial</label>
                <input type="date" style={inp} value={form.data_leitura_inicial} onChange={e => setForm({ ...form, data_leitura_inicial: e.target.value })} />
              </div>
            </>
          )}
          <div>
            <label style={lbl}>Status</label>
            <select style={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            {editId && <button type="button" onClick={resetForm} style={{ padding: '0.625rem 1.25rem', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>}
            <button type="submit" style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}>{editId ? 'Atualizar' : 'Cadastrar'}</button>
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: 16 }}>
          <input placeholder="Buscar endereço ou hidrômetro..." value={busca} onChange={e => setBusca(e.target.value)} style={{ ...inp, maxWidth: 400 }} />
        </div>
        <table>
          <thead><tr><th>Endereço</th><th>Hidrômetro</th><th>Bairro</th><th>Leitura Inicial</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {unidades.map(u => (
              <tr key={u.id}>
                <td>{u.endereco}</td>
                <td>{u.numero_hidrometro}</td>
                <td>{u.bairros?.nome || '-'}</td>
                <td>{Number(u.leitura_inicial).toFixed(2)} m³</td>
                <td><span className={`badge badge-${u.status === 'ativo' ? 'success' : 'danger'}`}>{u.status}</span></td>
                <td>
                  <button onClick={() => edit(u)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => del(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {unidades.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhuma unidade</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
