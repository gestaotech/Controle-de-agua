const Pagamentos = {
    init() {
        this.form = document.getElementById('form-pagamento');
        this.tableBody = document.querySelector('#tabela-pagamentos tbody');
        this.selectCobranca = document.getElementById('pagamento-cobranca');
        this.btnCancelar = document.getElementById('btn-cancelar-pagamento');

        this.form.addEventListener('submit', (e) => this.save(e));
        this.btnCancelar.addEventListener('click', () => this.cancel());

        this.selectCobranca.addEventListener('change', () => this.loadValor());
        document.getElementById('pagamento-data').valueAsDate = new Date();

        this.populateCobrancas();
        this.render();
    },

    populateCobrancas() {
        const pendentes = Cobranca.getPendentes();
        this.selectCobranca.innerHTML = '<option value="">Selecione um boleto pendente</option>' +
            pendentes.map(c => `<option value="${c.id}">${c.clienteNome} - ${formatMonthYear(c.mes)} - ${formatCurrency(c.valorTotal)}</option>`).join('');
    },

    loadValor() {
        const id = this.selectCobranca.value;
        if (!id) {
            document.getElementById('pagamento-valor').value = '';
            return;
        }
        const cobranca = DB.find('cobrancas', id);
        if (cobranca) {
            document.getElementById('pagamento-valor').value = cobranca.valorTotal.toFixed(2);
        }
    },

    save(e) {
        e.preventDefault();
        const cobrancaId = this.selectCobranca.value;
        const cobranca = DB.find('cobrancas', cobrancaId);

        if (!cobranca) {
            showToast('Boleto não encontrado!', 'error');
            return;
        }

        const pagamento = {
            cobrancaId,
            clienteId: cobranca.clienteId,
            clienteNome: cobranca.clienteNome,
            mes: cobranca.mes,
            valorPago: parseFloat(document.getElementById('pagamento-valor').value),
            valorOriginal: cobranca.valorTotal,
            dataPagamento: document.getElementById('pagamento-data').value,
            metodo: document.getElementById('pagamento-metodo').value
        };

        DB.add('pagamentos', pagamento);
        DB.update('cobrancas', cobrancaId, { status: 'pago' });

        showToast('Pagamento registrado com sucesso!');
        this.form.reset();
        document.getElementById('pagamento-data').valueAsDate = new Date();
        this.populateCobrancas();
        this.render();
    },

    cancel() {
        this.form.reset();
        document.getElementById('pagamento-data').valueAsDate = new Date();
    },

    getAll() {
        return DB.get('pagamentos');
    },

    getByCliente(clienteId) {
        return this.getAll().filter(p => p.clienteId === clienteId);
    },

    getReceitaMes(ano, mes) {
        const prefix = `${ano}-${mes.toString().padStart(2, '0')}`;
        return this.getAll()
            .filter(p => p.mes.startsWith(prefix))
            .reduce((sum, p) => sum + p.valorPago, 0);
    },

    render() {
        const filtroInicio = document.getElementById('filtro-pagamento-inicio').value;
        const filtroFim = document.getElementById('filtro-pagamento-fim').value;
        const filtroMetodo = document.getElementById('filtro-pagamento-metodo').value;

        let pagamentos = this.getAll();

        if (filtroInicio) {
            pagamentos = pagamentos.filter(p => p.mes >= filtroInicio);
        }

        if (filtroFim) {
            pagamentos = pagamentos.filter(p => p.mes <= filtroFim);
        }

        if (filtroMetodo) {
            pagamentos = pagamentos.filter(p => p.metodo === filtroMetodo);
        }

        pagamentos.sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento));

        const metodoLabels = { dinheiro: 'Dinheiro', pix: 'PIX', transferencia: 'Transferência', cartao: 'Cartão' };

        this.tableBody.innerHTML = pagamentos.length === 0
            ? '<tr><td colspan="5" style="text-align:center">Nenhum pagamento registrado</td></tr>'
            : pagamentos.map(p => `
                <tr>
                    <td>${p.clienteNome}</td>
                    <td>${formatMonthYear(p.mes)}</td>
                    <td>${formatCurrency(p.valorPago)}</td>
                    <td>${formatDate(p.dataPagamento)}</td>
                    <td>${metodoLabels[p.metodo] || p.metodo}</td>
                </tr>
            `).join('');
    }
};
