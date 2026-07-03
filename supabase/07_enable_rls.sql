-- 07: Habilitar RLS e criar politicas de acesso
-- Todas as tabelas permitem SELECT/INSERT/UPDATE/DELETE para usuarios autenticados

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

-- Unidades
CREATE POLICY "unidades_select" ON unidades FOR SELECT USING (true);
CREATE POLICY "unidades_insert" ON unidades FOR INSERT WITH CHECK (true);
CREATE POLICY "unidades_update" ON unidades FOR UPDATE USING (true);
CREATE POLICY "unidades_delete" ON unidades FOR DELETE USING (true);

-- Leituras
CREATE POLICY "leituras_select" ON leituras FOR SELECT USING (true);
CREATE POLICY "leituras_insert" ON leituras FOR INSERT WITH CHECK (true);
CREATE POLICY "leituras_update" ON leituras FOR UPDATE USING (true);
CREATE POLICY "leituras_delete" ON leituras FOR DELETE USING (true);

-- Cobrancas
CREATE POLICY "cobrancas_select" ON cobrancas FOR SELECT USING (true);
CREATE POLICY "cobrancas_insert" ON cobrancas FOR INSERT WITH CHECK (true);
CREATE POLICY "cobrancas_update" ON cobrancas FOR UPDATE USING (true);
CREATE POLICY "cobrancas_delete" ON cobrancas FOR DELETE USING (true);

-- Pagamentos
CREATE POLICY "pagamentos_select" ON pagamentos FOR SELECT USING (true);
CREATE POLICY "pagamentos_insert" ON pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "pagamentos_update" ON pagamentos FOR UPDATE USING (true);
CREATE POLICY "pagamentos_delete" ON pagamentos FOR DELETE USING (true);

-- Config
CREATE POLICY "config_select" ON config FOR SELECT USING (true);
CREATE POLICY "config_insert" ON config FOR INSERT WITH CHECK (true);
CREATE POLICY "config_update" ON config FOR UPDATE USING (true);

-- Perfis
CREATE POLICY "perfis_select" ON perfis FOR SELECT USING (true);
CREATE POLICY "perfis_insert" ON perfis FOR INSERT WITH CHECK (true);
CREATE POLICY "perfis_update" ON perfis FOR UPDATE USING (true);
