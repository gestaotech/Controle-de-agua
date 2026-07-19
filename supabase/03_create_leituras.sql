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
