-- =====================================================
-- MIGRACAO: Controle de Agua
-- Execute este script NO SQL EDITOR do Supabase
-- Funciona tanto para banco novo quanto para migracao
-- =====================================================

-- =====================================================
-- PARTE 1: TABELA UNIDADES (antes 'clientes')
-- =====================================================
DO $$
BEGIN
  -- Se existe tabela 'clientes', migrar para 'unidades'
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clientes') THEN
    -- Renomear para unidades
    ALTER TABLE clientes RENAME TO unidades;

    -- Adicionar colunas novas se nao existirem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'bairro_condominio') THEN
      ALTER TABLE unidades ADD COLUMN bairro_condominio TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'leitura_inicial') THEN
      ALTER TABLE unidades ADD COLUMN leitura_inicial NUMERIC(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'data_leitura_inicial') THEN
      ALTER TABLE unidades ADD COLUMN data_leitura_inicial DATE DEFAULT CURRENT_DATE;
    END IF;

    -- Migrar dados de 'nome' para 'endereco' se endereco estiver vazio
    UPDATE unidades SET endereco = nome WHERE endereco = '' OR endereco IS NULL;

    -- Remover coluna 'nome' se existir (mantenha endereco como principal)
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'nome') THEN
      ALTER TABLE unidades DROP COLUMN nome;
    END IF;
    -- Remover coluna 'cpf' se existir
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'cpf') THEN
      ALTER TABLE unidades DROP COLUMN cpf;
    END IF;
    -- Remover coluna 'telefone' se existir
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'telefone') THEN
      ALTER TABLE unidades DROP COLUMN telefone;
    END IF;
  ELSE
    -- Tabela nao existe, criar do zero
    CREATE TABLE unidades (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      endereco TEXT NOT NULL,
      numero_hidrometro TEXT NOT NULL,
      bairro_condominio TEXT NOT NULL,
      leitura_inicial NUMERIC(10,2) DEFAULT 0,
      data_leitura_inicial DATE DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
      criado_em TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- =====================================================
-- PARTE 2: TABELA LEITURAS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leituras') THEN
    CREATE TABLE leituras (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
      atual NUMERIC(10,2) NOT NULL DEFAULT 0,
      consumo NUMERIC(10,2) GENERATED ALWAYS AS (atual - anterior) STORED,
      usuario_id UUID REFERENCES auth.users(id),
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(unidade_id, mes)
    );
  ELSE
    -- Migrar 'cliente_id' para 'unidade_id' se necessario
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leituras' AND column_name = 'cliente_id') THEN
      ALTER TABLE leituras RENAME COLUMN cliente_id TO unidade_id;
    END IF;
    -- Garantir constraint UNIQUE
    ALTER TABLE leituras DROP CONSTRAINT IF EXISTS leituras_unidade_id_mes_key;
    ALTER TABLE leituras ADD CONSTRAINT leituras_unidade_id_mes_key UNIQUE (unidade_id, mes);
  END IF;
END $$;

-- =====================================================
-- PARTE 3: TABELA COBRANCAS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cobrancas') THEN
    CREATE TABLE cobrancas (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      consumo NUMERIC(10,2) NOT NULL,
      valor_m3 NUMERIC(10,2) NOT NULL DEFAULT 8.50,
      taxa_fixa NUMERIC(10,2) NOT NULL DEFAULT 15.00,
      valor_total NUMERIC(10,2) NOT NULL,
      vencimento DATE NOT NULL,
      status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
      usuario_id UUID REFERENCES auth.users(id),
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(unidade_id, mes)
    );
  ELSE
    -- Migrar 'cliente_id' para 'unidade_id' se necessario
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cobrancas' AND column_name = 'cliente_id') THEN
      ALTER TABLE cobrancas RENAME COLUMN cliente_id TO unidade_id;
    END IF;
    -- Garantir constraint UNIQUE
    ALTER TABLE cobrancas DROP CONSTRAINT IF EXISTS cobrancas_unidade_id_mes_key;
    ALTER TABLE cobrancas ADD CONSTRAINT cobrancas_unidade_id_mes_key UNIQUE (unidade_id, mes);
  END IF;
END $$;

-- =====================================================
-- PARTE 4: TABELA PAGAMENTOS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pagamentos') THEN
    CREATE TABLE pagamentos (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      cobranca_id UUID NOT NULL REFERENCES cobrancas(id) ON DELETE CASCADE,
      data_pagamento DATE NOT NULL,
      valor NUMERIC(10,2) NOT NULL,
      metodo TEXT DEFAULT 'dinheiro',
      usuario_id UUID REFERENCES auth.users(id),
      criado_em TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- =====================================================
-- PARTE 5: TABELA CONFIG
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'config') THEN
    CREATE TABLE config (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      empresa TEXT NOT NULL DEFAULT 'Saneamento Basico',
      cnpj TEXT DEFAULT '',
      contato TEXT DEFAULT '',
      valor_m3 NUMERIC(10,2) NOT NULL DEFAULT 8.50,
      taxa_fixa NUMERIC(10,2) NOT NULL DEFAULT 15.00,
      multa NUMERIC(10,2) NOT NULL DEFAULT 2.00,
      juros NUMERIC(10,2) NOT NULL DEFAULT 1.00,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Adicionar colunas novas se nao existirem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'config' AND column_name = 'cnpj') THEN
      ALTER TABLE config ADD COLUMN cnpj TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'config' AND column_name = 'contato') THEN
      ALTER TABLE config ADD COLUMN contato TEXT DEFAULT '';
    END IF;
  END IF;
END $$;

-- =====================================================
-- PARTE 6: TABELA PERFIS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'perfis') THEN
    CREATE TABLE perfis (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'leitor')),
      ativo BOOLEAN DEFAULT true,
      bairro_condominio TEXT DEFAULT '',
      contato TEXT DEFAULT '',
      criado_em TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Adicionar colunas novas se nao existirem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'bairro_condominio') THEN
      ALTER TABLE perfis ADD COLUMN bairro_condominio TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'contato') THEN
      ALTER TABLE perfis ADD COLUMN contato TEXT DEFAULT '';
    END IF;
  END IF;
END $$;

-- =====================================================
-- PARTE 7: HABILITAR RLS E POLITICAS
-- =====================================================
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Politicas RLS (dropar antigas primeiro para evitar duplicatas)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('unidades', 'leituras', 'cobrancas', 'pagamentos', 'config', 'perfis')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Criar politicas permissivas (acesso via middleware + client-side)
CREATE POLICY "unidades_select" ON unidades FOR SELECT USING (true);
CREATE POLICY "unidades_insert" ON unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "unidades_update" ON unidades FOR UPDATE USING (true);
CREATE POLICY "unidades_delete" ON unidades FOR DELETE USING (true);

CREATE POLICY "leituras_select" ON leituras FOR SELECT USING (true);
CREATE POLICY "leituras_insert" ON leituras FOR INSERT WITH CHECK (true);
CREATE POLICY "leituras_update" ON leituras FOR UPDATE USING (true);
CREATE POLICY "leituras_delete" ON leituras FOR DELETE USING (true);

CREATE POLICY "cobrancas_select" ON cobrancas FOR SELECT USING (true);
CREATE POLICY "cobrancas_insert" ON cobrancas FOR INSERT WITH CHECK (true);
CREATE POLICY "cobrancas_update" ON cobrancas FOR UPDATE USING (true);
CREATE POLICY "cobrancas_delete" ON cobrancas FOR DELETE USING (true);

CREATE POLICY "pagamentos_select" ON pagamentos FOR SELECT USING (true);
CREATE POLICY "pagamentos_insert" ON pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "pagamentos_update" ON pagamentos FOR UPDATE USING (true);
CREATE POLICY "pagamentos_delete" ON pagamentos FOR DELETE USING (true);

CREATE POLICY "config_select" ON config FOR SELECT USING (true);
CREATE POLICY "config_insert" ON config FOR INSERT WITH CHECK (true);
CREATE POLICY "config_update" ON config FOR UPDATE USING (true);

CREATE POLICY "perfis_select" ON perfis FOR SELECT USING (true);
CREATE POLICY "perfis_insert" ON perfis FOR INSERT WITH CHECK (true);
CREATE POLICY "perfis_update" ON perfis FOR UPDATE USING (true);

-- =====================================================
-- PARTE 8: DADOS PADRAO
-- =====================================================
INSERT INTO config (empresa, cnpj, contato, valor_m3, taxa_fixa, multa, juros)
VALUES ('Saneamento Basico', '', '', 8.50, 15.00, 2.00, 1.00)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FIM DA MIGRACAO
-- =====================================================
