const Auth = {
    async login(email, password) {
        const db = getSupabase();
        const { data, error } = await db.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    },

    async register(email, password, nome, perfil = 'leitor') {
        const db = getSupabase();
        const { data, error } = await db.auth.signUp({
            email,
            password,
            options: { data: { nome, perfil } }
        });
        if (error) throw error;

        if (data.user) {
            await db.from('perfis').insert({
                id: data.user.id,
                nome,
                perfil,
                ativo: true
            });
        }
        return data;
    },

    async logout() {
        const db = getSupabase();
        await db.auth.signOut();
        localStorage.removeItem('session');
        window.location.href = 'index.html';
    },

    async getUser() {
        const db = getSupabase();
        const { data: { user } } = await db.auth.getUser();
        return user;
    },

    async getPerfil() {
        const user = await this.getUser();
        if (!user) return null;

        const db = getSupabase();
        const { data } = await db
            .from('perfis')
            .select('*')
            .eq('id', user.id)
            .single();

        return data;
    },

    async isLoggedIn() {
        const user = await this.getUser();
        return user !== null;
    },

    async isAdmin() {
        const perfil = await this.getPerfil();
        return perfil && perfil.perfil === 'admin';
    },

    async requireAuth() {
        const loggedIn = await this.isLoggedIn();
        if (!loggedIn) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    async requireAdmin() {
        const isAuth = await this.requireAuth();
        if (!isAuth) return false;

        const admin = await this.isAdmin();
        if (!admin) {
            showToast('Acesso restrito ao administrador!', 'error');
            return false;
        }
        return true;
    },

    async getUsuarios() {
        const db = getSupabase();
        const { data, error } = await db
            .from('perfis')
            .select('*')
            .order('nome');
        if (error) throw error;
        return data;
    },

    async updatePerfil(id, updates) {
        const db = getSupabase();
        const { data, error } = await db
            .from('perfis')
            .update(updates)
            .eq('id', id)
            .select();
        if (error) throw error;
        return data[0];
    }
};
