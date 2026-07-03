-- 01: Tabela de unidades (antes 'clientes')
-- Endereco, numero do hidrometro, bairro/condominio, leitura inicial

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clientes') THEN
    ALTER TABLE clientes RENAME TO unidades;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'bairro_condominio') THEN
      ALTER TABLE unidades ADD COLUMN bairro_condominio TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'leitura_inicial') THEN
      ALTER TABLE unidades ADD COLUMN leitura_inicial NUMERIC(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'data_leitura_inicial') THEN
      ALTER TABLE unidades ADD COLUMN data_leitura_inicial DATE DEFAULT CURRENT_DATE;
    END IF;

    UPDATE unidades SET endereco = nome WHERE endereco = '' OR endereco IS NULL;

    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'nome') THEN
      ALTER TABLE unidades DROP COLUMN nome;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'cpf') THEN
      ALTER TABLE unidades DROP COLUMN cpf;
    END IF;
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'unidades' AND column_name = 'telefone') THEN
      ALTER TABLE unidades DROP COLUMN telefone;
    END IF;
  ELSE
    CREATE TABLE unidades (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      endereco TEXT NOT NULL,
      numero_hidrometro TEXT NOT NULL,
      bairro_condominio TEXT NOT NULL,
      leitura_inicial NUMERIC(10,2) DEFAULT 0,
      data_leitura_inicial DATE DEFAULT CURRENT_DATE,
      status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
      criado_em TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;
