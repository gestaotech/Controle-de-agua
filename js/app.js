document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;

    initUserInfo();
    initMenuPermissions();
    initNavigation();
    initConfig();
    initDashboard();
    initModal();
    initLogout();

    Clientes.init();
    Leituras.init();
    Cobranca.init();
    Pagamentos.init();
    Relatorios.init();
    Usuarios.init();

    document.getElementById('leitura-mes').value = getCurrentMonth();
    document.getElementById('cobranca-mes').value = getCurrentMonth();
});

function getCurrentMonth() {
    const now = new Date();
    return now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');
}

function initUserInfo() {
    const user = Auth.getUsuario();
    if (user) {
        const perfil = user.perfil === 'admin' ? 'Administrador' : 'Leitor';
        document.getElementById('user-info').textContent = `${user.nome} (${perfil})`;
    }
}

function initMenuPermissions() {
    const user = Auth.getUsuario();
    const menuItems = document.querySelectorAll('[data-requires]');

    menuItems.forEach(item => {
        const required = item.dataset.requires;
        if (required === 'admin' && user.perfil !== 'admin') {
            item.style.display = 'none';
        }
    });
}

function initNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;

            if (link.parentElement.style.display === 'none') {
                showToast('Acesso não autorizado!', 'error');
                return;
            }

            links.forEach(l => l.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));

            link.classList.add('active');
            document.getElementById(`page-${page}`).classList.add('active');

            if (page === 'dashboard') initDashboard();
            if (page === 'leituras') Leituras.populateClientes();
            if (page === 'cobranca') {
                Cobranca.populateClientes();
                Cobranca.loadConfig();
            }
            if (page === 'pagamentos') Pagamentos.populateCobrancas();
            if (page === 'relatorios') Relatorios.populateClientes();
            if (page === 'usuarios') Usuarios.render();
        });
    });
}

function initDashboard() {
    const user = Auth.getUsuario();
    const clientes = DB.get('clientes');
    const cobrancas = DB.get('cobrancas');
    const pagamentos = DB.get('pagamentos');
    const leituras = DB.get('leituras');

    const now = new Date();
    const mesAtual = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');

    if (user.perfil === 'admin') {
        document.getElementById('total-clientes').textContent = clientes.length;
        document.getElementById('clientes-ativos').textContent = clientes.filter(c => c.status === 'ativo').length;
        document.getElementById('boletos-pendentes').textContent = cobrancas.filter(c => c.status === 'pendente').length;

        const receitaMes = pagamentos
            .filter(p => p.mes.startsWith(mesAtual))
            .reduce((sum, p) => sum + p.valorPago, 0);
        document.getElementById('receita-mes').textContent = formatCurrency(receitaMes);

        const recentes = cobrancas
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
            .slice(0, 5);

        const tbody = document.querySelector('#ultimas-cobrancas tbody');
        tbody.innerHTML = recentes.length === 0
            ? '<tr><td colspan="4" style="text-align:center">Nenhuma cobrança ainda</td></tr>'
            : recentes.map(c => `
                <tr>
                    <td>${c.clienteNome}</td>
                    <td>${formatMonthYear(c.mes)}</td>
                    <td>${formatCurrency(c.valorTotal)}</td>
                    <td><span class="status-badge status-${c.status}">${c.status === 'pendente' ? 'Pendente' : c.status === 'pago' ? 'Pago' : 'Cancelado'}</span></td>
                </tr>
            `).join('');

        initCharts(leituras, cobrancas, pagamentos);
    } else {
        document.getElementById('total-clientes').textContent = clientes.filter(c => c.status === 'ativo').length;
        document.getElementById('clientes-ativos').textContent = '---';
        document.getElementById('boletos-pendentes').textContent = '---';
        document.getElementById('receita-mes').textContent = '---';

        const tbody = document.querySelector('#ultimas-cobrancas tbody');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Acesso restrito ao administrador</td></tr>';
    }
}

function initCharts(leituras, cobrancas, pagamentos) {
    const meses = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        meses.push(d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0'));
    }

    const labelsMeses = meses.map(m => formatMonthYear(m));

    const consumoPorMes = meses.map(m => 
        leituras.filter(l => l.mes === m).reduce((sum, l) => sum + l.consumo, 0)
    );

    const faturamentoPorMes = meses.map(m => 
        cobrancas.filter(c => c.mes === m).reduce((sum, c) => sum + c.valorTotal, 0)
    );

    const statusCount = {
        pendente: cobrancas.filter(c => c.status === 'pendente').length,
        pago: cobrancas.filter(c => c.status === 'pago').length,
        cancelado: cobrancas.filter(c => c.status === 'cancelado').length
    };

    const consumoPorCliente = {};
    leituras.forEach(l => {
        if (!consumoPorCliente[l.clienteNome]) {
            consumoPorCliente[l.clienteNome] = 0;
        }
        consumoPorCliente[l.clienteNome] += l.consumo;
    });

    const topClientes = Object.entries(consumoPorCliente)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const chartColors = {
        primary: 'rgba(33, 150, 243, 0.8)',
        primaryBorder: 'rgba(33, 150, 243, 1)',
        success: 'rgba(76, 175, 80, 0.8)',
        warning: 'rgba(255, 152, 0, 0.8)',
        danger: 'rgba(244, 67, 54, 0.8)',
        secondary: 'rgba(96, 125, 139, 0.8)'
    };

    if (window.chartConsumo) window.chartConsumo.destroy();
    if (window.chartFaturamento) window.chartFaturamento.destroy();
    if (window.chartStatus) window.chartStatus.destroy();
    if (window.chartClientes) window.chartClientes.destroy();

    window.chartConsumo = new Chart(document.getElementById('chart-consumo'), {
        type: 'line',
        data: {
            labels: labelsMeses,
            datasets: [{
                label: 'Consumo (m³)',
                data: consumoPorMes,
                borderColor: chartColors.primaryBorder,
                backgroundColor: chartColors.primary,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    window.chartFaturamento = new Chart(document.getElementById('chart-faturamento'), {
        type: 'bar',
        data: {
            labels: labelsMeses,
            datasets: [{
                label: 'Faturamento (R$)',
                data: faturamentoPorMes,
                backgroundColor: chartColors.success
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });

    window.chartStatus = new Chart(document.getElementById('chart-status'), {
        type: 'doughnut',
        data: {
            labels: ['Pendente', 'Pago', 'Cancelado'],
            datasets: [{
                data: [statusCount.pendente, statusCount.pago, statusCount.cancelado],
                backgroundColor: [chartColors.warning, chartColors.success, chartColors.secondary]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    window.chartClientes = new Chart(document.getElementById('chart-clientes'), {
        type: 'bar',
        data: {
            labels: topClientes.map(c => c[0]),
            datasets: [{
                label: 'Consumo Total (m³)',
                data: topClientes.map(c => c[1]),
                backgroundColor: chartColors.primary
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

function initConfig() {
    const config = Config.get();
    document.getElementById('config-valor-m3').value = config.valorM3;
    document.getElementById('config-taxa-fix').value = config.taxaFixa;
    document.getElementById('config-multa').value = config.multa;
    document.getElementById('config-juros').value = config.juros;
    document.getElementById('config-empresa').value = config.empresa;

    document.getElementById('form-config').addEventListener('submit', (e) => {
        e.preventDefault();
        Config.save({
            valorM3: parseFloat(document.getElementById('config-valor-m3').value),
            taxaFixa: parseFloat(document.getElementById('config-taxa-fix').value),
            multa: parseFloat(document.getElementById('config-multa').value),
            juros: parseFloat(document.getElementById('config-juros').value),
            empresa: document.getElementById('config-empresa').value.trim()
        });
        showToast('Configurações salvas!');
    });

    document.getElementById('btn-limpar-dados').addEventListener('click', () => {
        if (!confirm('ATENÇÃO: Todos os dados serão apagados permanentemente!\n\nTem certeza?')) return;
        if (!confirm('Última chance! Confirma a limpeza de todos os dados?')) return;
        DB.clearAll();
        showToast('Todos os dados foram apagados!', 'warning');
        initDashboard();
    });
}

function initModal() {
    const modal = document.getElementById('modal-boleto');
    document.getElementById('btn-fechar-boleto').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function initLogout() {
    document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm('Deseja sair do sistema?')) {
            Auth.logout();
        }
    });
}
