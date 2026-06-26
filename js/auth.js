const Auth = {
    getUsuario() {
        const session = localStorage.getItem('session');
        return session ? JSON.parse(session) : null;
    },

    isLoggedIn() {
        return this.getUsuario() !== null;
    },

    isAdmin() {
        const user = this.getUsuario();
        return user && user.perfil === 'admin';
    },

    isLeitor() {
        const user = this.getUsuario();
        return user && user.perfil === 'leitor';
    },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    requireAdmin() {
        if (!this.requireAuth()) return false;
        if (!this.isAdmin()) {
            alert('Acesso restrito ao administrador!');
            return false;
        }
        return true;
    },

    logout() {
        localStorage.removeItem('session');
        window.location.href = 'login.html';
    },

    getUsuarios() {
        return JSON.parse(localStorage.getItem('usuarios')) || [];
    },

    addUsuario(usuario) {
        const usuarios = this.getUsuarios();
        usuario.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        usuario.ativo = true;
        usuarios.push(usuario);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        return usuario;
    },

    updateUsuario(id, updates) {
        const usuarios = this.getUsuarios();
        const index = usuarios.findIndex(u => u.id === id);
        if (index !== -1) {
            usuarios[index] = { ...usuarios[index], ...updates };
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            return usuarios[index];
        }
        return null;
    },

    deleteUsuario(id) {
        const usuarios = this.getUsuarios().filter(u => u.id !== id);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
    },

    toggleUsuario(id) {
        const usuarios = this.getUsuarios();
        const user = usuarios.find(u => u.id === id);
        if (user) {
            user.ativo = !user.ativo;
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
        }
    }
};
