-- 03: Tabela de cobrancas
-- Vincula leitura a um valor, gera boleto/fatura

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cobrancas') THEN
    CREATE TABLE cobrancas (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      unidade_id UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      consumo NUMERIC(10,2) NOT NULL,
      valor_m3 NUMERIC(10,2) NOT NULL DEFAULT 8.50,
      taxa_fixa NUMERIC(10,2) NOT NULL DEFAULT 15.00,
      valor_total NUMERIC(10,2) NOT NULL,
      vencimento DATE NOT NULL,
      status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'atrasado')),
      usuario_id UUID REFERENCES auth.users(id),
      criado_em TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(unidade_id, mes)
    );
  ELSE
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'cobrancas' AND column_name = 'cliente_id') THEN
      ALTER TABLE cobrancas RENAME COLUMN cliente_id TO unidade_id;
    END IF;
    ALTER TABLE cobrancas DROP CONSTRAINT IF EXISTS cobrancas_unidade_id_mes_key;
    ALTER TABLE cobrancas ADD CONSTRAINT cobrancas_unidade_id_mes_key UNIQUE (unidade_id, mes);
  END IF;
END $$;
