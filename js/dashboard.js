const Dashboard = {
    async load() {
        const db = getSupabase();
        const perfil = await Auth.getPerfil();
        const isAdmin = perfil && perfil.perfil === 'admin';

        if (isAdmin) {
            await this.loadAdminDashboard(db);
        } else {
            await this.loadLeitorDashboard(db);
        }
    },

    async loadAdminDashboard(db) {
        const now = new Date();
        const mesAtual = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');

        const { count: totalClientes } = await db.from('clientes').select('*', { count: 'exact', head: true });
        const { count: clientesAtivos } = await db.from('clientes').select('*', { count: 'exact', head: true }).eq('status', 'ativo');
        const { count: pendentes } = await db.from('cobrancas').select('*', { count: 'exact', head: true }).eq('status', 'pendente');

        const { data: pagamentosMes } = await db.from('pagamentos').select('valor').like('data_pagamento', mesAtual + '%');
        const receita = pagamentosMes ? pagamentosMes.reduce((sum, p) => sum + parseFloat(p.valor), 0) : 0;

        document.getElementById('stat-total-clientes').textContent = totalClientes || 0;
        document.getElementById('stat-clientes-ativos').textContent = clientesAtivos || 0;
        document.getElementById('stat-pendentes').textContent = pendentes || 0;
        document.getElementById('stat-receita').textContent = formatCurrency(receita);

        await this.loadUltimasCobrancas(db);
        await this.loadCharts(db);
    },

    async loadLeitorDashboard(db) {
        const user = await Auth.getUser();
        const { count: totalClientes } = await db.from('clientes').select('*', { count: 'exact', head: true }).eq('status', 'ativo');

        document.getElementById('stat-total-clientes').textContent = totalClientes || 0;
        document.getElementById('stat-clientes-ativos').textContent = '---';
        document.getElementById('stat-pendentes').textContent = '---';
        document.getElementById('stat-receita').textContent = '---';

        const tbody = document.getElementById('ultimas-cobrancas');
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Acesso restrito ao administrador</td></tr>';
    },

    async loadUltimasCobrancas(db) {
        const { data } = await db
            .from('cobrancas')
            .select('*, clientes(nome)')
            .order('criado_em', { ascending: false })
            .limit(5);

        const tbody = document.getElementById('ultimas-cobrancas');

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Nenhuma cobrança encontrada</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr>
                <td>${c.clientes?.nome || 'N/A'}</td>
                <td>${formatMonthYear(c.mes)}</td>
                <td>${formatCurrency(c.valor_total)}</td>
                <td><span class="badge badge-${c.status === 'pago' ? 'success' : c.status === 'pendente' ? 'warning' : 'danger'}">${c.status}</span></td>
            </tr>
        `).join('');
    },

    async loadCharts(db) {
        const meses = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            meses.push(d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0'));
        }

        const labelsMeses = meses.map(m => formatMonthYear(m));

        const consumoPorMes = [];
        for (const m of meses) {
            const { data } = await db.from('leituras').select('consumo').eq('mes', m);
            const total = data ? data.reduce((sum, l) => sum + parseFloat(l.consumo || 0), 0) : 0;
            consumoPorMes.push(total);
        }

        const { data: cobrancas } = await db.from('cobrancas').select('status');
        const statusCount = { pendente: 0, pago: 0, atrasado: 0, cancelado: 0 };
        if (cobrancas) {
            cobrancas.forEach(c => {
                if (statusCount[c.status] !== undefined) statusCount[c.status]++;
            });
        }

        if (window.chartConsumo) window.chartConsumo.destroy();
        if (window.chartStatus) window.chartStatus.destroy();

        window.chartConsumo = new Chart(document.getElementById('chart-consumo'), {
            type: 'line',
            data: {
                labels: labelsMeses,
                datasets: [{
                    label: 'Consumo (m³)',
                    data: consumoPorMes,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
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

        window.chartStatus = new Chart(document.getElementById('chart-status'), {
            type: 'doughnut',
            data: {
                labels: ['Pendente', 'Pago', 'Atrasado', 'Cancelado'],
                datasets: [{
                    data: [statusCount.pendente, statusCount.pago, statusCount.atrasado, statusCount.cancelado],
                    backgroundColor: ['#F59E0B', '#10B981', '#EF4444', '#94A3B8']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
};
