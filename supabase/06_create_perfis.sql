-- 06: Tabela de perfis de usuarios
-- Vincula ao auth.users, define role (admin/leitor), bairro de atuacao

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
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'bairro_condominio') THEN
      ALTER TABLE perfis ADD COLUMN bairro_condominio TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'contato') THEN
      ALTER TABLE perfis ADD COLUMN contato TEXT DEFAULT '';
    END IF;
  END IF;
END $$;
