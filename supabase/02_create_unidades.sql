CREATE TABLE unidades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo               TEXT,
  endereco             TEXT NOT NULL,
  numero               TEXT,
  complemento          TEXT,
  bloco                TEXT,
  unidade_numero       TEXT,
  numero_hidrometro    TEXT NOT NULL,
  bairro_id            UUID NOT NULL REFERENCES bairros(id),
  leitura_inicial      NUMERIC(10,2) DEFAULT 0,
  data_leitura_inicial DATE DEFAULT CURRENT_DATE,
  status               TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  responsavel_nome     TEXT,
  responsavel_telefone TEXT,
  responsavel_email    TEXT,
  data_instalacao      DATE,
  observacao           TEXT,
  asaas_customer_id    TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unidades_bairro_id ON unidades(bairro_id);
CREATE INDEX idx_unidades_status ON unidades(status);
