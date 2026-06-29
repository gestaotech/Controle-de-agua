'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import styles from './PagamentoForm.module.css';

interface CobrancaPendente {
  id: string;
  mes: string;
  valor_total: number;
  clientes: { nome: string } | null;
}

interface PagamentoFormProps {
  pendentes: CobrancaPendente[];
  onSave: (pagamento: { cobranca_id: string; data_pagamento: string; valor: number; metodo: string }) => void;
}

export default function PagamentoForm({ pendentes, onSave }: PagamentoFormProps) {
  const [cobrancaId, setCobrancaId] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [valor, setValor] = useState('');
  const [metodo, setMetodo] = useState('dinheiro');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      cobranca_id: cobrancaId,
      data_pagamento: dataPagamento,
      valor: parseFloat(valor),
      metodo,
    });

    setCobrancaId('');
    setValor('');
  };

  const handleCobrancaChange = (id: string) => {
    setCobrancaId(id);
    const cobranca = pendentes.find(c => c.id === id);
    if (cobranca) {
      setValor(cobranca.valor_total.toString());
    }
  };

  return (
    <div className={styles.card}>
      <h3>Registrar Pagamento</h3>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.group}>
          <label>Boleto *</label>
          <select value={cobrancaId} onChange={e => handleCobrancaChange(e.target.value)} required>
            <option value="">Selecione um boleto pendente</option>
            {pendentes.map(c => (
              <option key={c.id} value={c.id}>
                {c.clientes?.nome || 'N/A'} - {formatCurrency(c.valor_total)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.group}>
          <label>Data Pagamento *</label>
          <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} required />
        </div>

        <div className={styles.group}>
          <label>Valor Pago (R$) *</label>
          <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required />
        </div>

        <div className={styles.group}>
          <label>Método</label>
          <select value={metodo} onChange={e => setMetodo(e.target.value)}>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="transferencia">Transferência</option>
            <option value="cartao">Cartão</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.save}>Registrar</button>
        </div>
      </form>
    </div>
  );
}
