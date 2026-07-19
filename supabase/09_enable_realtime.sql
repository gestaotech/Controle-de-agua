-- Enable Realtime for tables used by leitores
alter publication supabase_realtime add table leituras;
alter publication supabase_realtime add table unidades;
alter publication supabase_realtime add table cobrancas;
