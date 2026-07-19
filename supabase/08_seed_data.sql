INSERT INTO config (empresa, cnpj, contato, valor_m3, taxa_fixa)
VALUES ('Saneamento Basico', '', '', 8.50, 15.00)
ON CONFLICT DO NOTHING;
