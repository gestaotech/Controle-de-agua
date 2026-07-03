-- 09: Adicionar campos PIX na tabela config
-- Tipo da chave PIX e chave de recebimento

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'config' AND column_name = 'pix_tipo') THEN
    ALTER TABLE config ADD COLUMN pix_tipo TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'config' AND column_name = 'pix_chave') THEN
    ALTER TABLE config ADD COLUMN pix_chave TEXT DEFAULT '';
  END IF;
END $$;
