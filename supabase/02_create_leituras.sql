-- 02: Tabela de leituras
-- Leitura anterior, atual, consumo (calculado automaticamente)

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
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'leituras' AND column_name = 'cliente_id') THEN
      ALTER TABLE leituras RENAME COLUMN cliente_id TO unidade_id;
    END IF;
    ALTER TABLE leituras DROP CONSTRAINT IF EXISTS leituras_unidade_id_mes_key;
    ALTER TABLE leituras ADD CONSTRAINT leituras_unidade_id_mes_key UNIQUE (unidade_id, mes);
  END IF;
END $$;
