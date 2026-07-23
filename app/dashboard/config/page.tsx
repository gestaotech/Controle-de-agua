'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthProvider'
import { useRouter } from 'next/navigation'
import { Card, Input, Button } from '@/components'

export default function ConfigPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  const [config, setConfig] = useState({ empresa: '', cnpj: '', contato: '', valor_m3: 8.50, taxa_fixa: 15.00 })
  const [ambiente, setAmbiente] = useState('sandbox')
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/dashboard')
  }, [isAdmin, authLoading, router])

  useEffect(() => {
    if (authLoading || !isAdmin) return
    ;(async () => {
      try {
        const { data } = await supabase.from('config').select('*').limit(1)
        if (data?.[0]) {
          const c = data[0]
          setConfig({ empresa: c.empresa || '', cnpj: c.cnpj || '', contato: c.contato || '', valor_m3: c.valor_m3, taxa_fixa: c.taxa_fixa })
        }
        const res = await fetch('/api/asaas-env')
        if (res.ok) { const { environment } = await res.json(); setAmbiente(environment || 'sandbox') }
      } catch { setErro('Erro ao carregar configurações.') }
    })()
  }, [authLoading, isAdmin])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await supabase.from('config').select('id').limit(1)
      if (data?.[0]) { await supabase.from('config').update(config).eq('id', data[0].id) }
      else { await supabase.from('config').insert(config) }
      alert('Configurações salvas!')
    } catch { alert('Erro ao salvar configurações.') }
  }

  if (authLoading) return <p>Carregando...</p>
  if (!isAdmin) return null

  return (
    <Card title="Configurações do Sistema" style={{ maxWidth: 600 }}>
      {erro && <p style={{ color: '#DC2626', marginBottom: 12 }}>{erro}</p>}
      <form onSubmit={save} style={{ display: 'grid', gap: 8 }}>
        <Input label="Nome da Empresa" value={config.empresa} onChange={(e: any) => setConfig({ ...config, empresa: e.target.value })} style={{ gridColumn: '1 / -1' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="CNPJ" value={config.cnpj} onChange={(e: any) => setConfig({ ...config, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
          <Input label="Contato" value={config.contato} onChange={(e: any) => setConfig({ ...config, contato: e.target.value })} placeholder="(00) 00000-0000" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Valor por m³ (R$)" type="number" step="0.01" value={config.valor_m3} onChange={(e: any) => setConfig({ ...config, valor_m3: parseFloat(e.target.value) || 0 })} />
          <Input label="Taxa Fixa Mensal (R$)" type="number" step="0.01" value={config.taxa_fixa} onChange={(e: any) => setConfig({ ...config, taxa_fixa: parseFloat(e.target.value) || 0 })} />
        </div>

        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16, marginTop: 8 }}>
          <h4 style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: 12 }}>Pagamento PIX (Asaas)</h4>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ color: '#166534', fontSize: '0.85rem', margin: 0 }}>O pagamento PIX é processado automaticamente via Asaas.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 6 }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Ambiente</span>
              <div style={{ fontSize: '0.9rem' }}>{ambiente === 'production' ? 'Produção' : 'Sandbox (teste)'}</div>
            </div>
            <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 6 }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Status</span>
              <div style={{ fontSize: '0.9rem', color: '#16A34A' }}>Ativo</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button type="submit">Salvar Configurações</Button>
        </div>
      </form>
    </Card>
  )
}
