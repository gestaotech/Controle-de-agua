-- Tabela de bairros/condominios
-- Cadastro controlado pelo admin

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bairros') THEN
    CREATE TABLE bairros (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE,
      ativo BOOLEAN DEFAULT true,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- RLS
ALTER TABLE bairros ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bairros'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

CREATE POLICY "bairros_all_admin" ON bairros
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin')
  );

CREATE POLICY "bairros_select_all" ON bairros
  FOR SELECT USING (true);
