-- =====================================================
-- SCHEMA: Controle de Agua
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Tabela de unidades (antes 'clientes')
CREATE TABLE IF NOT EXISTS unidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endereco TEXT NOT NULL,
  numero_hidrometro TEXT NOT NULL,
  bairro_condominio TEXT NOT NULL,
  leitura_inicial NUMERIC(10,2) DEFAULT 0,
  data_leitura_inicial DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de leituras
CREATE TABLE IF NOT EXISTS leituras (
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

-- 3. Tabela de cobrancas
CREATE TABLE IF NOT EXISTS cobrancas (
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

-- 4. Tabela de pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cobranca_id UUID NOT NULL REFERENCES cobrancas(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  metodo TEXT DEFAULT 'dinheiro',
  usuario_id UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de configuracao do sistema
CREATE TABLE IF NOT EXISTS config (
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

-- 6. Tabela de perfis de usuarios
CREATE TABLE IF NOT EXISTS perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'leitor')),
  ativo BOOLEAN DEFAULT true,
  bairro_condominio TEXT DEFAULT '',
  contato TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Habilitar RLS
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- 8. Politicas RLS
-- Leitores veem apenas seus dados, admins veem tudo
CREATE POLICY "leituras_select" ON leituras FOR SELECT USING (true);
CREATE POLICY "leituras_insert" ON leituras FOR INSERT WITH CHECK (true);
CREATE POLICY "leituras_update" ON leituras FOR UPDATE USING (true);
CREATE POLICY "leituras_delete" ON leituras FOR DELETE USING (true);

CREATE POLICY "unidades_select" ON unidades FOR SELECT USING (true);
CREATE POLICY "unidades_insert" ON unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "unidades_update" ON unidades FOR UPDATE USING (true);
CREATE POLICY "unidades_delete" ON unidades FOR DELETE USING (true);

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

-- 9. Inserir config padrao
INSERT INTO config (empresa, cnpj, contato, valor_m3, taxa_fixa, multa, juros)
VALUES ('Saneamento Basico', '', '', 8.50, 15.00, 2.00, 1.00)
ON CONFLICT DO NOTHING;
