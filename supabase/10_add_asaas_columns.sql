-- 10: Adiciona colunas do Asaas na tabela cobrancas
-- asaas_payment_id: ID da cobrança no Asaas (para webhook)
-- pix_payload: código copia e cola do PIX

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cobrancas') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cobrancas' AND column_name = 'asaas_payment_id') THEN
      ALTER TABLE cobrancas ADD COLUMN asaas_payment_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cobrancas' AND column_name = 'pix_payload') THEN
      ALTER TABLE cobrancas ADD COLUMN pix_payload TEXT;
    END IF;
  END IF;
END $$;
