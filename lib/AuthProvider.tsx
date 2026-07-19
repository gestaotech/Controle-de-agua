'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  nome: string;
  perfil: 'admin' | 'leitor';
  ativo: boolean;
  bairro_id: string | null;
  bairro_nome: string;
  contato: string;
}

interface AuthCtx {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase
          .from('perfis')
          .select('*, bairros!left(nome)')
          .eq('id', user.id)
          .single();
        if (data) {
          setProfile({
            id: data.id,
            nome: data.nome,
            perfil: data.perfil,
            ativo: data.ativo,
            bairro_id: data.bairro_id,
            bairro_nome: data.bairros?.nome || '',
            contato: data.contato,
          });
        }
      }
      setLoading(false);
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin: profile?.perfil === 'admin', signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
