import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, statusBadge } from '../../components/Badge'

describe('Badge', () => {
  it('renderiza com texto', () => {
    render(<Badge variant="success">pago</Badge>)
    expect(screen.getByText('pago')).toBeInTheDocument()
  })

  it('aplica cores success', () => {
    render(<Badge variant="success">pago</Badge>)
    const el = screen.getByText('pago')
    expect(el.style.background).toBe('rgb(209, 250, 229)')
    expect(el.style.color).toBe('rgb(6, 95, 70)')
  })

  it('aplica cores danger', () => {
    render(<Badge variant="danger">atrasado</Badge>)
    const el = screen.getByText('atrasado')
    expect(el.style.background).toBe('rgb(254, 226, 226)')
    expect(el.style.color).toBe('rgb(153, 27, 27)')
  })

  it('aplica cores warning', () => {
    render(<Badge variant="warning">pendente</Badge>)
    const el = screen.getByText('pendente')
    expect(el.style.background).toBe('rgb(254, 243, 199)')
  })

  it('aplica cores info', () => {
    render(<Badge variant="info">info</Badge>)
    const el = screen.getByText('info')
    expect(el.style.background).toBe('rgb(207, 250, 254)')
  })

  it('aplica cores secondary', () => {
    render(<Badge variant="secondary">inativo</Badge>)
    const el = screen.getByText('inativo')
    expect(el.style.background).toBe('rgb(241, 245, 249)')
  })
})

describe('statusBadge', () => {
  it('mapeia pago para success', () => {
    render(<>{statusBadge('pago')}</>)
    expect(screen.getByText('pago')).toBeInTheDocument()
  })

  it('mapeia atrasado para danger', () => {
    render(<>{statusBadge('atrasado')}</>)
    expect(screen.getByText('atrasado')).toBeInTheDocument()
  })

  it('mapeia pendente para warning', () => {
    render(<>{statusBadge('pendente')}</>)
    expect(screen.getByText('pendente')).toBeInTheDocument()
  })

  it('mapeia ativo para success', () => {
    render(<>{statusBadge('ativo')}</>)
    expect(screen.getByText('ativo')).toBeInTheDocument()
  })

  it('mapeia inativo para secondary', () => {
    render(<>{statusBadge('inativo')}</>)
    expect(screen.getByText('inativo')).toBeInTheDocument()
  })

  it('fallback para secondary em status desconhecido', () => {
    render(<>{statusBadge('desconhecido')}</>)
    expect(screen.getByText('desconhecido')).toBeInTheDocument()
  })
})
