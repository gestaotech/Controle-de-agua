'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ClienteForm from '@/components/features/clientes/ClienteForm';
import ClienteTable from '@/components/features/clientes/ClienteTable';
import styles from './page.module.css';

interface Cliente {
  id: string;
  nome: string;
  cpf: string | null;
  endereco: string | null;
  numero_hidrometro: string;
  telefone: string | null;
  status: 'ativo' | 'inativo';
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const { showToast } = useAuth();

  useEffect(() => {
    loadClientes();
  }, [busca, filtroStatus]);

  const loadClientes = async () => {
    setLoading(true);
    const db = createClient();

    let query = db.from('clientes').select('*');

    if (busca) {
      query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%,numero_hidrometro.ilike.%${busca}%`);
    }

    if (filtroStatus) {
      query = query.eq('status', filtroStatus);
    }

    const { data } = await query.order('nome');
    setClientes(data || []);
    setLoading(false);
  };

  const handleSave = async (cliente: Omit<Cliente, 'id'>) => {
    const db = createClient();

    if (clienteEditando) {
      await db.from('clientes').update(cliente).eq('id', clienteEditando.id);
    } else {
      await db.from('clientes').insert(cliente);
    }

    setClienteEditando(null);
    loadClientes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    const db = createClient();
    await db.from('clientes').delete().eq('id', id);
    loadClientes();
  };

  return (
    <div className={styles.container}>
      <ClienteForm
        cliente={clienteEditando}
        onSave={handleSave}
        onCancel={() => setClienteEditando(null)}
      />

      <div className={styles.card}>
        <h3>Lista de Clientes</h3>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Nome, CPF ou hidrômetro..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        <ClienteTable
          clientes={clientes}
          loading={loading}
          onEdit={setClienteEditando}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
