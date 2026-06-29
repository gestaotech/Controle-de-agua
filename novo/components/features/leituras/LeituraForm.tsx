'use client';

import { useState, useEffect } from 'react';
import { getCurrentMonth } from '@/lib/utils';
import styles from './LeituraForm.module.css';

interface Cliente {
  id: string;
  nome: string;
  numero_hidrometro: string;
}

interface LeituraFormProps {
  clientes: Cliente[];
  onSave: (leitura: { cliente_id: string; mes: string; anterior: number; atual: number }) => void;
}

export default function LeituraForm({ clientes, onSave }: LeituraFormProps) {
  const [clienteId, setClienteId] = useState('');
  const [mes, setMes] = useState(getCurrentMonth());
  const [anterior, setAnterior] = useState<number>(0);
  const [atual, setAtual] = useState<number>(0);
  const [consumo, setConsumo] = useState<number>(0);

  useEffect(() => {
    if (atual >= anterior) {
      setConsumo(atual - anterior);
    }
  }, [atual, anterior]);

  const handleClienteChange = async (id: string) => {
    setClienteId(id);

    if (!id) {
      setAnterior(0);
      return;
    }

    // Fetch last reading for this client
    const { createClient } = await import('@/lib/supabase/client');
    const db = createClient();

    const { data } = await db
      .from('leituras')
      .select('*')
      .eq('cliente_id', id)
      .order('mes', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setAnterior(data.atual);
    } else {
      setAnterior(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (atual < anterior) {
      alert('Leitura atual não pode ser menor que a anterior!');
      return;
    }

    onSave({
      cliente_id: clienteId,
      mes,
      anterior,
      atual,
    });

    setClienteId('');
    setAtual(0);
  };

  return (
    <div className={styles.card}>
      <h3>Nova Leitura</h3>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.group}>
          <label>Cliente *</label>
          <select value={clienteId} onChange={e => handleClienteChange(e.target.value)} required>
            <option value="">Selecione um cliente</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome} ({c.numero_hidrometro})</option>
            ))}
          </select>
        </div>

        <div className={styles.group}>
          <label>Mês/Ano *</label>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} required />
        </div>

        <div className={styles.group}>
          <label>Leitura Anterior (m³)</label>
          <input type="number" value={anterior} readOnly placeholder="Preenchido automaticamente" />
        </div>

        <div className={styles.group}>
          <label>Leitura Atual (m³) *</label>
          <input
            type="number"
            step="0.01"
            value={atual || ''}
            onChange={e => setAtual(parseFloat(e.target.value) || 0)}
            required
            placeholder="Digite a leitura atual"
          />
        </div>

        <div className={styles.group}>
          <label>Consumo (m³)</label>
          <input type="text" value={consumo.toFixed(2)} readOnly placeholder="Calculado automaticamente" />
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.save}>Registrar</button>
        </div>
      </form>
    </div>
  );
}
