const Usuarios = {
    init() {
        this.form = document.getElementById('form-usuario');
        this.tableBody = document.querySelector('#tabela-usuarios tbody');
        this.btnCancelar = document.getElementById('btn-cancelar-usuario');

        this.form.addEventListener('submit', (e) => this.save(e));
        this.btnCancelar.addEventListener('click', () => this.cancel());

        this.render();
    },

    save(e) {
        e.preventDefault();
        const id = document.getElementById('usuario-id').value;
        const usuario = {
            nome: document.getElementById('usuario-nome').value.trim(),
            usuario: document.getElementById('usuario-login').value.trim(),
            perfil: document.getElementById('usuario-perfil').value
        };

        const senha = document.getElementById('usuario-senha').value;
        if (senha) {
            usuario.senha = senha;
        } else if (!id) {
            showToast('Senha é obrigatória para novos usuários!', 'error');
            return;
        }

        if (id) {
            Auth.updateUsuario(id, usuario);
            showToast('Usuário atualizado!');
        } else {
            const existe = Auth.getUsuarios().find(u => u.usuario === usuario.usuario);
            if (existe) {
                showToast('Este nome de usuário já existe!', 'error');
                return;
            }
            Auth.addUsuario(usuario);
            showToast('Usuário cadastrado!');
        }

        this.form.reset();
        document.getElementById('usuario-id').value = '';
        this.render();
    },

    edit(id) {
        const user = Auth.getUsuarios().find(u => u.id === id);
        if (!user) return;

        document.getElementById('usuario-id').value = user.id;
        document.getElementById('usuario-nome').value = user.nome;
        document.getElementById('usuario-login').value = user.usuario;
        document.getElementById('usuario-perfil').value = user.perfil;
        document.getElementById('usuario-senha').value = '';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    toggle(id) {
        const user = Auth.getUsuarios().find(u => u.id === id);
        if (!user) return;

        const session = Auth.getUsuario();
        if (session && session.id === id) {
            showToast('Não é possível desativar seu próprio usuário!', 'error');
            return;
        }

        Auth.toggleUsuario(id);
        showToast(user.ativo ? 'Usuário desativado!' : 'Usuário ativado!');
        this.render();
    },

    delete(id) {
        const session = Auth.getUsuario();
        if (session && session.id === id) {
            showToast('Não é possível excluir seu próprio usuário!', 'error');
            return;
        }

        if (!confirm('Excluir este usuário?')) return;
        Auth.deleteUsuario(id);
        showToast('Usuário excluído!');
        this.render();
    },

    cancel() {
        this.form.reset();
        document.getElementById('usuario-id').value = '';
    },

    render() {
        const usuarios = Auth.getUsuarios();

        this.tableBody.innerHTML = usuarios.length === 0
            ? '<tr><td colspan="5" style="text-align:center">Nenhum usuário cadastrado</td></tr>'
            : usuarios.map(u => `
                <tr>
                    <td>${u.nome}</td>
                    <td>${u.usuario}</td>
                    <td><span class="status-badge status-${u.perfil === 'admin' ? 'ativo' : 'pendente'}">${u.perfil === 'admin' ? 'Administrador' : 'Leitor'}</span></td>
                    <td><span class="status-badge status-${u.ativo ? 'ativo' : 'inativo'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="Usuarios.edit('${u.id}')" title="Editar">✏️</button>
                        <button class="btn-icon" onclick="Usuarios.toggle('${u.id}')" title="${u.ativo ? 'Desativar' : 'Ativar'}">${u.ativo ? '🚫' : '✅'}</button>
                        <button class="btn-icon" onclick="Usuarios.delete('${u.id}')" title="Excluir">🗑️</button>
                    </td>
                </tr>
            `).join('');
    }
};
