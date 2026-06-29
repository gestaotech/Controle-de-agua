const Pagamentos = {
    async getAll() {
        const db = getSupabase();
        const { data, error } = await db
            .from('pagamentos')
            .select('*, cobrancas(*, clientes(nome, numero_hidrometro))')
            .order('data_pagamento', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async search(filtroInicio, filtroFim, metodo) {
        const db = getSupabase();
        let query = db
            .from('pagamentos')
            .select('*, cobrancas(*, clientes(nome, numero_hidrometro))');

        if (filtroInicio) {
            query = query.gte('data_pagamento', filtroInicio + '-01');
        }

        if (filtroFim) {
            const [year, month] = filtroFim.split('-');
            const lastDay = new Date(year, month, 0).getDate();
            query = query.lte('data_pagamento', `${filtroFim}-${lastDay}`);
        }

        if (metodo) {
            query = query.eq('metodo', metodo);
        }

        const { data, error } = await query.order('data_pagamento', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getPendentes() {
        const db = getSupabase();
        const { data, error } = await db
            .from('cobrancas')
            .select('*, clientes(nome, numero_hidrometro)')
            .eq('status', 'pendente')
            .order('vencimento');
        if (error) throw error;
        return data || [];
    },

    async create(pagamento) {
        const db = getSupabase();
        const user = await Auth.getUser();

        const { data, error } = await db.from('pagamentos').insert({
            cobranca_id: pagamento.cobranca_id,
            usuario_id: user.id,
            data_pagamento: pagamento.data_pagamento,
            valor: pagamento.valor,
            metodo: pagamento.metodo || 'dinheiro'
        }).select();
        if (error) throw error;

        await db.from('cobrancas').update({
            status: 'pago',
            atualizado_em: new Date().toISOString()
        }).eq('id', pagamento.cobranca_id);

        return data[0];
    },

    async save(e) {
        e.preventDefault();
        const cobrancaId = document.getElementById('pagamento-cobranca').value;
        const dataPagamento = document.getElementById('pagamento-data').value;
        const valor = parseFloat(document.getElementById('pagamento-valor').value);
        const metodo = document.getElementById('pagamento-metodo').value;

        if (!cobrancaId || !dataPagamento || isNaN(valor)) {
            showToast('Preencha todos os campos obrigatórios!', 'error');
            return;
        }

        const pagamento = { cobranca_id: cobrancaId, data_pagamento: dataPagamento, valor, metodo };

        try {
            await this.create(pagamento);
            showToast('Pagamento registrado com sucesso!');
            this.cancel();
            this.render();
            this.loadPendentes();
        } catch (error) {
            showToast('Erro ao registrar pagamento: ' + error.message, 'error');
        }
    },

    cancel() {
        document.getElementById('form-pagamento').reset();
        document.getElementById('pagamento-data').value = new Date().toISOString().split('T')[0];
    },

    async render() {
        const filtroInicio = document.getElementById('filtro-pag-inicio')?.value || '';
        const filtroFim = document.getElementById('filtro-pag-fim')?.value || '';
        const metodo = document.getElementById('filtro-pag-metodo')?.value || '';

        const pagamentos = await this.search(filtroInicio, filtroFim, metodo);
        const tbody = document.getElementById('tabela-pagamentos');

        if (!tbody) return;

        if (pagamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Nenhum pagamento encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = pagamentos.map(p => `
            <tr>
                <td>${p.cobrancas?.clientes?.nome || 'N/A'}</td>
                <td>${formatMonthYear(p.cobrancas?.mes || '')}</td>
                <td>${formatCurrency(p.valor)}</td>
                <td>${formatDate(p.data_pagamento)}</td>
                <td><span class="badge badge-info">${p.metodo || 'N/A'}</span></td>
            </tr>
        `).join('');
    },

    async loadPendentes() {
        const pendentes = await this.getPendentes();
        const select = document.getElementById('pagamento-cobranca');

        if (!select) return;

        select.innerHTML = '<option value="">Selecione um boleto pendente</option>' +
            pendentes.map(c => `<option value="${c.id}" data-valor="${c.valor_total}">${c.clientes?.nome || 'N/A'} - ${formatMonthYear(c.mes)} - ${formatCurrency(c.valor_total)}</option>`).join('');
    },

    async loadLeitorPendentes() {
        const pendentes = await this.getPendentes();
        const tbody = document.getElementById('tabela-pagamentos-pendentes');

        if (!tbody) return;

        if (pendentes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Nenhum boleto pendente</td></tr>';
            return;
        }

        tbody.innerHTML = pendentes.map(c => `
            <tr>
                <td>${c.clientes?.nome || 'N/A'}</td>
                <td>${formatMonthYear(c.mes)}</td>
                <td>${formatCurrency(c.valor_total)}</td>
                <td>${formatDate(c.vencimento)}</td>
            </tr>
        `).join('');
    }
};
