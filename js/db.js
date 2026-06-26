const DB = {
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    add(key, item) {
        const data = this.get(key);
        item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        item.criadoEm = new Date().toISOString();
        data.push(item);
        this.set(key, data);
        return item;
    },

    update(key, id, updates) {
        const data = this.get(key);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updates, atualizadoEm: new Date().toISOString() };
            this.set(key, data);
            return data[index];
        }
        return null;
    },

    remove(key, id) {
        const data = this.get(key);
        const filtered = data.filter(item => item.id !== id);
        this.set(key, filtered);
    },

    find(key, id) {
        return this.get(key).find(item => item.id === id);
    },

    clearAll() {
        localStorage.removeItem('clientes');
        localStorage.removeItem('leituras');
        localStorage.removeItem('cobrancas');
        localStorage.removeItem('pagamentos');
        localStorage.removeItem('config');
    }
};

const Config = {
    get() {
        const config = DB.get('config');
        return config.length ? config[0] : {
            valorM3: 8.50,
            taxaFixa: 15.00,
            multa: 2,
            juros: 1,
            empresa: 'Saneamento Básico Ltda'
        };
    },

    save(config) {
        const existing = DB.get('config');
        if (existing.length) {
            DB.update('config', existing[0].id, config);
        } else {
            DB.add('config', config);
        }
    }
};

function formatCurrency(value) {
    return 'R$ ' + Number(value).toFixed(2).replace('.', ',');
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
}

function formatMonthYear(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[parseInt(month) - 1] + '/' + year;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 14px 24px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 999;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
