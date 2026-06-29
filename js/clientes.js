const Clientes = {
    async getAll() {
        const db = getSupabase();
        const { data, error } = await db.from('clientes').select('*').order('nome');
        if (error) throw error;
        return data || [];
    },

    async getAtivos() {
        const db = getSupabase();
        const { data, error } = await db.from('clientes').select('*').eq('status', 'ativo').order('nome');
        if (error) throw error;
        return data || [];
    },

    async search(query, status) {
        const db = getSupabase();
        let queryBuilder = db.from('clientes').select('*');

        if (query) {
            queryBuilder = queryBuilder.or(`nome.ilike.%${query}%,cpf.ilike.%${query}%,numero_hidrometro.ilike.%${query}%`);
        }

        if (status) {
            queryBuilder = queryBuilder.eq('status', status);
        }

        const { data, error } = await queryBuilder.order('nome');
        if (error) throw error;
        return data || [];
    },

    async create(cliente) {
        const db = getSupabase();
        const { data, error } = await db.from('clientes').insert({
            nome: cliente.nome,
            cpf: cliente.cpf || null,
            endereco: cliente.endereco || null,
            numero_hidrometro: cliente.numero_hidrometro,
            telefone: cliente.telefone || null,
            status: cliente.status || 'ativo'
        }).select();
        if (error) throw error;
        return data[0];
    },

    async update(id, updates) {
        const db = getSupabase();
        const { data, error } = await db.from('clientes').update({
            nome: updates.nome,
            cpf: updates.cpf || null,
            endereco: updates.endereco || null,
            numero_hidrometro: updates.numero_hidrometro,
            telefone: updates.telefone || null,
            status: updates.status,
            atualizado_em: new Date().toISOString()
        }).eq('id', id).select();
        if (error) throw error;
        return data[0];
    },

    async delete(id) {
        const db = getSupabase();
        const { error } = await db.from('clientes').delete().eq('id', id);
        if (error) throw error;
    },

    async render() {
        const buscar = document.getElementById('buscar-cliente')?.value || '';
        const status = document.getElementById('filtro-status-cliente')?.value || '';

        const clientes = await this.search(buscar, status);
        const tbody = document.getElementById('tabela-clientes');

        if (!tbody) return;

        if (clientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">Nenhum cliente encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = clientes.map(c => `
            <tr>
                <td>${c.nome}</td>
                <td>${c.cpf || '-'}</td>
                <td>${c.endereco || '-'}</td>
                <td>${c.numero_hidrometro}</td>
                <td><span class="badge badge-${c.status === 'ativo' ? 'success' : 'danger'}">${c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="Clientes.edit('${c.id}')" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="Clientes.remove('${c.id}')" title="Excluir">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    edit(id) {
        this.getAll().then(clientes => {
            const c = clientes.find(cl => cl.id === id);
            if (!c) return;

            document.getElementById('cliente-id').value = c.id;
            document.getElementById('cliente-nome').value = c.nome;
            document.getElementById('cliente-cpf').value = c.cpf || '';
            document.getElementById('cliente-endereco').value = c.endereco || '';
            document.getElementById('cliente-hidrometro').value = c.numero_hidrometro;
            document.getElementById('cliente-telefone').value = c.telefone || '';
            document.getElementById('cliente-status').value = c.status;
            document.getElementById('cliente-form-title').textContent = 'Editar Cliente';

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    },

    async remove(id) {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        try {
            await this.delete(id);
            showToast('Cliente excluído com sucesso!');
            this.render();
        } catch (error) {
            showToast('Erro ao excluir cliente: ' + error.message, 'error');
        }
    },

    async save(e) {
        e.preventDefault();
        const id = document.getElementById('cliente-id').value;
        const cliente = {
            nome: document.getElementById('cliente-nome').value.trim(),
            cpf: document.getElementById('cliente-cpf').value.trim(),
            endereco: document.getElementById('cliente-endereco').value.trim(),
            numero_hidrometro: document.getElementById('cliente-hidrometro').value.trim(),
            telefone: document.getElementById('cliente-telefone').value.trim(),
            status: document.getElementById('cliente-status').value
        };

        if (!cliente.nome || !cliente.numero_hidrometro) {
            showToast('Preencha os campos obrigatórios!', 'error');
            return;
        }

        try {
            if (id) {
                await this.update(id, cliente);
                showToast('Cliente atualizado com sucesso!');
            } else {
                await this.create(cliente);
                showToast('Cliente cadastrado com sucesso!');
            }
            this.cancel();
            this.render();
        } catch (error) {
            showToast('Erro ao salvar cliente: ' + error.message, 'error');
        }
    },

    cancel() {
        document.getElementById('form-cliente').reset();
        document.getElementById('cliente-id').value = '';
        document.getElementById('cliente-form-title').textContent = 'Novo Cliente';
    },

    async populateSelect() {
        const clientes = await this.getAtivos();
        const selects = document.querySelectorAll('[id*="cliente"]');

        selects.forEach(select => {
            if (select.tagName === 'SELECT' && select.options[0]?.value === '') {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Selecione um cliente</option>' +
                    clientes.map(c => `<option value="${c.id}">${c.nome} (${c.numero_hidrometro})</option>`).join('');
                select.value = currentValue;
            }
        });
    }
};
