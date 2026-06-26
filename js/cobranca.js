const Cobranca = {
    init() {
        this.form = document.getElementById('form-cobranca');
        this.tableBody = document.querySelector('#tabela-cobrancas tbody');
        this.searchInput = document.getElementById('buscar-cobranca');
        this.selectCliente = document.getElementById('cobranca-cliente');
        this.btnCancelar = document.getElementById('btn-cancelar-cobranca');

        this.form.addEventListener('submit', (e) => this.save(e));
        this.btnCancelar.addEventListener('click', () => this.cancel());
        this.searchInput.addEventListener('input', () => this.render());

        this.selectCliente.addEventListener('change', () => this.loadLeitura());
        document.getElementById('cobranca-valor-m3').addEventListener('input', () => this.calcTotal());
        document.getElementById('cobranca-taxa-fix').addEventListener('input', () => this.calcTotal());

        this.populateClientes();
        this.loadConfig();
        this.render();
    },

    populateClientes() {
        const clientes = Clientes.getAtivos();
        this.selectCliente.innerHTML = '<option value="">Selecione um cliente</option>' +
            clientes.map(c => `<option value="${c.id}">${c.nome} (${c.numero})</option>`).join('');
    },

    loadConfig() {
        const config = Config.get();
        document.getElementById('cobranca-valor-m3').value = config.valorM3.toFixed(2);
        document.getElementById('cobranca-taxa-fix').value = config.taxaFixa.toFixed(2);
    },

    loadLeitura() {
        const clienteId = this.selectCliente.value;
        const mes = document.getElementById('cobranca-mes').value;

        if (!clienteId || !mes) {
            document.getElementById('cobranca-consumo').value = '';
            document.getElementById('cobranca-total').value = '';
            return;
        }

        const leitura = Leituras.getAll().find(l => l.clienteId === clienteId && l.mes === mes);
        if (leitura) {
            document.getElementById('cobranca-consumo').value = leitura.consumo.toFixed(2);
            this.calcTotal();
        } else {
            document.getElementById('cobranca-consumo').value = 'Leitura não encontrada';
            document.getElementById('cobranca-total').value = '';
        }
    },

    calcTotal() {
        const consumo = parseFloat(document.getElementById('cobranca-consumo').value) || 0;
        const valorM3 = parseFloat(document.getElementById('cobranca-valor-m3').value) || 0;
        const taxaFixa = parseFloat(document.getElementById('cobranca-taxa-fix').value) || 0;

        if (consumo > 0 && valorM3 > 0) {
            const total = (consumo * valorM3) + taxaFixa;
            document.getElementById('cobranca-total').value = formatCurrency(total);
        }
    },

    save(e) {
        e.preventDefault();
        const clienteId = this.selectCliente.value;
        const mes = document.getElementById('cobranca-mes').value;
        const cliente = DB.find('clientes', clienteId);

        const existente = this.getAll().find(c => c.clienteId === clienteId && c.mes === mes && c.status !== 'cancelado');
        if (existente) {
            showToast('Já existe boleto para este cliente/mês!', 'error');
            return;
        }

        const consumo = parseFloat(document.getElementById('cobranca-consumo').value);
        if (isNaN(consumo)) {
            showToast('Leitura não encontrada para este mês!', 'error');
            return;
        }

        const valorM3 = parseFloat(document.getElementById('cobranca-valor-m3').value);
        const taxaFixa = parseFloat(document.getElementById('cobranca-taxa-fix').value) || 0;
        const vencimento = document.getElementById('cobranca-vencimento').value;

        const valorTotal = (consumo * valorM3) + taxaFixa;

        const config = Config.get();
        const boleto = {
            clienteId,
            clienteNome: cliente.nome,
            clienteEndereco: cliente.endereco,
            clienteNumero: cliente.numero,
            mes,
            consumo,
            valorM3,
            taxaFixa,
            valorTotal,
            vencimento,
            empresa: config.empresa,
            status: 'pendente',
            codigo: this.generateCode()
        };

        DB.add('cobrancas', boleto);
        showToast('Boleto gerado com sucesso!');
        this.form.reset();
        this.loadConfig();
        document.getElementById('cobranca-consumo').value = '';
        document.getElementById('cobranca-total').value = '';
        this.render();
    },

    generateCode() {
        return 'AG' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
    },

    viewBoleto(id) {
        const boleto = DB.find('cobrancas', id);
        if (!boleto) return;

        document.getElementById('boleto-empresa').textContent = boleto.empresa;
        document.getElementById('boleto-cliente').textContent = boleto.clienteNome;
        document.getElementById('boleto-endereco').textContent = boleto.clienteEndereco;
        document.getElementById('boleto-hidrometro').textContent = boleto.clienteNumero;
        document.getElementById('boleto-referencia').textContent = formatMonthYear(boleto.mes);
        document.getElementById('boleto-consumo').textContent = boleto.consumo.toFixed(2) + ' m³';
        document.getElementById('boleto-vencimento').textContent = formatDate(boleto.vencimento);
        document.getElementById('boleto-valor').textContent = formatCurrency(boleto.valorTotal);

        document.getElementById('modal-boleto').classList.add('active');
    },

    delete(id) {
        if (!confirm('Cancelar este boleto?')) return;
        DB.update('cobrancas', id, { status: 'cancelado' });
        showToast('Boleto cancelado!');
        this.render();
    },

    cancel() {
        this.form.reset();
        this.loadConfig();
        document.getElementById('cobranca-consumo').value = '';
        document.getElementById('cobranca-total').value = '';
    },

    getAll() {
        return DB.get('cobrancas');
    },

    getPendentes() {
        return this.getAll().filter(c => c.status === 'pendente');
    },

    render() {
        const search = document.getElementById('buscar-cobranca').value.toLowerCase();
        const filtroInicio = document.getElementById('filtro-cobranca-inicio').value;
        const filtroFim = document.getElementById('filtro-cobranca-fim').value;
        const filtroStatus = document.getElementById('filtro-cobranca-status').value;

        let cobrancas = this.getAll();

        if (search) {
            cobrancas = cobrancas.filter(c => 
                c.clienteNome.toLowerCase().includes(search) || 
                c.codigo.toLowerCase().includes(search)
            );
        }

        if (filtroInicio) {
            cobrancas = cobrancas.filter(c => c.mes >= filtroInicio);
        }

        if (filtroFim) {
            cobrancas = cobrancas.filter(c => c.mes <= filtroFim);
        }

        if (filtroStatus) {
            cobrancas = cobrancas.filter(c => c.status === filtroStatus);
        }

        cobrancas.sort((a, b) => b.mes.localeCompare(a.mes));

        this.tableBody.innerHTML = cobrancas.length === 0
            ? '<tr><td colspan="7" style="text-align:center">Nenhum boleto encontrado</td></tr>'
            : cobrancas.map(c => `
                <tr>
                    <td>${c.clienteNome}</td>
                    <td>${formatMonthYear(c.mes)}</td>
                    <td>${c.consumo.toFixed(2)} m³</td>
                    <td>${formatCurrency(c.valorTotal)}</td>
                    <td>${formatDate(c.vencimento)}</td>
                    <td><span class="status-badge status-${c.status}">${c.status === 'pendente' ? 'Pendente' : c.status === 'pago' ? 'Pago' : 'Cancelado'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="Cobranca.viewBoleto('${c.id}')" title="Ver Boleto">📄</button>
                        ${c.status === 'pendente' ? `<button class="btn-icon" onclick="Cobranca.delete('${c.id}')" title="Cancelar">❌</button>` : ''}
                    </td>
                </tr>
            `).join('');
    }
};
