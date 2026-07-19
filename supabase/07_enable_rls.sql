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
CREATE POLICY "unidades_select_leitor" ON unidades FOR SELECT USING (true);

-- LEITURAS
CREATE POLICY "leituras_all_admin" ON leituras FOR ALL USING (is_admin());
CREATE POLICY "leituras_select_leitor" ON leituras FOR SELECT USING (true);
CREATE POLICY "leituras_insert_leitor" ON leituras FOR INSERT WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "leituras_update_leitor" ON leituras FOR UPDATE USING (usuario_id = auth.uid());

-- COBRANCAS
CREATE POLICY "cobrancas_all_admin" ON cobrancas FOR ALL USING (is_admin());
CREATE POLICY "cobrancas_select_leitor" ON cobrancas FOR SELECT USING (true);
CREATE POLICY "cobrancas_insert_leitor" ON cobrancas FOR INSERT WITH CHECK (usuario_id = auth.uid());

-- CONFIG
CREATE POLICY "config_all_admin" ON config FOR ALL USING (is_admin());
CREATE POLICY "config_select_leitor" ON config FOR SELECT USING (true);

-- PERFIS
CREATE POLICY "perfis_all_admin" ON perfis FOR ALL USING (is_admin());
CREATE POLICY "perfis_select_own" ON perfis FOR SELECT USING (id = auth.uid());
CREATE POLICY "perfis_update_own" ON perfis FOR UPDATE USING (id = auth.uid()) WITH CHECK (perfil = (SELECT perfil FROM perfis WHERE id = auth.uid()));
