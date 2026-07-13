CREATE TABLE pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cobranca_id UUID NOT NULL REFERENCES cobrancas(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  metodo TEXT DEFAULT 'dinheiro',
  usuario_id UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
