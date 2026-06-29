'use client';

import styles from './ClienteTable.module.css';

interface Cliente {
  id: string;
  nome: string;
  cpf: string | null;
  endereco: string | null;
  numero_hidrometro: string;
  telefone: string | null;
  status: 'ativo' | 'inativo';
}

interface ClienteTableProps {
  clientes: Cliente[];
  loading: boolean;
  onEdit: (cliente: Cliente) => void;
  onDelete: (id: string) => void;
}

export default function ClienteTable({ clientes, loading, onEdit, onDelete }: ClienteTableProps) {
  if (loading) return <p>Carregando...</p>;

  if (clientes.length === 0) {
    return <p className={styles.empty}>Nenhum cliente encontrado</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF</th>
          <th>Endereço</th>
          <th>Hidrômetro</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {clientes.map(cliente => (
          <tr key={cliente.id}>
            <td>{cliente.nome}</td>
            <td>{cliente.cpf || '-'}</td>
            <td>{cliente.endereco || '-'}</td>
            <td>{cliente.numero_hidrometro}</td>
            <td>
              <span className={`badge badge-${cliente.status === 'ativo' ? 'success' : 'danger'}`}>
                {cliente.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </td>
            <td className={styles.actions}>
              <button onClick={() => onEdit(cliente)} title="Editar">✏️</button>
              <button onClick={() => onDelete(cliente.id)} title="Excluir">🗑️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
