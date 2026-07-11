'use client';

import { useState, type ReactNode } from 'react';
import { useAuth, AuthProvider } from '@/lib/AuthProvider';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV = [
  { href: '/dashboard', icon: '📊', label: 'Painel' },
  { href: '/dashboard/unidades', icon: '🏠', label: 'Unidades' },
];

const ADMIN_NAV = [
  { href: '/dashboard/bairros', icon: '📍', label: 'Bairros' },
  { href: '/dashboard/cadastrar-leitor', icon: '➕', label: 'Cadastrar Leitor' },
  { href: '/dashboard/config', icon: '⚙️', label: 'Configurações' },
];

function DashboardShell({ children }: { children: ReactNode }) {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) return null;

  const items = [...NAV, ...(isAdmin ? ADMIN_NAV : [])];
  const pageTitle = items.find(i => i.href === pathname)?.label || 'Painel';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        className={menuOpen ? 'sidebar open' : 'sidebar'}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: 260,
          background: '#1E293B',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          transition: 'transform 0.3s',
        }}
      >
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 28 }}>💧</span>
          <div>
            <h1 style={{ fontSize: '1rem' }}>Controle de Água</h1>
            <span style={{ fontSize: '0.75rem', opacity: 0.6, background: '#3B82F6', padding: '2px 8px', borderRadius: 4 }}>Admin</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0.75rem 1.5rem',
                color: '#fff',
                opacity: pathname === item.href ? 1 : 0.7,
                background: pathname === item.href ? '#3B82F6' : 'none',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {profile?.nome?.charAt(0) || 'A'}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{profile?.nome}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Admin</div>
            </div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>🚪</button>
        </div>
      </aside>

      <main style={{ flex: 1, marginLeft: 260 }}>
        <header className="no-print" style={{ height: 64, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 2rem', position: 'sticky', top: 0, zIndex: 50 }}>
          <button className="mobile-btn" onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', marginRight: 12 }}>☰</button>
          <h2>{pageTitle}</h2>
        </header>
        <div style={{ padding: '2rem' }}>{children}</div>
      </main>

      <style>{`
        @media(max-width:768px){
          .sidebar{transform:translateX(-100%)!important}
          .sidebar.open{transform:translateX(0)!important}
          main{margin-left:0!important}
          .mobile-btn{display:block!important}
        }
      `}</style>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
