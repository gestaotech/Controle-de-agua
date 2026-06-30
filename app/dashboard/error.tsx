'use client';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8, color: '#1E293B' }}>Erro no Painel</h2>
      <p style={{ color: '#64748B', marginBottom: 20, maxWidth: 400 }}>{error.message || 'Não foi possível carregar esta página.'}</p>
      <button
        onClick={reset}
        style={{ padding: '0.625rem 1.5rem', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer' }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
