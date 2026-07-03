'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useRouter } from 'next/navigation';

const inp = { width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: '0.95rem' };
const lbl = { fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' as const };

interface Leitor {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
  bairro_condominio: string;
  contato: string;
  criado_em: string;
}

export default function CadastrarLeitorPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', contato: '', bairro_condominio: '', senha: '', confirmarSenha: '' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [linkGerado, setLinkGerado] = useState('');
  const [leitores, setLeitores] = useState<Leitor[]>([]);
  const [leitorSelecionado, setLeitorSelecionado] = useState<Leitor | null>(null);
  const [senhaModal, setSenhaModal] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const [loadingModal, setLoadingModal] = useState(false);
  const supabase = createClient();

  if (!authLoading && !isAdmin) {
    router.push('/dashboard');
    return null;
  }

  const loadLeitores = async () => {
    try {
      const { data } = await supabase.from('perfis').select('*').eq('perfil', 'leitor').order('nome');
      setLeitores(data || []);
    } catch {}
  };

  useEffect(() => { if (!authLoading && isAdmin) loadLeitores(); }, [authLoading, isAdmin]);

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
        options: { data: { nome: form.nome }, emailRedirectTo: undefined },
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
        if (profileError) throw profileError;
      }

      const link = `${window.location.origin}/login`;
      setLinkGerado(link);
      setSucesso(`Leitor "${form.nome}" cadastrado com sucesso!`);
      setForm({ nome: '', contato: '', bairro_condominio: '', senha: '', confirmarSenha: '' });
      loadLeitores();
    } catch (err: any) {
      setErro(err.message || 'Erro ao cadastrar leitor');
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalhes = (leitor: Leitor) => {
    setLeitorSelecionado(leitor);
    setAutenticado(false);
    setSenhaModal('');
    setErroSenha('');
  };

  const fecharModal = () => {
    setLeitorSelecionado(null);
    setAutenticado(false);
    setSenhaModal('');
    setErroSenha('');
  };

  const verificarSenha = async () => {
    if (!senhaModal) return;
    setLoadingModal(true);
    setErroSenha('');
    try {
      const email = user?.email;
      if (!email) { setErroSenha('Erro ao verificar senha.'); setLoadingModal(false); return; }
      const { error } = await supabase.auth.signInWithPassword({ email, password: senhaModal });
      if (error) {
        setErroSenha('Senha incorreta.');
      } else {
        setAutenticado(true);
      }
    } catch {
      setErroSenha('Erro ao verificar senha.');
    } finally {
      setLoadingModal(false);
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    try {
      await supabase.from('perfis').update({ ativo }).eq('id', id);
      loadLeitores();
    } catch {
      alert('Erro ao alterar status.');
    }
  };

  if (authLoading) return <p>Carregando...</p>;

  return (
    <div>
      {/* Formulario de cadastro */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: 700 }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Cadastrar Novo Leitor</h3>

        {erro && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{erro}</div>}
        {sucesso && <div style={{ background: '#D1FAE5', color: '#065F46', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{sucesso}</div>}
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
          <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={loading} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Cadastrando...' : 'Cadastrar Leitor'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de leitores cadastrados */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: 16, color: '#64748B', fontSize: '0.95rem' }}>Leitores Cadastrados</h3>
        <table>
          <thead>
            <tr><th>Nome</th><th>Contato</th><th>Bairro</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {leitores.map(l => (
              <tr key={l.id}>
                <td>{l.nome}</td>
                <td>{l.contato || '-'}</td>
                <td>{l.bairro_condominio || '-'}</td>
                <td><span className={`badge badge-${l.ativo ? 'success' : 'danger'}`}>{l.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                  <button onClick={() => abrirDetalhes(l)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Ver detalhes">👁️</button>
                  <button onClick={() => toggleAtivo(l.id, !l.ativo)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title={l.ativo ? 'Desativar' : 'Ativar'}>
                    {l.ativo ? '⏸️' : '▶️'}
                  </button>
                </td>
              </tr>
            ))}
            {leitores.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8' }}>Nenhum leitor cadastrado</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Modal de autenticacao + detalhes */}
      {leitorSelecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }} onClick={e => { if (e.target === e.currentTarget) fecharModal(); }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 450, width: '100%' }}>
            {!autenticado ? (
              <>
                <h3 style={{ marginBottom: 8, fontSize: '1.1rem' }}>🔒 Acesso Restrito</h3>
                <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: 20 }}>Insira sua senha para ver as informações do leitor.</p>
                {erroSenha && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' }}>{erroSenha}</div>}
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Sua Senha</label>
                  <input type="password" style={inp} value={senhaModal} onChange={e => setSenhaModal(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && verificarSenha()} autoFocus />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={fecharModal} style={{ padding: '0.625rem 1.25rem', background: '#F1F5F9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={verificarSenha} disabled={loadingModal} style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', opacity: loadingModal ? 0.7 : 1 }}>
                    {loadingModal ? 'Verificando...' : 'Confirmar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Dados do Leitor</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Nome</span>
                    <span style={{ fontWeight: 500 }}>{leitorSelecionado.nome}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Contato</span>
                    <span style={{ fontWeight: 500 }}>{leitorSelecionado.contato || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Bairro/Condomínio</span>
                    <span style={{ fontWeight: 500 }}>{leitorSelecionado.bairro_condominio || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Status</span>
                    <span className={`badge badge-${leitorSelecionado.ativo ? 'success' : 'danger'}`}>{leitorSelecionado.ativo ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Cadastrado em</span>
                    <span style={{ fontWeight: 500 }}>{new Date(leitorSelecionado.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                    <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Email de login</span>
                    <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{leitorSelecionado.nome.toLowerCase().replace(/\s+/g, '.')}@controle-agua.local</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button onClick={fecharModal} style={{ padding: '0.625rem 1.5rem', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
