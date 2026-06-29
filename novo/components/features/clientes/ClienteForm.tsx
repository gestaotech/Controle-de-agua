'use client';

import { useState, useEffect } from 'react';
import styles from './ClienteForm.module.css';

interface Cliente {
  id: string;
  nome: string;
  cpf: string | null;
  endereco: string | null;
  numero_hidrometro: string;
  telefone: string | null;
  status: 'ativo' | 'inativo';
}

interface ClienteFormProps {
  cliente: Cliente | null;
  onSave: (cliente: Omit<Cliente, 'id'>) => void;
  onCancel: () => void;
}

export default function ClienteForm({ cliente, onSave, onCancel }: ClienteFormProps) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numeroHidrometro, setNumeroHidrometro] = useState('');
  const [telefone, setTelefone] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');

  useEffect(() => {
    if (cliente) {
      setNome(cliente.nome);
      setCpf(cliente.cpf || '');
      setEndereco(cliente.endereco || '');
      setNumeroHidrometro(cliente.numero_hidrometro);
      setTelefone(cliente.telefone || '');
      setStatus(cliente.status);
    } else {
      resetForm();
    }
  }, [cliente]);

  const resetForm = () => {
    setNome('');
    setCpf('');
    setEndereco('');
    setNumeroHidrometro('');
    setTelefone('');
    setStatus('ativo');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nome,
      cpf: cpf || null,
      endereco: endereco || null,
      numero_hidrometro: numeroHidrometro,
      telefone: telefone || null,
      status,
    });
    resetForm();
  };

  return (
    <div className={styles.card}>
      <h3>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h3>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.group}>
          <label>Nome Completo *</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            required
          />
        </div>

        <div className={styles.group}>
          <label>CPF/CNPJ</label>
          <input
            type="text"
            value={cpf}
            onChange={e => setCpf(e.target.value)}
          />
        </div>

        <div className={styles.group}>
          <label>Endereço</label>
          <input
            type="text"
            value={endereco}
            onChange={e => setEndereco(e.target.value)}
          />
        </div>

        <div className={styles.group}>
          <label>Número Hidrômetro *</label>
          <input
            type="text"
            value={numeroHidrometro}
            onChange={e => setNumeroHidrometro(e.target.value)}
            required
          />
        </div>

        <div className={styles.group}>
          <label>Telefone</label>
          <input
            type="text"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
          />
        </div>

        <div className={styles.group}>
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as 'ativo' | 'inativo')}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className={styles.save}>
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
