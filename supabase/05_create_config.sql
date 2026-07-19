CREATE TABLE config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa TEXT NOT NULL DEFAULT 'Saneamento Basico',
  cnpj TEXT DEFAULT '',
  contato TEXT DEFAULT '',
  valor_m3 NUMERIC(10,2) NOT NULL DEFAULT 8.50,
  taxa_fixa NUMERIC(10,2) NOT NULL DEFAULT 15.00,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
