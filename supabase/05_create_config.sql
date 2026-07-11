-- 05: Tabela de configuracao do sistema
-- Empresa, CNPJ, contato, valores de tarifa, PIX

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'config') THEN
    CREATE TABLE config (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      empresa TEXT NOT NULL DEFAULT 'Saneamento Basico',
      cnpj TEXT DEFAULT '',
      contato TEXT DEFAULT '',
      valor_m3 NUMERIC(10,2) NOT NULL DEFAULT 8.50,
      taxa_fixa NUMERIC(10,2) NOT NULL DEFAULT 15.00,
      multa NUMERIC(10,2) NOT NULL DEFAULT 2.00,
      juros NUMERIC(10,2) NOT NULL DEFAULT 1.00,
      pix_tipo TEXT DEFAULT '',
      pix_chave TEXT DEFAULT '',
      criado_em TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'config' AND column_name = 'cnpj') THEN
      ALTER TABLE config ADD COLUMN cnpj TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'config' AND column_name = 'contato') THEN
      ALTER TABLE config ADD COLUMN contato TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'config' AND column_name = 'pix_tipo') THEN
      ALTER TABLE config ADD COLUMN pix_tipo TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'config' AND column_name = 'pix_chave') THEN
      ALTER TABLE config ADD COLUMN pix_chave TEXT DEFAULT '';
    END IF;
  END IF;
END $$;
