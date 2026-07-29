-- =============================================
-- SCRIPT DE RESET COMPLETO DO BANCO DE DADOS
-- Executar no SQL Editor do Supabase
-- =============================================

DROP TABLE IF EXISTS leituras CASCADE;
DROP TABLE IF EXISTS cobrancas CASCADE;
DROP TABLE IF EXISTS unidades CASCADE;
DROP TABLE IF EXISTS perfis CASCADE;
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS bairros CASCADE;

DROP FUNCTION IF EXISTS get_user_role CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;

-- =============================================
-- 01 - BAIRROS
-- =============================================

CREATE TABLE bairros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bairros_ativo ON bairros(ativo);
CREATE TABLE unidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endereco TEXT NOT NULL,
  numero_hidrometro TEXT NOT NULL,
  bairro_id UUID NOT NULL REFERENCES bairros(id),
  leitura_inicial NUMERIC(10,2) DEFAULT 0,
  data_leitura_inicial DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  asaas_customer_id TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unidades_bairro_id ON unidades(bairro_id);
CREATE INDEX idx_unidades_status ON unidades(status);
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

CREATE INDEX idx_leituras_usuario_id ON leituras(usuario_id);
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
  asaas_payment_id TEXT,
  pix_payload TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unidade_id, mes)
);

CREATE INDEX idx_cobrancas_usuario_id ON cobrancas(usuario_id);
CREATE INDEX idx_cobrancas_status ON cobrancas(status);
CREATE TABLE config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa TEXT NOT NULL DEFAULT 'Saneamento Basico',
  cnpj TEXT DEFAULT '',
  contato TEXT DEFAULT '',
  valor_m3 NUMERIC(10,2) NOT NULL DEFAULT 8.50,
  taxa_fixa NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Garante que so exista uma unica linha de configuracao
CREATE UNIQUE INDEX idx_config_singleton ON config ((true));
CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'leitor')),
  ativo BOOLEAN DEFAULT true,
  bairro_id UUID REFERENCES bairros(id),
  contato TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perfis_perfil ON perfis(perfil);
CREATE INDEX idx_perfis_bairro_id ON perfis(bairro_id);
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT perfil FROM perfis WHERE id = auth.uid()),
    'leitor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE bairros ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('bairros', 'unidades', 'leituras', 'cobrancas', 'config', 'perfis')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- BAIRROS
CREATE POLICY "bairros_all_admin" ON bairros FOR ALL USING (is_admin());
CREATE POLICY "bairros_select_all" ON bairros FOR SELECT USING (true);

-- UNIDADES
CREATE POLICY "unidades_all_admin" ON unidades FOR ALL USING (is_admin());
CREATE POLICY "unidades_select_all" ON unidades FOR SELECT USING (true);

-- LEITURAS
CREATE POLICY "leituras_all_admin" ON leituras FOR ALL USING (is_admin());
CREATE POLICY "leituras_select_all" ON leituras FOR SELECT USING (true);
CREATE POLICY "leituras_insert_leitor" ON leituras FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "leituras_update_leitor" ON leituras FOR UPDATE USING (usuario_id = auth.uid());

-- COBRANCAS
CREATE POLICY "cobrancas_all_admin" ON cobrancas FOR ALL USING (is_admin());
CREATE POLICY "cobrancas_select_all" ON cobrancas FOR SELECT USING (true);
CREATE POLICY "cobrancas_insert_leitor" ON cobrancas FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- CONFIG
CREATE POLICY "config_all_admin" ON config FOR ALL USING (is_admin());
CREATE POLICY "config_select_all" ON config FOR SELECT USING (true);

-- PERFIS
CREATE POLICY "perfis_all_admin" ON perfis FOR ALL USING (is_admin());
CREATE POLICY "perfis_insert_own" ON perfis FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "perfis_select_own" ON perfis FOR SELECT USING (id = auth.uid());
CREATE POLICY "perfis_update_own" ON perfis FOR UPDATE USING (id = auth.uid()) WITH CHECK (perfil = (SELECT perfil FROM perfis WHERE id = auth.uid()));
INSERT INTO config (empresa, cnpj, contato, valor_m3, taxa_fixa)
VALUES ('Saneamento Basico', '', '', 8.50, 15.00)
ON CONFLICT DO NOTHING;
-- Habilita Realtime para todas as tabelas usadas nas subscriptions do frontend
alter publication supabase_realtime add table leituras;
alter publication supabase_realtime add table unidades;
alter publication supabase_realtime add table cobrancas;
alter publication supabase_realtime add table bairros;
alter publication supabase_realtime add table perfis;
