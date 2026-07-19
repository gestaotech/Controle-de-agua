CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'leitor')),
  ativo BOOLEAN DEFAULT true,
  bairro_id UUID REFERENCES bairros(id),
  contato TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
