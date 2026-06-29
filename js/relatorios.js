const Relatorios = {
    async gerarFaturamento() {
        const mesInicio = document.getElementById('rel-mes-inicio').value;
        const mesFim = document.getElementById('rel-mes-fim').value;
        const resultado = document.getElementById('resultado-faturamento');

        if (!mesInicio || !mesFim) {
            showToast('Selecione o período!', 'error');
            return;
        }

        const db = getSupabase();
        const { data } = await db
            .from('cobrancas')
            .select('*, clientes(nome)')
            .gte('mes', mesInicio)
            .lte('mes', mesFim)
            .order('mes');

        if (!data || data.length === 0) {
            resultado.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Nenhum dado encontrado</p>';
            return;
        }

        let total = 0;
        let pagos = 0;
        let pendentes = 0;

        const rows = data.map(c => {
            total += parseFloat(c.valor_total);
            if (c.status === 'pago') pagos++;
            else pendentes++;

            return `
                <tr>
                    <td>${c.clientes?.nome || 'N/A'}</td>
                    <td>${formatMonthYear(c.mes)}</td>
                    <td>${formatCurrency(c.valor_total)}</td>
                    <td><span class="badge badge-${c.status === 'pago' ? 'success' : 'warning'}">${c.status}</span></td>
                </tr>
            `;
        }).join('');

        resultado.innerHTML = `
            <div class="report-summary">
                <div class="summary-item">
                    <span class="label">Total Faturado:</span>
                    <span class="value">${formatCurrency(total)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Pagos:</span>
                    <span class="value">${pagos}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Pendentes:</span>
                    <span class="value">${pendentes}</span>
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Mês</th>
                        <th>Valor</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    async gerarInadimplencia() {
        const resultado = document.getElementById('resultado-inadimplencia');
        const db = getSupabase();

        const { data } = await db
            .from('cobrancas')
            .select('*, clientes(nome, telefone, endereco)')
            .in('status', ['pendente', 'atrasado'])
            .order('vencimento');

        if (!data || data.length === 0) {
            resultado.innerHTML = '<p style="text-align:center; color: var(--text-muted);">Nenhuma inadimplência encontrada</p>';
            return;
        }

        let total = 0;
        const rows = data.map(c => {
            total += parseFloat(c.valor_total);
            const venc = new Date(c.vencimento);
            const hoje = new Date();
            const dias = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));

            return `
                <tr>
                    <td>${c.clientes?.nome || 'N/A'}</td>
                    <td>${c.clientes?.telefone || '-'}</td>
                    <td>${formatMonthYear(c.mes)}</td>
                    <td>${formatCurrency(c.valor_total)}</td>
                    <td>${formatDate(c.vencimento)}</td>
                    <td><span class="badge badge-danger">${dias > 0 ? dias + ' dias' : 'A vencer'}</span></td>
                </tr>
            `;
        }).join('');

        resultado.innerHTML = `
            <div class="report-summary">
                <div class="summary-item">
                    <span class="label">Total Inadimplente:</span>
                    <span class="value">${formatCurrency(total)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Clientes:</span>
                    <span class="value">${data.length}</span>
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Telefone</th>
                        <th>Mês</th>
                        <th>Valor</th>
                        <th>Vencimento</th>
                        <th>Situação</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    async exportCSV(tipo) {
        let data = [];
        let filename = '';

        const db = getSupabase();

        switch (tipo) {
            case 'clientes':
                const { data: clientes } = await db.from('clientes').select('*').order('nome');
                data = clientes || [];
                filename = 'clientes.csv';
                break;
            case 'leituras':
                const { data: leituras } = await db.from('leituras').select('*, clientes(nome)').order('mes', { ascending: false });
                data = leituras || [];
                filename = 'leituras.csv';
                break;
            case 'cobrancas':
                const { data: cobrancas } = await db.from('cobrancas').select('*, clientes(nome)').order('criado_em', { ascending: false });
                data = cobrancas || [];
                filename = 'cobrancas.csv';
                break;
            case 'pagamentos':
                const { data: pagamentos } = await db.from('pagamentos').select('*, cobrancas(clientes(nome), mes)').order('data_pagamento', { ascending: false });
                data = pagamentos || [];
                filename = 'pagamentos.csv';
                break;
        }

        if (data.length === 0) {
            showToast('Nenhum dado para exportar!', 'error');
            return;
        }

        const csvContent = this.arrayToCSV(data);
        this.downloadCSV(csvContent, filename);
        showToast('Exportação concluída!');
    },

    arrayToCSV(data) {
        if (!data.length) return '';
        const headers = Object.keys(data[0]);
        const rows = data.map(row =>
            headers.map(h => {
                let val = row[h];
                if (typeof val === 'object' && val !== null) {
                    val = JSON.stringify(val);
                }
                if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            }).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
    },

    downloadCSV(content, filename) {
        const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }
};
