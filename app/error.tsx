'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: '#1E293B' }}>Algo deu errado</h1>
      <p style={{ color: '#64748B', marginBottom: 24, maxWidth: 400 }}>{error.message || 'Ocorreu um erro inesperado.'}</p>
      <button
        onClick={reset}
        style={{ padding: '0.75rem 2rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: '1rem' }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
