const Leituras = {
    init() {
        this.form = document.getElementById('form-leitura');
        this.tableBody = document.querySelector('#tabela-leituras tbody');
        this.selectCliente = document.getElementById('leitura-cliente');
        this.inputAnterior = document.getElementById('leitura-anterior');
        this.inputAtual = document.getElementById('leitura-atual');
        this.inputConsumo = document.getElementById('leitura-consumo');
        this.btnCancelar = document.getElementById('btn-cancelar-leitura');

        this.form.addEventListener('submit', (e) => this.save(e));
        this.btnCancelar.addEventListener('click', () => this.cancel());
        this.selectCliente.addEventListener('change', () => this.loadUltimaLeitura());
        this.inputAnterior.addEventListener('input', () => this.calcConsumo());
        this.inputAtual.addEventListener('input', () => this.calcConsumo());

        this.populateClientes();
        this.render();
    },

    populateClientes() {
        const clientes = Clientes.getAtivos();
        this.selectCliente.innerHTML = '<option value="">Selecione um cliente</option>' +
            clientes.map(c => `<option value="${c.id}">${c.nome} (${c.numero})</option>`).join('');
    },

    loadUltimaLeitura() {
        const clienteId = this.selectCliente.value;
        if (!clienteId) {
            this.inputAnterior.value = '';
            this.inputConsumo.value = '';
            return;
        }

        const leituras = this.getAll()
            .filter(l => l.clienteId === clienteId)
            .sort((a, b) => b.mes.localeCompare(a.mes));

        if (leituras.length > 0) {
            const ultimaLeitura = leituras[0];
            this.inputAnterior.value = ultimaLeitura.atual;
            showToast(`Última leitura (${formatMonthYear(ultimaLeitura.mes)}): ${ultimaLeitura.atual.toFixed(2)} m³`);
        } else {
            this.inputAnterior.value = '0';
            showToast('Primeira leitura deste cliente', 'warning');
        }

        this.calcConsumo();
    },

    calcConsumo() {
        const anterior = parseFloat(this.inputAnterior.value) || 0;
        const atual = parseFloat(this.inputAtual.value) || 0;
        const consumo = atual - anterior;
        this.inputConsumo.value = consumo >= 0 ? consumo.toFixed(2) : '';
    },

    save(e) {
        e.preventDefault();
        const clienteId = this.selectCliente.value;
        const mes = document.getElementById('leitura-mes').value;
        const cliente = DB.find('clientes', clienteId);
        const user = Auth.getUsuario();

        const existente = this.getAll().find(l => l.clienteId === clienteId && l.mes === mes);
        if (existente && !document.getElementById('leitura-id')?.value) {
            showToast('Já existe leitura para este cliente neste mês!', 'error');
            return;
        }

        const anterior = parseFloat(this.inputAnterior.value) || 0;
        const atual = parseFloat(this.inputAtual.value) || 0;

        if (atual < anterior) {
            showToast('Leitura atual não pode ser menor que a anterior!', 'error');
            return;
        }

        const leitura = {
            clienteId,
            clienteNome: cliente.nome,
            mes,
            anterior,
            atual,
            consumo: atual - anterior,
            usuarioId: user.id,
            usuarioNome: user.nome
        };

        const idField = document.getElementById('leitura-id');
        if (idField && idField.value) {
            DB.update('leituras', idField.value, leitura);
            showToast('Leitura atualizada!');
        } else {
            DB.add('leituras', leitura);
            showToast('Leitura registrada com sucesso!');
        }

        this.form.reset();
        if (idField) idField.value = '';
        this.inputConsumo.value = '';
        this.render();
    },

    edit(id) {
        const leitura = DB.find('leituras', id);
        if (!leitura) return;

        const user = Auth.getUsuario();
        if (user.perfil === 'leitor' && leitura.usuarioId !== user.id) {
            showToast('Você só pode editar suas próprias leituras!', 'error');
            return;
        }

        let idField = document.getElementById('leitura-id');
        if (!idField) {
            idField = document.createElement('input');
            idField.type = 'hidden';
            idField.id = 'leitura-id';
            this.form.appendChild(idField);
        }
        idField.value = leitura.id;

        this.selectCliente.value = leitura.clienteId;
        document.getElementById('leitura-mes').value = leitura.mes;
        this.inputAnterior.value = leitura.anterior;
        this.inputAtual.value = leitura.atual;
        this.inputConsumo.value = leitura.consumo;

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    delete(id) {
        const leitura = DB.find('leituras', id);
        const user = Auth.getUsuario();

        if (user.perfil === 'leitor' && leitura && leitura.usuarioId !== user.id) {
            showToast('Você só pode excluir suas próprias leituras!', 'error');
            return;
        }

        if (!confirm('Excluir esta leitura?')) return;
        DB.remove('leituras', id);
        showToast('Leitura excluída!');
        this.render();
    },

    cancel() {
        this.form.reset();
        this.inputConsumo.value = '';
        const idField = document.getElementById('leitura-id');
        if (idField) idField.value = '';
    },

    getAll() {
        return DB.get('leituras');
    },

    getByCliente(clienteId) {
        return this.getAll().filter(l => l.clienteId === clienteId);
    },

    gerarFatura(leituraId) {
        const leitura = DB.find('leituras', leituraId);
        if (!leitura) return;

        const cliente = DB.find('clientes', leitura.clienteId);
        if (!cliente) return;

        const config = Config.get();
        const consumo = leitura.consumo;
        const valorConsumo = consumo * config.valorM3;
        const valorTotal = valorConsumo + config.taxaFixa;

        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 10);

        const fatura = {
            clienteId: cliente.id,
            clienteNome: cliente.nome,
            clienteEndereco: cliente.endereco,
            clienteNumero: cliente.numero,
            mes: leitura.mes,
            consumo,
            valorM3: config.valorM3,
            valorConsumo,
            taxaFixa: config.taxaFixa,
            valorTotal,
            vencimento: vencimento.toISOString().split('T')[0],
            empresa: config.empresa,
            leituraId: leitura.id,
            criadoPor: leitura.usuarioNome
        };

        this.showFatura(fatura);
    },

    showFatura(fatura) {
        let modal = document.getElementById('modal-fatura-leitor');
        if (!modal) {
            modal = this.createFaturaModal();
            document.body.appendChild(modal);
        }

        document.getElementById('fatura-empresa').textContent = fatura.empresa;
        document.getElementById('fatura-cliente').textContent = fatura.clienteNome;
        document.getElementById('fatura-endereco').textContent = fatura.clienteEndereco;
        document.getElementById('fatura-hidrometro').textContent = fatura.clienteNumero;
        document.getElementById('fatura-referencia').textContent = formatMonthYear(fatura.mes);
        document.getElementById('fatura-consumo').textContent = fatura.consumo.toFixed(2) + ' m³';
        document.getElementById('fatura-valor-m3').textContent = formatCurrency(fatura.valorM3);
        document.getElementById('fatura-valor-consumo').textContent = formatCurrency(fatura.valorConsumo);
        document.getElementById('fatura-taxa-fix').textContent = formatCurrency(fatura.taxaFixa);
        document.getElementById('fatura-valor-total').textContent = formatCurrency(fatura.valorTotal);
        document.getElementById('fatura-vencimento').textContent = formatDate(fatura.vencimento);
        document.getElementById('fatura-leitor').textContent = fatura.criadoPor;

        modal.classList.add('active');
    },

    createFaturaModal() {
        const modal = document.createElement('div');
        modal.id = 'modal-fatura-leitor';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content boleto">
                <div class="boleto-header">
                    <h2 id="fatura-empresa">Empresa</h2>
                    <p>FATURA DE FORNECIMENTO DE ÁGUA</p>
                </div>
                <div class="boleto-body">
                    <div class="boleto-info">
                        <div class="boleto-field">
                            <label>Cliente:</label>
                            <span id="fatura-cliente"></span>
                        </div>
                        <div class="boleto-field">
                            <label>Endereço:</label>
                            <span id="fatura-endereco"></span>
                        </div>
                        <div class="boleto-field">
                            <label>Hidrômetro:</label>
                            <span id="fatura-hidrometro"></span>
                        </div>
                    </div>
                    <div class="boleto-info">
                        <div class="boleto-field">
                            <label>Referência:</label>
                            <span id="fatura-referencia"></span>
                        </div>
                        <div class="boleto-field">
                            <label>Consumo:</label>
                            <span id="fatura-consumo"></span>
                        </div>
                        <div class="boleto-field">
                            <label>Vencimento:</label>
                            <span id="fatura-vencimento"></span>
                        </div>
                    </div>
                    <div class="fatura-detalhes">
                        <div class="fatura-linha">
                            <span>Consumo (m³):</span>
                            <span id="fatura-consumo-valor"></span>
                        </div>
                        <div class="fatura-linha">
                            <span>Valor por m³:</span>
                            <span id="fatura-valor-m3"></span>
                        </div>
                        <div class="fatura-linha">
                            <span>Valor do Consumo:</span>
                            <span id="fatura-valor-consumo"></span>
                        </div>
                        <div class="fatura-linha">
                            <span>Taxa Fixa:</span>
                            <span id="fatura-taxa-fix"></span>
                        </div>
                        <div class="fatura-linha total">
                            <span>VALOR TOTAL:</span>
                            <span id="fatura-valor-total"></span>
                        </div>
                    </div>
                    <div class="fatura-info-extra">
                        <p><small>Leitura realizada por: <span id="fatura-leitor"></span></small></p>
                    </div>
                </div>
                <div class="boleto-footer">
                    <button class="btn btn-primary" onclick="Leituras.imprimirFatura()">Imprimir</button>
                    <button class="btn btn-secondary" onclick="Leituras.fecharFatura()">Fechar</button>
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.fecharFatura();
        });

        return modal;
    },

    imprimirFatura() {
        const modal = document.getElementById('modal-fatura-leitor');
        const conteudo = modal.querySelector('.modal-content').outerHTML;

        const janela = window.open('', '_blank');
        janela.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Fatura</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .boleto-header { background: #1976D2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .boleto-header h2 { margin: 0 0 5px 0; color: white; }
                    .boleto-header p { margin: 0; opacity: 0.9; }
                    .boleto-body { padding: 20px; border: 1px solid #e0e0e0; border-top: none; }
                    .boleto-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #ccc; }
                    .boleto-field label { font-size: 12px; color: #666; display: block; margin-bottom: 3px; }
                    .boleto-field span { font-weight: 500; }
                    .fatura-detalhes { margin-top: 15px; }
                    .fatura-linha { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                    .fatura-linha.total { border-top: 2px solid #1976D2; border-bottom: none; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: bold; color: #1976D2; }
                    .fatura-info-extra { margin-top: 15px; text-align: center; color: #666; }
                    .boleto-footer { display: none; }
                </style>
            </head>
            <body>
                ${conteudo}
                <script>window.onload = function() { window.print(); window.close(); }<\/script>
            </body>
            </html>
        `);
        janela.document.close();
    },

    fecharFatura() {
        document.getElementById('modal-fatura-leitor').classList.remove('active');
    },

    render() {
        const user = Auth.getUsuario();
        let leituras = this.getAll();

        if (user.perfil === 'leitor') {
            leituras = leituras.filter(l => l.usuarioId === user.id);
        }

        leituras.sort((a, b) => b.mes.localeCompare(a.mes));

        const canEdit = user.perfil === 'admin';

        this.tableBody.innerHTML = leituras.length === 0
            ? '<tr><td colspan="6" style="text-align:center">Nenhuma leitura registrada</td></tr>'
            : leituras.map(l => `
                <tr>
                    <td>${l.clienteNome}</td>
                    <td>${formatMonthYear(l.mes)}</td>
                    <td>${l.anterior.toFixed(2)} m³</td>
                    <td>${l.atual.toFixed(2)} m³</td>
                    <td><strong>${l.consumo.toFixed(2)} m³</strong></td>
                    <td>
                        <button class="btn-icon" onclick="Leituras.gerarFatura('${l.id}')" title="Gerar Fatura">📄</button>
                        ${canEdit || l.usuarioId === user.id ? `
                            <button class="btn-icon" onclick="Leituras.edit('${l.id}')" title="Editar">✏️</button>
                            <button class="btn-icon" onclick="Leituras.delete('${l.id}')" title="Excluir">🗑️</button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
    }
};
