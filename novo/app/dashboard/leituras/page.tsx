'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatMonthYear, formatCurrency, formatDate, generateCode, generateBarcodeNumber } from '@/lib/utils';
import LeituraForm from '@/components/features/leituras/LeituraForm';
import LeituraTable from '@/components/features/leituras/LeituraTable';
import FaturaModal from '@/components/features/leituras/FaturaModal';
import styles from './page.module.css';

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

interface Cliente {
  id: string;
  nome: string;
  numero_hidrometro: string;
}

interface Fatura {
  cliente: Cliente;
  mes: string;
  consumo: number;
  valorM3: number;
  taxaFixa: number;
  valorTotal: number;
  vencimento: string;
  empresa: string;
  codigo: string;
  barcodeNumber: string;
}

export default function LeiturasPage() {
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = createClient();

    const [leiturasRes, clientesRes] = await Promise.all([
      db.from('leituras').select('*, clientes(nome, numero_hidrometro)').order('mes', { ascending: false }),
      db.from('clientes').select('id, nome, numero_hidrometro').eq('status', 'ativo').order('nome'),
    ]);

    setLeituras(leiturasRes.data || []);
    setClientes(clientesRes.data || []);
    setLoading(false);
  };

  const getUltimaLeitura = async (clienteId: string) => {
    const db = createClient();
    const { data } = await db
      .from('leituras')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('mes', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  };

  const handleSave = async (leitura: { cliente_id: string; mes: string; anterior: number; atual: number }) => {
    const db = createClient();

    const existente = await db
      .from('leituras')
      .select('*')
      .eq('cliente_id', leitura.cliente_id)
      .eq('mes', leitura.mes)
      .maybeSingle();

    if (existente.data) {
      await db.from('leituras').update(leitura).eq('id', existente.data.id);
    } else {
      await db.from('leituras').insert({ ...leitura, usuario_id: user?.id });
    }

    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta leitura?')) return;

    const db = createClient();
    await db.from('leituras').delete().eq('id', id);
    loadData();
  };

  const handleGerarFatura = async (leituraId: string) => {
    const db = createClient();

    const { data: leitura } = await db
      .from('leituras')
      .select('*, clientes(*)')
      .eq('id', leituraId)
      .single();

    if (!leitura) return;

    const { data: configArr } = await db.from('config').select('*').limit(1);
    const config = configArr?.[0] || { empresa: 'Saneamento Básico', valor_m3: 8.50, taxa_fixa: 15.00 };

    const consumo = parseFloat(leitura.consumo);
    const valorM3 = parseFloat(config.valor_m3);
    const taxaFixa = parseFloat(config.taxa_fixa);
    const valorTotal = (consumo * valorM3) + taxaFixa;

    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 10);

    const codigo = generateCode();

    setFatura({
      cliente: leitura.clientes,
      mes: leitura.mes,
      consumo,
      valorM3,
      taxaFixa,
      valorTotal,
      vencimento: vencimento.toISOString().split('T')[0],
      empresa: config.empresa,
      codigo,
      barcodeNumber: generateBarcodeNumber(codigo),
    });
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className={styles.container}>
      <LeituraForm clientes={clientes} onSave={handleSave} />

      <div className={styles.card}>
        <h3>Histórico de Leituras</h3>
        <LeituraTable
          leituras={leituras}
          onGerarFatura={handleGerarFatura}
          onDelete={handleDelete}
          userId={user?.id}
          isAdmin={isAdmin}
        />
      </div>

      {fatura && <FaturaModal fatura={fatura} onClose={() => setFatura(null)} />}
    </div>
  );
}
