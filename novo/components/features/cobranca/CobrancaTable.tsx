'use client';

import { formatMonthYear, formatCurrency, formatDate } from '@/lib/utils';
import styles from './CobrancaTable.module.css';

interface Cobranca {
  id: string;
  mes: string;
  consumo: number;
  valor_total: number;
  vencimento: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  clientes: { nome: string } | null;
}

interface CobrancaTableProps {
  cobrancas: Cobranca[];
  onMarcarPago: (id: string) => void;
  onImprimir: (cobranca: Cobranca) => void;
  onDelete: (id: string) => void;
}

export default function CobrancaTable({ cobrancas, onMarcarPago, onImprimir, onDelete }: CobrancaTableProps) {
  if (cobrancas.length === 0) {
    return <p className={styles.empty}>Nenhuma cobrança encontrada</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Mês</th>
          <th>Consumo</th>
          <th>Valor</th>
          <th>Vencimento</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {cobrancas.map(cobranca => (
          <tr key={cobranca.id}>
            <td>{cobranca.clientes?.nome || 'N/A'}</td>
            <td>{formatMonthYear(cobranca.mes)}</td>
            <td>{cobranca.consumo} m³</td>
            <td>{formatCurrency(cobranca.valor_total)}</td>
            <td>{formatDate(cobranca.vencimento)}</td>
            <td>
              <span className={`badge badge-${cobranca.status === 'pago' ? 'success' : cobranca.status === 'pendente' ? 'warning' : 'danger'}`}>
                {cobranca.status}
              </span>
            </td>
            <td className={styles.actions}>
              <button onClick={() => onImprimir(cobranca)} title="Imprimir">🖨️</button>
              {cobranca.status === 'pendente' && (
                <button onClick={() => onMarcarPago(cobranca.id)} title="Marcar como Pago">✅</button>
              )}
              <button onClick={() => onDelete(cobranca.id)} title="Excluir">🗑️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
