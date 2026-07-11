'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const lbl = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' as const };

interface Bairro {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
}

export default function BairrosPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [novoBairro, setNovoBairro] = useState('');
  const [editando, setEditando] = useState<Bairro | null>(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/dashboard');
  }, [isAdmin, authLoading, router]);

  const load = async () => {
    if (!isAdmin) return;
    setErro('');
    try {
      const { data, error } = await supabase
        .from('bairros')
        .select('*')
        .order('nome');
      if (error) throw error;
      setBairros(data || []);
    } catch {
      setErro('Erro ao carregar bairros.');
    }
  };

  useEffect(() => { load(); }, [isAdmin]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!novoBairro.trim()) {
      setErro('Digite o nome do bairro.');
      return;
    }

    try {
      if (editando) {
        const { error } = await supabase
          .from('bairros')
          .update({ nome: novoBairro.trim() })
          .eq('id', editando.id);
        if (error) {
          if (error.code === '23505') {
            setErro('Já existe um bairro com esse nome.');
            return;
          }
          throw error;
        }
        setSucesso('Bairro atualizado!');
        setEditando(null);
      } else {
        const { error } = await supabase
          .from('bairros')
          .insert({ nome: novoBairro.trim() });
        if (error) {
          if (error.code === '23505') {
            setErro('Já existe um bairro com esse nome.');
            return;
          }
          throw error;
        }
        setSucesso('Bairro cadastrado!');
      }
      setNovoBairro('');
      load();
      setTimeout(() => setSucesso(''), 3000);
    } catch {
      setErro('Erro ao salvar bairro.');
    }
  };

  const toggleAtivo = async (bairro: Bairro) => {
    try {
      await supabase
        .from('bairros')
        .update({ ativo: !bairro.ativo })
        .eq('id', bairro.id);
      load();
    } catch {
      setErro('Erro ao alterar status.');
    }
  };

  const excluir = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este bairro?')) return;
    try {
      const { error } = await supabase.from('bairros').delete().eq('id', id);
      if (error) {
        if (error.code === '23503') {
          setErro('Não é possível excluir bairro vinculado a unidades ou leitores.');
          return;
        }
        throw error;
      }
      load();
    } catch {
      setErro('Erro ao excluir bairro.');
    }
  };

  const iniciarEdicao = (bairro: Bairro) => {
    setEditando(bairro);
    setNovoBairro(bairro.nome);
    setErro('');
    setSucesso('');
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setNovoBairro('');
    setErro('');
  };

  if (authLoading) return <p>Carregando...</p>;
  if (!isAdmin) return null;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: 500 }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>
          {editando ? 'Editar Bairro/Condomínio' : 'Cadastrar Bairro/Condomínio'}
        </h3>
        {erro && <p style={{ color: '#DC2626', marginBottom: 12, fontSize: '0.85rem' }}>{erro}</p>}
        {sucesso && <p style={{ color: '#16A34A', marginBottom: 12, fontSize: '0.85rem' }}>{sucesso}</p>}
        <form onSubmit={salvar} style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Nome</label>
            <input
              style={inp}
              value={novoBairro}
              onChange={e => setNovoBairro(e.target.value)}
              placeholder="Ex: Centro, Jardim das Flores, Condomínio Sol..."
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button type="submit" style={{ padding: '0.625rem 1.5rem', background: editando ? '#F59E0B' : '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {editando ? 'Atualizar' : 'Cadastrar'}
            </button>
            {editando && (
              <button type="button" onClick={cancelarEdicao} style={{ padding: '0.625rem 1rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>
          Bairros Cadastrados ({bairros.length})
        </h3>
        <table>
          <thead>
            <tr><th>Nome</th><th>Status</th><th>Cadastro</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {bairros.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhum bairro cadastrado</td></tr>
            ) : bairros.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 500 }}>{b.nome}</td>
                <td>
                  <span
                    onClick={() => toggleAtivo(b)}
                    style={{
                      padding: '2px 10px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: b.ativo ? '#D1FAE5' : '#FEE2E2',
                      color: b.ativo ? '#065F46' : '#991B1B',
                    }}
                  >
                    {b.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  {new Date(b.criado_em).toLocaleDateString('pt-BR')}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => iniciarEdicao(b)} style={{ padding: '4px 10px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
                      Editar
                    </button>
                    <button onClick={() => excluir(b.id)} style={{ padding: '4px 10px', background: '#EF4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
