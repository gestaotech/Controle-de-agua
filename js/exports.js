const ExportUtils = {
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            showToast('Nenhum dado para exportar!', 'error');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                let val = row[h];
                if (typeof val === 'string' && val.includes(',')) {
                    val = `"${val}"`;
                }
                return val;
            }).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showToast('Arquivo CSV exportado com sucesso!');
    },

    exportToPDF(title, headers, data, filename) {
        const printWindow = window.open('', '_blank');
        
        const tableHeaders = headers.map(h => `<th style="background: #1976D2; color: white; padding: 12px; text-align: left;">${h.label}</th>`).join('');
        const tableRows = data.map(row => 
            `<tr>${headers.map(h => `<td style="padding: 10px; border-bottom: 1px solid #eee;">${row[h.key] || ''}</td>`).join('')}</tr>`
        ).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; }
                    h1 { color: #1976D2; border-bottom: 2px solid #1976D2; padding-bottom: 10px; }
                    .header-info { color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { text-transform: uppercase; font-size: 12px; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
                    @media print {
                        body { padding: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="text-align: right; margin-bottom: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #1976D2; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Imprimir / Salvar PDF
                    </button>
                </div>
                <h1>${title}</h1>
                <div class="header-info">
                    <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                    <p>Total de registros: ${data.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>${tableHeaders}</tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
                <div class="footer">
                    <p>Sistema de Controle de Água - Relatório Automático</p>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();

        showToast('PDF gerado com sucesso! Clique em "Imprimir" para salvar.');
    },

    exportClientes() {
        const clientes = DB.get('clientes').map(c => ({
            Nome: c.nome,
            CPF: c.cpf,
            Endereco: c.endereco,
            Hidrometro: c.numero,
            Telefone: c.telefone || '',
            Status: c.status === 'ativo' ? 'Ativo' : 'Inativo'
        }));

        this.exportToCSV(clientes, 'clientes');
    },

    exportLeituras() {
        const leituras = DB.get('leituras').map(l => ({
            Cliente: l.clienteNome,
            Mes: formatMonthYear(l.mes),
            'Leitura Anterior': l.anterior.toFixed(2),
            'Leitura Atual': l.atual.toFixed(2),
            'Consumo (m3)': l.consumo.toFixed(2),
            'Leitor': l.usuarioNome || ''
        }));

        this.exportToCSV(leituras, 'leituras');
    },

    exportCobrancas() {
        const cobrancas = DB.get('cobrancas').map(c => ({
            Cliente: c.clienteNome,
            Mes: formatMonthYear(c.mes),
            Consumo: c.consumo.toFixed(2) + ' m3',
            'Valor Total': formatCurrency(c.valorTotal),
            Vencimento: formatDate(c.vencimento),
            Status: c.status === 'pendente' ? 'Pendente' : c.status === 'pago' ? 'Pago' : 'Cancelado',
            Codigo: c.codigo
        }));

        this.exportToCSV(cobrancas, 'cobrancas');
    },

    exportPagamentos() {
        const pagamentos = DB.get('pagamentos').map(p => ({
            Cliente: p.clienteNome,
            Mes: formatMonthYear(p.mes),
            'Valor Pago': formatCurrency(p.valorPago),
            Data: formatDate(p.dataPagamento),
            Metodo: p.metodo.charAt(0).toUpperCase() + p.metodo.slice(1)
        }));

        this.exportToCSV(pagamentos, 'pagamentos');
    },

    exportRelatorioFaturamento(mesInicio, mesFim) {
        const cobrancas = DB.get('cobrancas').filter(c => c.mes >= mesInicio && c.mes <= mesFim);
        const pagamentos = DB.get('pagamentos').filter(p => p.mes >= mesInicio && p.mes <= mesFim);

        const headers = [
            { key: 'Cliente', label: 'Cliente' },
            { key: 'Mes', label: 'Mês' },
            { key: 'Consumo', label: 'Consumo' },
            { key: 'ValorCobrado', label: 'Valor Cobrado' },
            { key: 'ValorPago', label: 'Valor Pago' },
            { key: 'Status', label: 'Status' }
        ];

        const data = cobrancas.map(c => {
            const pagamento = pagamentos.find(p => p.cobrancaId === c.id);
            return {
                Cliente: c.clienteNome,
                Mes: formatMonthYear(c.mes),
                Consumo: c.consumo.toFixed(2) + ' m³',
                ValorCobrado: formatCurrency(c.valorTotal),
                ValorPago: pagamento ? formatCurrency(pagamento.valorPago) : '-',
                Status: c.status === 'pago' ? 'Pago' : c.status === 'pendente' ? 'Pendente' : 'Cancelado'
            };
        });

        this.exportToPDF(
            `Relatório de Faturamento - ${formatMonthYear(mesInicio)} a ${formatMonthYear(mesFim)}`,
            headers,
            data,
            'faturamento'
        );
    },

    exportRelatorioInadimplencia() {
        const cobrancas = DB.get('cobrancas').filter(c => c.status === 'pendente');
        const config = Config.get();
        const hoje = new Date();

        const headers = [
            { key: 'Cliente', label: 'Cliente' },
            { key: 'Mes', label: 'Mês Referência' },
            { key: 'Valor', label: 'Valor Original' },
            { key: 'DiasAtraso', label: 'Dias em Atraso' },
            { key: 'Multa', label: 'Multa' },
            { key: 'Total', label: 'Total com Multa' }
        ];

        const data = cobrancas.map(c => {
            const vencimento = new Date(c.vencimento);
            const diasAtraso = Math.max(0, Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24)));
            const multa = c.valorTotal * (config.multa / 100);
            const juros = c.valorTotal * (config.juros / 100) * Math.floor(diasAtraso / 30);
            const total = c.valorTotal + multa + juros;

            return {
                Cliente: c.clienteNome,
                Mes: formatMonthYear(c.mes),
                Valor: formatCurrency(c.valorTotal),
                DiasAtraso: diasAtraso + ' dias',
                Multa: formatCurrency(multa + juros),
                Total: formatCurrency(total)
            };
        });

        this.exportToPDF(
            'Relatório de Inadimplência',
            headers,
            data,
            'inadimplencia'
        );
    }
};
