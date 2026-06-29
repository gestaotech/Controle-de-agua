'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface Config {
  empresa: string;
  valor_m3: number;
  taxa_fixa: number;
  multa: number;
  juros: number;
}

export default function ConfigPage() {
  const [config, setConfig] = useState<Config>({
    empresa: '',
    valor_m3: 8.50,
    taxa_fixa: 15.00,
    multa: 2.00,
    juros: 1.00,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const db = createClient();
    const { data } = await db.from('config').select('*').limit(1);

    if (data?.[0]) {
      setConfig({
        empresa: data[0].empresa,
        valor_m3: data[0].valor_m3,
        taxa_fixa: data[0].taxa_fixa,
        multa: data[0].multa,
        juros: data[0].juros,
      });
    }

    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = createClient();

    const { data } = await db.from('config').select('id').limit(1);

    if (data?.[0]) {
      await db.from('config').update(config).eq('id', data[0].id);
    } else {
      await db.from('config').insert(config);
    }

    alert('Configurações salvas!');
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h3>Configurações do Sistema</h3>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.group}>
            <label>Nome da Empresa</label>
            <input
              type="text"
              value={config.empresa}
              onChange={e => setConfig({ ...config, empresa: e.target.value })}
            />
          </div>

          <div className={styles.group}>
            <label>Valor por m³ (R$)</label>
            <input
              type="number"
              step="0.01"
              value={config.valor_m3}
              onChange={e => setConfig({ ...config, valor_m3: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className={styles.group}>
            <label>Taxa Fixa Mensal (R$)</label>
            <input
              type="number"
              step="0.01"
              value={config.taxa_fixa}
              onChange={e => setConfig({ ...config, taxa_fixa: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className={styles.group}>
            <label>Multa Atraso (%)</label>
            <input
              type="number"
              step="0.01"
              value={config.multa}
              onChange={e => setConfig({ ...config, multa: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className={styles.group}>
            <label>Juros ao Mês (%)</label>
            <input
              type="number"
              step="0.01"
              value={config.juros}
              onChange={e => setConfig({ ...config, juros: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.save}>Salvar Configurações</button>
          </div>
        </form>
      </div>
    </div>
  );
}
