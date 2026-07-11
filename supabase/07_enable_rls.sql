-- 07: Habilitar RLS e criar politicas de acesso por role
-- Admin: acesso total
-- Leitor: leitura nas tabelas, inserção de leituras e consulta de cobrancas

-- Helper function para obter o role do usuario
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT perfil FROM perfis WHERE id = auth.uid()),
    'leitor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function para verificar se é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Habilitar RLS em todas as tabelas
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE leituras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Dropar politicas antigas para evitar duplicatas
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

-- ==================== UNIDADES ====================
-- Admin: tudo
CREATE POLICY "unidades_all_admin" ON unidades
  FOR ALL USING (is_admin());

-- Leitor: apenas SELECT
CREATE POLICY "unidades_select_leitor" ON unidades
  FOR SELECT USING (true);

-- ==================== LEITURAS ====================
-- Admin: tudo
CREATE POLICY "leituras_all_admin" ON leituras
  FOR ALL USING (is_admin());

-- Leitor: SELECT + INSERT (apenas suas proprias leituras)
CREATE POLICY "leituras_select_leitor" ON leituras
  FOR SELECT USING (true);

CREATE POLICY "leituras_insert_leitor" ON leituras
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- Leitor: UPDATE apenas suas leituras
CREATE POLICY "leituras_update_leitor" ON leituras
  FOR UPDATE USING (usuario_id = auth.uid());

-- ==================== COBRANCAS ====================
-- Admin: tudo
CREATE POLICY "cobrancas_all_admin" ON cobrancas
  FOR ALL USING (is_admin());

-- Leitor: SELECT + INSERT (apenas suas proprias cobrancas)
CREATE POLICY "cobrancas_select_leitor" ON cobrancas
  FOR SELECT USING (true);

CREATE POLICY "cobrancas_insert_leitor" ON cobrancas
  FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- Leitor: UPDATE (apenas status, via webhook - so admin)
-- Nao precisa de policy de update para leitor

-- ==================== PAGAMENTOS ====================
-- Admin: tudo
CREATE POLICY "pagamentos_all_admin" ON pagamentos
  FOR ALL USING (is_admin());

-- Leitor: apenas SELECT
CREATE POLICY "pagamentos_select_leitor" ON pagamentos
  FOR SELECT USING (true);

-- ==================== CONFIG ====================
-- Admin: tudo
CREATE POLICY "config_all_admin" ON config
  FOR ALL USING (is_admin());

-- Leitor: apenas SELECT
CREATE POLICY "config_select_leitor" ON config
  FOR SELECT USING (true);

-- ==================== PERFIS ====================
-- Admin: tudo
CREATE POLICY "perfis_all_admin" ON perfis
  FOR ALL USING (is_admin());

-- Leitor: apenas ver proprio perfil
CREATE POLICY "perfis_select_own" ON perfis
  FOR SELECT USING (id = auth.uid());

-- Leitor: update proprio perfil (nome, contato, senha)
CREATE POLICY "perfis_update_own" ON perfis
  FOR UPDATE USING (id = auth.uid());
