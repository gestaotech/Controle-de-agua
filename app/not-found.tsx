import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: '#1E293B' }}>Página não encontrada</h1>
      <p style={{ color: '#64748B', marginBottom: 24, maxWidth: 400 }}>O endereço que você procura não existe ou foi movido.</p>
      <Link
        href="/login"
        style={{ padding: '0.75rem 2rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: '1rem', textDecoration: 'none' }}
      >
        Voltar ao Login
      </Link>
    </div>
  );
}
