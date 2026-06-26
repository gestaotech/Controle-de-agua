const Relatorios = {
    init() {
        document.getElementById('btn-rel-faturamento').addEventListener('click', () => this.faturamento());
        document.getElementById('btn-rel-inadimplencia').addEventListener('click', () => this.inadimplencia());
        document.getElementById('btn-rel-consumo').addEventListener('click', () => this.consumo());

        this.populateClientes();
    },

    populateClientes() {
        const clientes = Clientes.getAll();
        const select = document.getElementById('rel-cliente');
        select.innerHTML = '<option value="">Todos os clientes</option>' +
            clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    },

    faturamento() {
        const mesInicio = document.getElementById('rel-mes-inicio').value;
        const mesFim = document.getElementById('rel-mes-fim').value;

        if (!mesInicio || !mesFim) {
            showToast('Selecione o período!', 'error');
            return;
        }

        const pagamentos = Pagamentos.getAll().filter(p => p.mes >= mesInicio && p.mes <= mesFim);
        const totalRecebido = pagamentos.reduce((sum, p) => sum + p.valorPago, 0);

        const cobrancas = Cobranca.getAll().filter(c => c.mes >= mesInicio && c.mes <= mesFim);
        const totalCobrado = cobrancas.reduce((sum, c) => sum + c.valorTotal, 0);
        const totalPendente = cobrancas.filter(c => c.status === 'pendente').reduce((sum, c) => sum + c.valorTotal, 0);

        const html = `
            <div class="report-result">
                <p><strong>Período:</strong> ${formatMonthYear(mesInicio)} a ${formatMonthYear(mesFim)}</p>
                <p><strong>Total Cobrado:</strong> ${formatCurrency(totalCobrado)}</p>
                <p><strong>Total Recebido:</strong> ${formatCurrency(totalRecebido)}</p>
                <p><strong>Pendente:</strong> ${formatCurrency(totalPendente)}</p>
                <p><strong>Taxa de Recebimento:</strong> ${totalCobrado > 0 ? ((totalRecebido / totalCobrado) * 100).toFixed(1) : 0}%</p>
                <div class="total">Saldo: ${formatCurrency(totalRecebido)}</div>
            </div>
        `;
        document.getElementById('resultado-faturamento').innerHTML = html;
    },

    inadimplencia() {
        const pendentes = Cobranca.getPendentes();
        const config = Config.get();
        const hoje = new Date();

        const atrasados = pendentes.map(c => {
            const vencimento = new Date(c.vencimento);
            const diasAtraso = Math.max(0, Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24)));
            const multa = c.valorTotal * (config.multa / 100);
            const juros = c.valorTotal * (config.juros / 100) * Math.floor(diasAtraso / 30);
            const valorComMulta = c.valorTotal + multa + juros;

            return { ...c, diasAtraso, multa, juros, valorComMulta };
        }).sort((a, b) => b.diasAtraso - a.diasAtraso);

        const totalDevedor = atrasados.reduce((sum, c) => sum + c.valorComMulta, 0);

        const html = `
            <div class="report-result">
                <p><strong>Total de Inadimplentes:</strong> ${atrasados.length} cliente(s)</p>
                <p><strong>Total Devedor (com multa):</strong> ${formatCurrency(totalDevedor)}</p>
                <table style="width:100%; margin-top:15px;">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Mês</th>
                            <th>Dias</th>
                            <th>Valor</th>
                            <th>Multa</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${atrasados.length === 0
                            ? '<tr><td colspan="6" style="text-align:center">Nenhum inadimplente</td></tr>'
                            : atrasados.map(c => `
                                <tr>
                                    <td>${c.clienteNome}</td>
                                    <td>${formatMonthYear(c.mes)}</td>
                                    <td>${c.diasAtraso} dias</td>
                                    <td>${formatCurrency(c.valorTotal)}</td>
                                    <td>${formatCurrency(c.multa + c.juros)}</td>
                                    <td><strong>${formatCurrency(c.valorComMulta)}</strong></td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('resultado-inadimplencia').innerHTML = html;
    },

    consumo() {
        const clienteId = document.getElementById('rel-cliente').value;
        let leituras = Leituras.getAll();

        if (clienteId) {
            leituras = leituras.filter(l => l.clienteId === clienteId);
        }

        leituras.sort((a, b) => a.mes.localeCompare(b.mes));

        const totalConsumo = leituras.reduce((sum, l) => sum + l.consumo, 0);
        const mediaConsumo = leituras.length > 0 ? totalConsumo / leituras.length : 0;

        const html = `
            <div class="report-result">
                <p><strong>Total de Leituras:</strong> ${leituras.length}</p>
                <p><strong>Consumo Total:</strong> ${totalConsumo.toFixed(2)} m³</p>
                <p><strong>Média de Consumo:</strong> ${mediaConsumo.toFixed(2)} m³/mês</p>
                <table style="width:100%; margin-top:15px;">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Mês</th>
                            <th>Consumo (m³)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${leituras.length === 0
                            ? '<tr><td colspan="3" style="text-align:center">Nenhuma leitura encontrada</td></tr>'
                            : leituras.map(l => `
                                <tr>
                                    <td>${l.clienteNome}</td>
                                    <td>${formatMonthYear(l.mes)}</td>
                                    <td>${l.consumo.toFixed(2)} m³</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        document.getElementById('resultado-consumo').innerHTML = html;
    }
};
