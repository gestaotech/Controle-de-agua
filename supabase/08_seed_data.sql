INSERT INTO config (empresa, cnpj, contato, valor_m3, taxa_fixa, multa, juros)
VALUES ('Saneamento Basico', '', '', 8.50, 15.00, 2.00, 1.00)
ON CONFLICT DO NOTHING;
