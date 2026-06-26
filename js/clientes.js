const Clientes = {
    init() {
        this.form = document.getElementById('form-cliente');
        this.tableBody = document.querySelector('#tabela-clientes tbody');
        this.searchInput = document.getElementById('buscar-cliente');
        this.btnCancelar = document.getElementById('btn-cancelar-cliente');

        this.form.addEventListener('submit', (e) => this.save(e));
        this.btnCancelar.addEventListener('click', () => this.cancel());
        this.searchInput.addEventListener('input', () => this.render());

        this.render();
    },

    getAll() {
        return DB.get('clientes');
    },

    getAtivos() {
        return this.getAll().filter(c => c.status === 'ativo');
    },

    save(e) {
        e.preventDefault();
        const id = document.getElementById('cliente-id').value;
        const cliente = {
            nome: document.getElementById('cliente-nome').value.trim(),
            cpf: document.getElementById('cliente-cpf').value.trim(),
            endereco: document.getElementById('cliente-endereco').value.trim(),
            numero: document.getElementById('cliente-numero').value.trim(),
            telefone: document.getElementById('cliente-telefone').value.trim(),
            status: document.getElementById('cliente-status').value
        };

        if (id) {
            DB.update('clientes', id, cliente);
            showToast('Cliente atualizado com sucesso!');
        } else {
            DB.add('clientes', cliente);
            showToast('Cliente cadastrado com sucesso!');
        }

        this.form.reset();
        document.getElementById('cliente-id').value = '';
        this.render();
    },

    edit(id) {
        const cliente = DB.find('clientes', id);
        if (!cliente) return;

        document.getElementById('cliente-id').value = cliente.id;
        document.getElementById('cliente-nome').value = cliente.nome;
        document.getElementById('cliente-cpf').value = cliente.cpf;
        document.getElementById('cliente-endereco').value = cliente.endereco;
        document.getElementById('cliente-numero').value = cliente.numero;
        document.getElementById('cliente-telefone').value = cliente.telefone || '';
        document.getElementById('cliente-status').value = cliente.status;

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    delete(id) {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        DB.remove('clientes', id);
        showToast('Cliente excluído!');
        this.render();
    },

    cancel() {
        this.form.reset();
        document.getElementById('cliente-id').value = '';
    },

    render() {
        const search = this.searchInput.value.toLowerCase();
        const clientes = this.getAll().filter(c =>
            c.nome.toLowerCase().includes(search) ||
            c.cpf.includes(search) ||
            c.numero.includes(search)
        );

        this.tableBody.innerHTML = clientes.length === 0
            ? '<tr><td colspan="6" style="text-align:center">Nenhum cliente encontrado</td></tr>'
            : clientes.map(c => `
                <tr>
                    <td>${c.nome}</td>
                    <td>${c.cpf}</td>
                    <td>${c.endereco}</td>
                    <td>${c.numero}</td>
                    <td><span class="status-badge status-${c.status}">${c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="Clientes.edit('${c.id}')" title="Editar">✏️</button>
                        <button class="btn-icon" onclick="Clientes.delete('${c.id}')" title="Excluir">🗑️</button>
                    </td>
                </tr>
            `).join('');
    }
};
