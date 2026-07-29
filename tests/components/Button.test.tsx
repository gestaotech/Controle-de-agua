import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../../components/Button'

describe('Button', () => {
  it('renderiza com texto', () => {
    render(<Button>Clique</Button>)
    expect(screen.getByText('Clique')).toBeInTheDocument()
  })

  it('chama onClick ao clicar', () => {
    const fn = vi.fn()
    render(<Button onClick={fn}>Ok</Button>)
    fireEvent.click(screen.getByText('Ok'))
    expect(fn).toHaveBeenCalledOnce()
  })

  it('desabilita quando loading', () => {
    render(<Button loading>Salvar</Button>)
    expect(screen.getByText('Salvar').closest('button')).toBeDisabled()
  })

  it('desabilita quando disabled', () => {
    render(<Button disabled>Salvar</Button>)
    expect(screen.getByText('Salvar').closest('button')).toBeDisabled()
  })

  it('aplica variante primary por padrao', () => {
    render(<Button>Ok</Button>)
    const btn = screen.getByText('Ok').closest('button')
    expect(btn?.style.background).toBe('rgb(59, 130, 246)')
    expect(btn?.style.color).toBe('rgb(255, 255, 255)')
  })

  it('aplica variante danger', () => {
    render(<Button variant="danger">Excluir</Button>)
    const btn = screen.getByText('Excluir').closest('button')
    expect(btn?.style.background).toBe('rgb(239, 68, 68)')
  })

  it('aplica variante secondary', () => {
    render(<Button variant="secondary">Cancelar</Button>)
    const btn = screen.getByText('Cancelar').closest('button')
    expect(btn?.style.background).toBe('rgb(226, 232, 240)')
  })

  it('aplica size sm', () => {
    render(<Button size="sm">Pequeno</Button>)
    const btn = screen.getByText('Pequeno').closest('button')
    expect(btn?.style.fontSize).toBe('0.8rem')
  })

  it('aplica style customizado', () => {
    render(<Button style={{ marginLeft: 10 }}>Custom</Button>)
    const btn = screen.getByText('Custom').closest('button')
    expect(btn?.style.marginLeft).toBe('10px')
  })
})
