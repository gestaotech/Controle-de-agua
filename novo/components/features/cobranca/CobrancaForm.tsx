'use client';

import { useState, useEffect } from 'react';
import { getCurrentMonth } from '@/lib/utils';
import styles from './CobrancaForm.module.css';

interface Cliente {
  id: string;
  nome: string;
  numero_hidrometro: string;
}

interface Config {
  empresa: string;
  valor_m3: number;
  taxa_fixa: number;
}

interface CobrancaFormProps {
  clientes: Cliente[];
  config: Config;
  onSave: (cobranca: { cliente_id: string; mes: string; valor_m3: number; taxa_fixa: number; vencimento: string }) => void;
}

export default function CobrancaForm({ clientes, config, onSave }: CobrancaFormProps) {
  const [clienteId, setClienteId] = useState('');
  const [mes, setMes] = useState(getCurrentMonth());
  const [consumo, setConsumo] = useState('');
  const [valorM3, setValorM3] = useState(config.valor_m3);
  const [taxaFixa, setTaxaFixa] = useState(config.taxa_fixa);
  const [total, setTotal] = useState('');
  const [vencimento, setVencimento] = useState('');

  useEffect(() => {
    setValorM3(config.valor_m3);
    setTaxaFixa(config.taxa_fixa);
  }, [config]);

  useEffect(() => {
    const consumoNum = parseFloat(consumo) || 0;
    const totalCalc = (consumoNum * valorM3) + taxaFixa;
    setTotal(totalCalc > 0 ? `R$ ${totalCalc.toFixed(2).replace('.', ',')}` : '');
  }, [consumo, valorM3, taxaFixa]);

  const handleClienteChange = async (id: string) => {
    setClienteId(id);
    setConsumo('');

    if (!id || !mes) return;

    const { createClient } = await import('@/lib/supabase/client');
    const db = createClient();

    const { data } = await db
      .from('leituras')
      .select('consumo')
      .eq('cliente_id', id)
      .eq('mes', mes)
      .maybeSingle();

    if (data) {
      setConsumo(data.consumo.toString());
    } else {
      setConsumo('Leitura não encontrada');
    }
  };

  const handleMesChange = async (m: string) => {
    setMes(m);
    setConsumo('');

    if (!clienteId || !m) return;

    const { createClient } = await import('@/lib/supabase/client');
    const db = createClient();

    const { data } = await db
      .from('leituras')
      .select('consumo')
      .eq('cliente_id', clienteId)
      .eq('mes', m)
      .maybeSingle();

    if (data) {
      setConsumo(data.consumo.toString());
    } else {
      setConsumo('Leitura não encontrada');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ cliente_id: clienteId, mes, valor_m3: valorM3, taxa_fixa: taxaFixa, vencimento });
    setClienteId('');
    setConsumo('');
    setTotal('');
  };

  return (
    <div className={styles.card}>
      <h3>Nova Cobrança</h3>

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
          <input type="month" value={mes} onChange={e => handleMesChange(e.target.value)} required />
        </div>

        <div className={styles.group}>
          <label>Consumo (m³)</label>
          <input type="text" value={consumo} readOnly placeholder="Leitura não encontrada" />
        </div>

        <div className={styles.group}>
          <label>Valor por m³ (R$) *</label>
          <input type="number" step="0.01" value={valorM3} onChange={e => setValorM3(parseFloat(e.target.value) || 0)} required />
        </div>

        <div className={styles.group}>
          <label>Taxa Fixa (R$)</label>
          <input type="number" step="0.01" value={taxaFixa} onChange={e => setTaxaFixa(parseFloat(e.target.value) || 0)} />
        </div>

        <div className={styles.group}>
          <label>Total (R$)</label>
          <input type="text" value={total} readOnly placeholder="Calculado automaticamente" />
        </div>

        <div className={styles.group}>
          <label>Vencimento *</label>
          <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} required />
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.save}>Gerar Boleto</button>
        </div>
      </form>
    </div>
  );
}
