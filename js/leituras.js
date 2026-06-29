const Leituras = {
    async getAll() {
        const db = getSupabase();
        const { data, error } = await db
            .from('leituras')
            .select('*, clientes(nome, numero_hidrometro)')
            .order('mes', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getUltimaLeitura(clienteId) {
        const db = getSupabase();
        const { data, error } = await db
            .from('leituras')
            .select('*')
            .eq('cliente_id', clienteId)
            .order('mes', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async create(leitura) {
        const db = getSupabase();
        const user = await Auth.getUser();

        const { data, error } = await db.from('leituras').insert({
            cliente_id: leitura.cliente_id,
            usuario_id: user.id,
            mes: leitura.mes,
            anterior: leitura.anterior,
            atual: leitura.atual
        }).select();
        if (error) throw error;
        return data[0];
    },

    async update(id, updates) {
        const db = getSupabase();
        const { data, error } = await db.from('leituras').update({
            mes: updates.mes,
            anterior: updates.anterior,
            atual: updates.atual
        }).eq('id', id).select();
        if (error) throw error;
        return data[0];
    },

    async delete(id) {
        const db = getSupabase();
        const { error } = await db.from('leituras').delete().eq('id', id);
        if (error) throw error;
    },

    async loadUltimaLeitura() {
        const clienteId = document.getElementById('leitura-cliente').value;
        const inputAnterior = document.getElementById('leitura-anterior');
        const inputConsumo = document.getElementById('leitura-consumo');

        if (!clienteId) {
            inputAnterior.value = '';
            inputConsumo.value = '';
            return;
        }

        const ultima = await this.getUltimaLeitura(clienteId);
        if (ultima) {
            inputAnterior.value = ultima.atual;
            showToast(`Última leitura (${formatMonthYear(ultima.mes)}): ${ultima.atual} m³`);
        } else {
            inputAnterior.value = '0';
            showToast('Primeira leitura deste cliente', 'info');
        }

        this.calcConsumo();
    },

    calcConsumo() {
        const anterior = parseFloat(document.getElementById('leitura-anterior').value) || 0;
        const atual = parseFloat(document.getElementById('leitura-atual').value) || 0;
        const consumo = atual - anterior;
        document.getElementById('leitura-consumo').value = consumo >= 0 ? consumo.toFixed(2) : '';
    },

    async save(e) {
        e.preventDefault();
        const clienteId = document.getElementById('leitura-cliente').value;
        const mes = document.getElementById('leitura-mes').value;
        const anterior = parseFloat(document.getElementById('leitura-anterior').value) || 0;
        const atual = parseFloat(document.getElementById('leitura-atual').value);

        if (!clienteId || !mes || isNaN(atual)) {
            showToast('Preencha todos os campos obrigatórios!', 'error');
            return;
        }

        if (atual < anterior) {
            showToast('Leitura atual não pode ser menor que a anterior!', 'error');
            return;
        }

        const leitura = { cliente_id: clienteId, mes, anterior, atual };

        try {
            const existente = await this.checkExistente(clienteId, mes);
            if (existente) {
                await this.update(existente.id, leitura);
                showToast('Leitura atualizada com sucesso!');
            } else {
                await this.create(leitura);
                showToast('Leitura registrada com sucesso!');
            }
            this.cancel();
            this.render();
        } catch (error) {
            showToast('Erro ao salvar leitura: ' + error.message, 'error');
        }
    },

    async checkExistente(clienteId, mes) {
        const db = getSupabase();
        const { data } = await db
            .from('leituras')
            .select('*')
            .eq('cliente_id', clienteId)
            .eq('mes', mes)
            .maybeSingle();
        return data;
    },

    cancel() {
        document.getElementById('form-leitura').reset();
        document.getElementById('leitura-mes').value = getCurrentMonth();
    },

    async render() {
        const user = await Auth.getUser();
        const perfil = await Auth.getPerfil();
        const isAdmin = perfil && perfil.perfil === 'admin';

        const db = getSupabase();
        let query = db.from('leituras').select('*, clientes(nome, numero_hidrometro)');

        if (!isAdmin) {
            query = query.eq('usuario_id', user.id);
        }

        const { data } = await query.order('mes', { ascending: false });

        const tbody = document.getElementById('tabela-leituras');
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">Nenhuma leitura encontrada</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(l => `
            <tr>
                <td>${l.clientes?.nome || 'N/A'}</td>
                <td>${formatMonthYear(l.mes)}</td>
                <td>${l.anterior} m³</td>
                <td>${l.atual} m³</td>
                <td><strong>${l.consumo} m³</strong></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="Leituras.gerarFatura('${l.id}')" title="Gerar Fatura">📄</button>
                    ${isAdmin || l.usuario_id === user.id ? `
                        <button class="btn-icon" onclick="Leituras.edit('${l.id}')" title="Editar">✏️</button>
                        <button class="btn-icon" onclick="Leituras.remove('${l.id}')" title="Excluir">🗑️</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    },

    edit(id) {
        this.getAll().then(leituras => {
            const l = leituras.find(le => le.id === id);
            if (!l) return;

            document.getElementById('leitura-cliente').value = l.cliente_id;
            document.getElementById('leitura-mes').value = l.mes;
            document.getElementById('leitura-anterior').value = l.anterior;
            document.getElementById('leitura-atual').value = l.atual;
            this.calcConsumo();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    },

    async remove(id) {
        if (!confirm('Excluir esta leitura?')) return;
        try {
            await this.delete(id);
            showToast('Leitura excluída!');
            this.render();
        } catch (error) {
            showToast('Erro ao excluir: ' + error.message, 'error');
        }
    },

    async gerarFatura(leituraId) {
        const db = getSupabase();
        const { data: leitura } = await db.from('leituras').select('*, clientes(*)').eq('id', leituraId).single();
        if (!leitura) return;

        const { data: configArr } = await db.from('config').select('*').limit(1);
        const config = configArr && configArr[0] ? configArr[0] : { empresa: 'Saneamento Básico', valor_m3: 8.50, taxa_fixa: 15.00 };

        const consumo = parseFloat(leitura.consumo);
        const valorM3 = parseFloat(config.valor_m3);
        const taxaFixa = parseFloat(config.taxa_fixa);
        const valorTotal = (consumo * valorM3) + taxaFixa;

        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 10);

        const codigo = generateCode();

        const fatura = {
            cliente: leitura.clientes,
            mes: leitura.mes,
            consumo,
            valorM3,
            taxaFixa,
            valorTotal,
            vencimento: vencimento.toISOString().split('T')[0],
            empresa: config.empresa,
            codigo
        };

        this.showFaturaModal(fatura);
    },

    showFaturaModal(fatura) {
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)Leituras.fecharFatura()">
                <div class="modal">
                    <div class="boleto-preview">
                        <div class="boleto-header-print">
                            <h2>${fatura.empresa}</h2>
                            <p>FATURA DE FORNECIMENTO DE ÁGUA</p>
                        </div>
                        <div class="boleto-body-print">
                            <div class="boleto-info-grid">
                                <div class="boleto-field">
                                    <label>Cliente</label>
                                    <span>${fatura.cliente.nome}</span>
                                </div>
                                <div class="boleto-field">
                                    <label>Endereço</label>
                                    <span>${fatura.cliente.endereco || '-'}</span>
                                </div>
                                <div class="boleto-field">
                                    <label>Hidrômetro</label>
                                    <span>${fatura.cliente.numero_hidrometro}</span>
                                </div>
                                <div class="boleto-field">
                                    <label>Referência</label>
                                    <span>${formatMonthYear(fatura.mes)}</span>
                                </div>
                                <div class="boleto-field">
                                    <label>Consumo</label>
                                    <span>${fatura.consumo.toFixed(2)} m³</span>
                                </div>
                                <div class="boleto-field">
                                    <label>Vencimento</label>
                                    <span>${formatDate(fatura.vencimento)}</span>
                                </div>
                            </div>
                            <div class="boleto-valor-box">
                                <div class="label">VALOR TOTAL</div>
                                <div class="value">${formatCurrency(fatura.valorTotal)}</div>
                            </div>
                            <div class="boleto-codigos">
                                <div class="boleto-qrcode">
                                    <label>PIX QR Code</label>
                                    <div id="qrcode-fatura"></div>
                                </div>
                                <div class="boleto-barcode">
                                    <label>Código de Barras</label>
                                    <svg id="barcode-fatura"></svg>
                                    <span class="barcode-text">${fatura.codigo}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 1rem; text-align: center;">
                        <button class="btn btn-primary" onclick="Leituras.imprimirFatura()">🖨️ Imprimir</button>
                        <button class="btn btn-secondary" onclick="Leituras.fecharFatura()">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const qrcodeEl = document.getElementById('qrcode-fatura');
            if (qrcodeEl) {
                new QRCode(qrcodeEl, {
                    text: `pix:${fatura.codigo}?valor=${fatura.valorTotal}`,
                    width: 120,
                    height: 120
                });
            }

            const barcodeEl = document.getElementById('barcode-fatura');
            if (barcodeEl) {
                try {
                    JsBarcode(barcodeEl, fatura.codigo, {
                        format: 'CODE128',
                        width: 1.5,
                        height: 50,
                        displayValue: false
                    });
                } catch (e) {
                    console.error('Erro ao gerar código de barras:', e);
                }
            }
        }, 100);
    },

    imprimirFatura() {
        window.print();
    },

    fecharFatura() {
        document.getElementById('modal-container').innerHTML = '';
    }
};
