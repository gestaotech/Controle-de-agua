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
  asaas_payment_id TEXT,
  pix_payload TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(unidade_id, mes)
);
