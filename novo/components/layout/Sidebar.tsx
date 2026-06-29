'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Sidebar.module.css';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/clientes', icon: '👤', label: 'Clientes' },
  { href: '/leituras', icon: '📏', label: 'Leituras' },
  { href: '/cobranca', icon: '💰', label: 'Cobrança' },
  { href: '/pagamentos', icon: '✅', label: 'Pagamentos' },
  { href: '/relatorios', icon: '📈', label: 'Relatórios' },
];

const adminItems = [
  { href: '/usuarios', icon: '👥', label: 'Usuários' },
  { href: '/config', icon: '⚙️', label: 'Configurações' },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { profile, signOut, isAdmin } = useAuth();

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className={styles.header}>
        <button className={styles.mobileMenu} onClick={() => setOpen(!open)}>
          ☰
        </button>
        <h2>{navItems.find(i => i.href === pathname)?.label || 'Painel'}</h2>
      </header>

      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <span className={styles.logo}>💧</span>
          <h1>Controle de Água</h1>
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className={styles.icon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {isAdmin && adminItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.active : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className={styles.icon}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.userInfo}>
            <div className={styles.userDetails}>
              <div className={styles.avatar}>
                {profile?.nome?.charAt(0) || 'U'}
              </div>
              <div>
                <div className={styles.name}>{profile?.nome || 'Usuário'}</div>
                <div className={styles.role}>{profile?.perfil === 'admin' ? 'Administrador' : 'Leitor'}</div>
              </div>
            </div>
            <button onClick={signOut} className={styles.icon}>🚪</button>
          </div>
        </div>
      </aside>
    </>
  );
}
