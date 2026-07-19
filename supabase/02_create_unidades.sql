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
