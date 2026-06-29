'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [nome, setNome] = useState('');
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await signUp(email, password, nome);
        alert('Conta criada com sucesso! Verifique seu email para confirmar.');
        setIsRegister(false);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>💧</div>
          <h1>Controle de Água</h1>
          <p>Sistema de Cobrança de Tarifas</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {isRegister && (
            <div className={styles.group}>
              <label>Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
          )}

          <div className={styles.group}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className={styles.group}>
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Entrando...' : isRegister ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            {isRegister ? 'Já tem conta?' : 'Não tem conta?'}{' '}
            <a href="#" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Fazer login' : 'Criar conta'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
