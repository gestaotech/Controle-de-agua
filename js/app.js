const App = {
    currentPage: 'dashboard',

    async init() {
        const isLoggedIn = await Auth.isLoggedIn();
        if (!isLoggedIn) {
            window.location.href = 'login.html';
            return;
        }

        await this.loadUserInfo();
        this.setupNavigation();
        this.setupMobileMenu();
        this.setupForms();
        this.setupFilters();
        this.setupConfig();
        await this.loadPage('dashboard');
    },

    async loadUserInfo() {
        const user = await Auth.getUser();
        const perfil = await Auth.getPerfil();

        if (user && perfil) {
            document.getElementById('user-name').textContent = perfil.nome || user.email;
            document.getElementById('user-role').textContent = perfil.perfil === 'admin' ? 'Administrador' : 'Leitor';
            document.getElementById('user-avatar').textContent = (perfil.nome || user.email).charAt(0).toUpperCase();

            if (perfil.perfil !== 'admin') {
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            }
        }

        document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());
    },

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.loadPage(page);
            });
        });
    },

    setupMobileMenu() {
        const menuBtn = document.getElementById('mobile-menu');
        const sidebar = document.getElementById('sidebar');

        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    },

    setupForms() {
        const formCliente = document.getElementById('form-cliente');
        if (formCliente) {
            formCliente.addEventListener('submit', (e) => Clientes.save(e));
            document.getElementById('btn-cancelar-cliente')?.addEventListener('click', () => Clientes.cancel());
        }

        const formLeitura = document.getElementById('form-leitura');
        if (formLeitura) {
            formLeitura.addEventListener('submit', (e) => Leituras.save(e));
            document.getElementById('btn-cancelar-leitura')?.addEventListener('click', () => Leituras.cancel());

            const leituraCliente = document.getElementById('leitura-cliente');
            if (leituraCliente) {
                leituraCliente.addEventListener('change', () => Leituras.loadUltimaLeitura());
            }

            const leituraAtual = document.getElementById('leitura-atual');
            if (leituraAtual) {
                leituraAtual.addEventListener('input', () => Leituras.calcConsumo());
            }
        }

        const formCobranca = document.getElementById('form-cobranca');
        if (formCobranca) {
            formCobranca.addEventListener('submit', (e) => Cobranca.save(e));
            document.getElementById('btn-cancelar-cobranca')?.addEventListener('click', () => Cobranca.cancel());

            const cobrancaCliente = document.getElementById('cobranca-cliente');
            const cobrancaMes = document.getElementById('cobranca-mes');

            if (cobrancaCliente) cobrancaCliente.addEventListener('change', () => Cobranca.loadLeitura());
            if (cobrancaMes) cobrancaMes.addEventListener('change', () => Cobranca.loadLeitura());

            ['cobranca-valor-m3', 'cobranca-taxa-fix'].forEach(id => {
                document.getElementById(id)?.addEventListener('input', () => Cobranca.calcTotal());
            });
        }

        const formPagamento = document.getElementById('form-pagamento');
        if (formPagamento) {
            formPagamento.addEventListener('submit', (e) => Pagamentos.save(e));
            document.getElementById('btn-cancelar-pagamento')?.addEventListener('click', () => Pagamentos.cancel());
        }

        const formConfig = document.getElementById('form-config');
        if (formConfig) {
            formConfig.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveConfig();
            });
        }
    },

    setupFilters() {
        document.getElementById('buscar-cliente')?.addEventListener('input', () => Clientes.render());
        document.getElementById('filtro-status-cliente')?.addEventListener('change', () => Clientes.render());
        document.getElementById('buscar-cobranca')?.addEventListener('input', () => Cobranca.render());
        document.getElementById('filtro-status-cobranca')?.addEventListener('change', () => Cobranca.render());
        document.getElementById('filtro-pag-inicio')?.addEventListener('change', () => Pagamentos.render());
        document.getElementById('filtro-pag-fim')?.addEventListener('change', () => Pagamentos.render());
        document.getElementById('filtro-pag-metodo')?.addEventListener('change', () => Pagamentos.render());

        document.getElementById('btn-rel-faturamento')?.addEventListener('click', () => Relatorios.gerarFaturamento());
        document.getElementById('btn-rel-inadimplencia')?.addEventListener('click', () => Relatorios.gerarInadimplencia());
    },

    async setupConfig() {
        const perfil = await Auth.getPerfil();
        if (perfil && perfil.perfil === 'admin') {
            await this.loadConfig();
        }
    },

    async loadPage(page) {
        this.currentPage = page;

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        const pageEl = document.getElementById('page-' + page);
        if (pageEl) pageEl.classList.add('active');

        const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navEl) navEl.classList.add('active');

        const titles = {
            dashboard: 'Dashboard',
            clientes: 'Gestão de Clientes',
            leituras: 'Leituras de Hidrômetro',
            cobranca: 'Cobranças',
            pagamentos: 'Pagamentos',
            relatorios: 'Relatórios',
            usuarios: 'Gestão de Usuários',
            config: 'Configurações'
        };
        document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

        document.getElementById('sidebar')?.classList.remove('open');

        switch (page) {
            case 'dashboard':
                await Dashboard.load();
                break;
            case 'clientes':
                await Clientes.render();
                break;
            case 'leituras':
                await Clientes.populateSelect();
                document.getElementById('leitura-mes').value = getCurrentMonth();
                await Leituras.render();
                break;
            case 'cobranca':
                await Clientes.populateSelect();
                document.getElementById('cobranca-mes').value = getCurrentMonth();
                await Cobranca.loadConfig();
                await Cobranca.render();
                break;
            case 'pagamentos':
                await Pagamentos.loadPendentes();
                document.getElementById('pagamento-data').value = new Date().toISOString().split('T')[0];
                await Pagamentos.render();
                break;
            case 'usuarios':
                await this.renderUsuarios();
                break;
            case 'config':
                await this.loadConfig();
                break;
        }
    },

    async renderUsuarios() {
        const usuarios = await Auth.getUsuarios();
        const tbody = document.getElementById('tabela-usuarios');

        if (!tbody) return;

        if (usuarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">Nenhum usuário encontrado</td></tr>';
            return;
        }

        tbody.innerHTML = usuarios.map(u => `
            <tr>
                <td>${u.nome}</td>
                <td>${u.email || '-'}</td>
                <td><span class="badge badge-${u.perfil === 'admin' ? 'info' : 'secondary'}">${u.perfil === 'admin' ? 'Admin' : 'Leitor'}</span></td>
                <td><span class="badge badge-${u.ativo ? 'success' : 'danger'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td class="actions-cell">
                    <button class="btn-icon" onclick="App.toggleUsuario('${u.id}', ${!u.ativo})" title="${u.ativo ? 'Desativar' : 'Ativar'}">
                        ${u.ativo ? '⏸️' : '▶️'}
                    </button>
                    <button class="btn-icon" onclick="App.promoverUsuario('${u.id}', '${u.perfil}')" title="Alterar Perfil">
                        👤
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async toggleUsuario(id, ativo) {
        try {
            await Auth.updatePerfil(id, { ativo });
            showToast('Usuário atualizado!');
            this.renderUsuarios();
        } catch (error) {
            showToast('Erro: ' + error.message, 'error');
        }
    },

    async promoverUsuario(id, perfilAtual) {
        const novoPerfil = perfilAtual === 'admin' ? 'leitor' : 'admin';
        if (!confirm(`Alterar perfil para ${novoPerfil}?`)) return;

        try {
            await Auth.updatePerfil(id, { perfil: novoPerfil });
            showToast('Perfil atualizado!');
            this.renderUsuarios();
        } catch (error) {
            showToast('Erro: ' + error.message, 'error');
        }
    },

    async loadConfig() {
        const db = getSupabase();
        const { data } = await db.from('config').select('*').limit(1);

        if (data && data[0]) {
            document.getElementById('config-empresa').value = data[0].empresa || '';
            document.getElementById('config-valor-m3').value = data[0].valor_m3 || 8.50;
            document.getElementById('config-taxa-fix').value = data[0].taxa_fixa || 15.00;
            document.getElementById('config-multa').value = data[0].multa || 2.00;
            document.getElementById('config-juros').value = data[0].juros || 1.00;
        }
    },

    async saveConfig() {
        const config = {
            empresa: document.getElementById('config-empresa').value.trim(),
            valor_m3: parseFloat(document.getElementById('config-valor-m3').value) || 8.50,
            taxa_fixa: parseFloat(document.getElementById('config-taxa-fix').value) || 15.00,
            multa: parseFloat(document.getElementById('config-multa').value) || 2.00,
            juros: parseFloat(document.getElementById('config-juros').value) || 1.00
        };

        try {
            const db = getSupabase();
            const { data } = await db.from('config').select('id').limit(1);

            if (data && data.length > 0) {
                await db.from('config').update(config).eq('id', data[0].id);
            } else {
                await db.from('config').insert(config);
            }

            showToast('Configurações salvas!');
        } catch (error) {
            showToast('Erro ao salvar: ' + error.message, 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
