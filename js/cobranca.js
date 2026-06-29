const Cobranca = {
    async getAll() {
        const db = getSupabase();
        const { data, error } = await db
            .from('cobrancas')
            .select('*, clientes(nome, numero_hidrometro)')
            .order('criado_em', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async search(query, status) {
        const db = getSupabase();
        let queryBuilder = db.from('cobrancas').select('*, clientes(nome, numero_hidrometro)');

        if (query) {
            queryBuilder = queryBuilder.ilike('clientes.nome', `%${query}%`);
        }

        if (status) {
            queryBuilder = queryBuilder.eq('status', status);
        }

        const { data, error } = await queryBuilder.order('criado_em', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async create(cobranca) {
        const db = getSupabase();
        const user = await Auth.getUser();

        const { data, error } = await db.from('cobrancas').insert({
            cliente_id: cobranca.cliente_id,
            usuario_id: user.id,
            mes: cobranca.mes,
            consumo: cobranca.consumo,
            valor_m3: cobranca.valor_m3,
            taxa_fixa: cobranca.taxa_fixa,
            valor_total: cobranca.valor_total,
            vencimento: cobranca.vencimento,
            status: 'pendente'
        }).select();
        if (error) throw error;
        return data[0];
    },

    async updateStatus(id, status) {
        const db = getSupabase();
        const { data, error } = await db.from('cobrancas').update({
            status,
            atualizado_em: new Date().toISOString()
        }).eq('id', id).select();
        if (error) throw error;
        return data[0];
    },

    async delete(id) {
        const db = getSupabase();
        const { error } = await db.from('cobrancas').delete().eq('id', id);
        if (error) throw error;
    },

    async loadLeitura() {
        const clienteId = document.getElementById('cobranca-cliente').value;
        const mes = document.getElementById('cobranca-mes').value;
        const inputConsumo = document.getElementById('cobranca-consumo');

        if (!clienteId || !mes) {
            inputConsumo.value = '';
            return;
        }

        const db = getSupabase();
        const { data } = await db
            .from('leituras')
            .select('consumo')
            .eq('cliente_id', clienteId)
            .eq('mes', mes)
            .maybeSingle();

        if (data) {
            inputConsumo.value = data.consumo + ' m³';
            this.calcTotal();
        } else {
            inputConsumo.value = 'Leitura não encontrada';
        }
    },

    calcTotal() {
        const consumo = parseFloat(document.getElementById('cobranca-consumo').value) || 0;
        const valorM3 = parseFloat(document.getElementById('cobranca-valor-m3').value) || 0;
        const taxaFixa = parseFloat(document.getElementById('cobranca-taxa-fix').value) || 0;

        const total = (consumo * valorM3) + taxaFixa;
        document.getElementById('cobranca-total').value = formatCurrency(total);
    },

    async save(e) {
        e.preventDefault();
        const clienteId = document.getElementById('cobranca-cliente').value;
        const mes = document.getElementById('cobranca-mes').value;
        const valorM3 = parseFloat(document.getElementById('cobranca-valor-m3').value);
        const taxaFixa = parseFloat(document.getElementById('cobranca-taxa-fix').value) || 0;
        const vencimento = document.getElementById('cobranca-vencimento').value;

        if (!clienteId || !mes || isNaN(valorM3) || !vencimento) {
            showToast('Preencha todos os campos obrigatórios!', 'error');
            return;
        }

        const db = getSupabase();
        const { data: leitura } = await db
            .from('leituras')
            .select('consumo')
            .eq('cliente_id', clienteId)
            .eq('mes', mes)
            .maybeSingle();

        if (!leitura) {
            showToast('Leitura não encontrada para este cliente/mês!', 'error');
            return;
        }

        const consumo = parseFloat(leitura.consumo);
        const valorTotal = (consumo * valorM3) + taxaFixa;

        const cobranca = { cliente_id: clienteId, mes, consumo, valor_m3: valorM3, taxa_fixa: taxaFixa, valor_total: valorTotal, vencimento };

        try {
            const existente = await this.checkExistente(clienteId, mes);
            if (existente) {
                showToast('Já existe cobrança para este cliente/mês!', 'error');
                return;
            }

            await this.create(cobranca);
            showToast('Cobrança gerada com sucesso!');
            this.cancel();
            this.render();
        } catch (error) {
            showToast('Erro ao gerar cobrança: ' + error.message, 'error');
        }
    },

    async checkExistente(clienteId, mes) {
        const db = getSupabase();
        const { data } = await db
            .from('cobrancas')
            .select('*')
            .eq('cliente_id', clienteId)
            .eq('mes', mes)
            .maybeSingle();
        return data;
    },

    cancel() {
        document.getElementById('form-cobranca').reset();
        document.getElementById('cobranca-mes').value = getCurrentMonth();
        document.getElementById('cobranca-valor-m3').value = '8.50';
        document.getElementById('cobranca-taxa-fix').value = '15.00';
    },

    async render() {
        const buscar = document.getElementById('buscar-cobranca')?.value || '';
        const status = document.getElementById('filtro-status-cobranca')?.value || '';

        const cobrancas = await this.search(buscar, status);
        const tbody = document.getElementById('tabela-cobrancas');

        if (!tbody) return;

        if (cobrancas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">Nenhuma cobrança encontrada</td></tr>';
            return;
        }

        tbody.innerHTML = cobrancas.map(c => `
            <tr>
                <td>${c.clientes?.nome || 'N/A'}</td>
                <td>${formatMonthYear(c.mes)}</td>
                <td>${c.consumo} m³</td>
                <td>${formatCurrency(c.valor_total)}</td>
                <td>${formatDate(c.vencimento)}</td>
                <td><span class="badge badge-${c.status === 'pago' ? 'success' : c.status === 'pendente' ? 'warning' : 'danger'}">${c.status}</span></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="Cobranca.imprimirBoleto('${c.id}')" title="Imprimir">🖨️</button>
                    ${c.status === 'pendente' ? `<button class="btn-icon" onclick="Cobranca.marcarPago('${c.id}')" title="Marcar como Pago">✅</button>` : ''}
                    <button class="btn-icon" onclick="Cobranca.remove('${c.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    async marcarPago(id) {
        if (!confirm('Marcar como pago?')) return;
        try {
            await this.updateStatus(id, 'pago');
            showToast('Cobrança marcada como paga!');
            this.render();
        } catch (error) {
            showToast('Erro: ' + error.message, 'error');
        }
    },

    async remove(id) {
        if (!confirm('Excluir esta cobrança?')) return;
        try {
            await this.delete(id);
            showToast('Cobrança excluída!');
            this.render();
        } catch (error) {
            showToast('Erro ao excluir: ' + error.message, 'error');
        }
    },

    async imprimirBoleto(id) {
        const db = getSupabase();
        const { data: cobranca } = await db.from('cobrancas').select('*, clientes(*)').eq('id', id).single();
        if (!cobranca) return;

        const { data: configArr } = await db.from('config').select('*').limit(1);
        const config = configArr && configArr[0] ? configArr[0] : { empresa: 'Saneamento Básico' };

        const codigo = generateCode();
        const barcodeNumber = generateBarcodeNumber(codigo);

        const fatura = {
            cliente: cobranca.clientes,
            mes: cobranca.mes,
            consumo: cobranca.consumo,
            valorM3: cobranca.valor_m3,
            taxaFixa: cobranca.taxa_fixa,
            valorTotal: cobranca.valor_total,
            vencimento: cobranca.vencimento,
            empresa: config.empresa,
            codigo,
            barcodeNumber
        };

        this.showFaturaModal(fatura);
    },

    showFaturaModal(fatura) {
        const modal = document.getElementById('modal-container');
        modal.innerHTML = `
            <div class="modal-overlay" onclick="if(event.target===this)Cobranca.fecharFatura()">
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
                                    <span>${fatura.consumo} m³</span>
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
                                    <span class="barcode-text">${fatura.barcodeNumber}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 1rem; text-align: center;">
                        <button class="btn btn-primary" onclick="Cobranca.imprimir()">🖨️ Imprimir</button>
                        <button class="btn btn-secondary" onclick="Cobranca.fecharFatura()">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const qrcodeEl = document.getElementById('qrcode-fatura');
            if (qrcodeEl) {
                new QRCode(qrcodeEl, {
                    text: `00020126580014br.gov.bcb.pix0136${fatura.codigo}5204000053039865${fatura.valorTotal.toFixed(2)}5802BR5913${fatura.empresa}6009SAO PAULO62070503***6304`,
                    width: 120,
                    height: 120
                });
            }

            const barcodeEl = document.getElementById('barcode-fatura');
            if (barcodeEl) {
                try {
                    JsBarcode(barcodeEl, fatura.barcodeNumber, {
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

    imprimir() {
        window.print();
    },

    fecharFatura() {
        document.getElementById('modal-container').innerHTML = '';
    },

    async loadConfig() {
        const db = getSupabase();
        const { data } = await db.from('config').select('*').limit(1);
        if (data && data[0]) {
            document.getElementById('cobranca-valor-m3').value = data[0].valor_m3 || 8.50;
            document.getElementById('cobranca-taxa-fix').value = data[0].taxa_fixa || 15.00;
        }
    }
};
