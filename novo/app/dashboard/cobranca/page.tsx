'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatMonthYear, formatCurrency, formatDate, generateCode, generateBarcodeNumber } from '@/lib/utils';
import CobrancaForm from '@/components/features/cobranca/CobrancaForm';
import CobrancaTable from '@/components/features/cobranca/CobrancaTable';
import FaturaModal from '@/components/features/leituras/FaturaModal';
import styles from './page.module.css';

interface Cobranca {
  id: string;
  cliente_id: string;
  mes: string;
  consumo: number;
  valor_m3: number;
  taxa_fixa: number;
  valor_total: number;
  vencimento: string;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  clientes: { nome: string; numero_hidrometro: string; endereco?: string } | null;
}

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

export default function CobrancaPage() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [config, setConfig] = useState<Config>({ empresa: 'Saneamento Básico', valor_m3: 8.50, taxa_fixa: 15.00 });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [busca, filtroStatus]);

  const loadData = async () => {
    setLoading(true);
    const db = createClient();

    let query = db.from('cobrancas').select('*, clientes(nome, numero_hidrometro, endereco)');

    if (busca) {
      query = query.ilike('clientes.nome', `%${busca}%`);
    }

    if (filtroStatus) {
      query = query.eq('status', filtroStatus);
    }

    const [cobrancasRes, clientesRes, configRes] = await Promise.all([
      query.order('criado_em', { ascending: false }),
      db.from('clientes').select('id, nome, numero_hidrometro').eq('status', 'ativo').order('nome'),
      db.from('config').select('*').limit(1),
    ]);

    setCobrancas(cobrancasRes.data || []);
    setClientes(clientesRes.data || []);

    if (configRes.data?.[0]) {
      setConfig({
        empresa: configRes.data[0].empresa,
        valor_m3: configRes.data[0].valor_m3,
        taxa_fixa: configRes.data[0].taxa_fixa,
      });
    }

    setLoading(false);
  };

  const getLeitura = async (clienteId: string, mes: string) => {
    const db = createClient();
    const { data } = await db
      .from('leituras')
      .select('consumo')
      .eq('cliente_id', clienteId)
      .eq('mes', mes)
      .maybeSingle();

    return data?.consumo || null;
  };

  const handleSave = async (cobranca: { cliente_id: string; mes: string; valor_m3: number; taxa_fixa: number; vencimento: string }) => {
    const consumo = await getLeitura(cobranca.cliente_id, cobranca.mes);

    if (consumo === null) {
      alert('Leitura não encontrada para este cliente/mês!');
      return;
    }

    const valorTotal = (parseFloat(consumo) * cobranca.valor_m3) + cobranca.taxa_fixa;

    const db = createClient();

    const existente = await db
      .from('cobrancas')
      .select('*')
      .eq('cliente_id', cobranca.cliente_id)
      .eq('mes', cobranca.mes)
      .maybeSingle();

    if (existente.data) {
      alert('Já existe cobrança para este cliente/mês!');
      return;
    }

    await db.from('cobrancas').insert({
      ...cobranca,
      consumo: parseFloat(consumo),
      valor_total: valorTotal,
      usuario_id: user?.id,
      status: 'pendente',
    });

    loadData();
  };

  const handleMarcarPago = async (id: string) => {
    if (!confirm('Marcar como pago?')) return;

    const db = createClient();
    await db.from('cobrancas').update({ status: 'pago' }).eq('id', id);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta cobrança?')) return;

    const db = createClient();
    await db.from('cobrancas').delete().eq('id', id);
    loadData();
  };

  const handleImprimir = async (cobranca: Cobranca) => {
    const codigo = generateCode();

    setFatura({
      cliente: cobranca.clientes!,
      mes: cobranca.mes,
      consumo: cobranca.consumo,
      valorM3: cobranca.valor_m3,
      taxaFixa: cobranca.taxa_fixa,
      valorTotal: cobranca.valor_total,
      vencimento: cobranca.vencimento,
      empresa: config.empresa,
      codigo,
      barcodeNumber: generateBarcodeNumber(codigo),
    });
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className={styles.container}>
      <CobrancaForm clientes={clientes} config={config} onSave={handleSave} />

      <div className={styles.card}>
        <h3>Boletos Gerados</h3>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Nome do cliente..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="atrasado">Atrasado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <CobrancaTable
          cobrancas={cobrancas}
          onMarcarPago={handleMarcarPago}
          onImprimir={handleImprimir}
          onDelete={handleDelete}
        />
      </div>

      {fatura && <FaturaModal fatura={fatura} onClose={() => setFatura(null)} />}
    </div>
  );
}
