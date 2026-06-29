export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string;
          nome: string;
          cpf: string | null;
          endereco: string | null;
          numero_hidrometro: string;
          telefone: string | null;
          status: 'ativo' | 'inativo';
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cpf?: string | null;
          endereco?: string | null;
          numero_hidrometro: string;
          telefone?: string | null;
          status?: 'ativo' | 'inativo';
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          cpf?: string | null;
          endereco?: string | null;
          numero_hidrometro?: string;
          telefone?: string | null;
          status?: 'ativo' | 'inativo';
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      leituras: {
        Row: {
          id: string;
          cliente_id: string;
          usuario_id: string;
          mes: string;
          anterior: number;
          atual: number;
          consumo: number;
          criado_em: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          usuario_id: string;
          mes: string;
          anterior: number;
          atual: number;
          criado_em?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          usuario_id?: string;
          mes?: string;
          anterior?: number;
          atual?: number;
          criado_em?: string;
        };
      };
      cobrancas: {
        Row: {
          id: string;
          cliente_id: string;
          usuario_id: string;
          mes: string;
          consumo: number;
          valor_m3: number;
          taxa_fixa: number;
          valor_total: number;
          vencimento: string;
          status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          cliente_id: string;
          usuario_id: string;
          mes: string;
          consumo: number;
          valor_m3: number;
          taxa_fixa?: number;
          valor_total: number;
          vencimento: string;
          status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          usuario_id?: string;
          mes?: string;
          consumo?: number;
          valor_m3?: number;
          taxa_fixa?: number;
          valor_total?: number;
          vencimento?: string;
          status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
          criado_em?: string;
          atualizado_em?: string;
        };
      };
      pagamentos: {
        Row: {
          id: string;
          cobranca_id: string;
          usuario_id: string;
          data_pagamento: string;
          valor: number;
          metodo: 'dinheiro' | 'pix' | 'transferencia' | 'cartao';
          criado_em: string;
        };
        Insert: {
          id?: string;
          cobranca_id: string;
          usuario_id: string;
          data_pagamento: string;
          valor: number;
          metodo?: 'dinheiro' | 'pix' | 'transferencia' | 'cartao';
          criado_em?: string;
        };
        Update: {
          id?: string;
          cobranca_id?: string;
          usuario_id?: string;
          data_pagamento?: string;
          valor?: number;
          metodo?: 'dinheiro' | 'pix' | 'transferencia' | 'cartao';
          criado_em?: string;
        };
      };
      perfis: {
        Row: {
          id: string;
          nome: string;
          perfil: 'admin' | 'leitor';
          ativo: boolean;
          criado_em: string;
        };
        Insert: {
          id: string;
          nome: string;
          perfil?: 'admin' | 'leitor';
          ativo?: boolean;
          criado_em?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          perfil?: 'admin' | 'leitor';
          ativo?: boolean;
          criado_em?: string;
        };
      };
      config: {
        Row: {
          id: string;
          empresa: string;
          valor_m3: number;
          taxa_fixa: number;
          multa: number;
          juros: number;
        };
        Insert: {
          id?: string;
          empresa?: string;
          valor_m3?: number;
          taxa_fixa?: number;
          multa?: number;
          juros?: number;
        };
        Update: {
          id?: string;
          empresa?: string;
          valor_m3?: number;
          taxa_fixa?: number;
          multa?: number;
          juros?: number;
        };
      };
    };
  };
}
