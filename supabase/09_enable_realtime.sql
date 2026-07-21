-- Habilita Realtime para todas as tabelas usadas nas subscriptions do frontend
alter publication supabase_realtime add table leituras;
alter publication supabase_realtime add table unidades;
alter publication supabase_realtime add table cobrancas;
alter publication supabase_realtime add table bairros;
alter publication supabase_realtime add table perfis;
