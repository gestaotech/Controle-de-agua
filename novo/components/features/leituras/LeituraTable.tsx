'use client';

import { formatMonthYear } from '@/lib/utils';
import styles from './LeituraTable.module.css';

interface Leitura {
  id: string;
  cliente_id: string;
  mes: string;
  anterior: number;
  atual: number;
  consumo: number;
  usuario_id: string;
  clientes: { nome: string; numero_hidrometro: string } | null;
}

interface LeituraTableProps {
  leituras: Leitura[];
  onGerarFatura: (id: string) => void;
  onDelete: (id: string) => void;
  userId?: string;
  isAdmin: boolean;
}

export default function LeituraTable({ leituras, onGerarFatura, onDelete, userId, isAdmin }: LeituraTableProps) {
  if (leituras.length === 0) {
    return <p className={styles.empty}>Nenhuma leitura encontrada</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Mês</th>
          <th>Anterior</th>
          <th>Atual</th>
          <th>Consumo</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {leituras.map(leitura => (
          <tr key={leitura.id}>
            <td>{leitura.clientes?.nome || 'N/A'}</td>
            <td>{formatMonthYear(leitura.mes)}</td>
            <td>{leitura.anterior} m³</td>
            <td>{leitura.atual} m³</td>
            <td><strong>{leitura.consumo} m³</strong></td>
            <td className={styles.actions}>
              <button onClick={() => onGerarFatura(leitura.id)} title="Gerar Fatura">📄</button>
              {(isAdmin || leitura.usuario_id === userId) && (
                <>
                  <button onClick={() => onDelete(leitura.id)} title="Excluir">🗑️</button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
