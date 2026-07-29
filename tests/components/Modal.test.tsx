import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '../../components/Modal'

describe('Modal', () => {
  it('nao renderiza quando fechado', () => {
    const { container } = render(<Modal open={false} onClose={() => {}}>Conteudo</Modal>)
    expect(container.innerHTML).toBe('')
  })

  it('renderiza quando aberto', () => {
    render(<Modal open={true} onClose={() => {}}>Conteudo</Modal>)
    expect(screen.getByText('Conteudo')).toBeInTheDocument()
  })

  it('renderiza titulo quando fornecido', () => {
    render(<Modal open={true} onClose={() => {}} title="Titulo">Conteudo</Modal>)
    expect(screen.getByText('Titulo')).toBeInTheDocument()
  })

  it('chama onClose ao clicar no backdrop', () => {
    const fn = vi.fn()
    const { container } = render(<Modal open={true} onClose={fn}>Conteudo</Modal>)
    const backdrop = container.firstChild as HTMLElement
    fireEvent.click(backdrop)
    expect(fn).toHaveBeenCalled()
  })

  it('chama onClose ao pressionar Escape', () => {
    const fn = vi.fn()
    render(<Modal open={true} onClose={fn}>Conteudo</Modal>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(fn).toHaveBeenCalled()
  })

  it('botao de fechar chama onClose', () => {
    const fn = vi.fn()
    render(<Modal open={true} onClose={fn}>Conteudo</Modal>)
    const closeBtn = screen.getByText('\u00D7')
    fireEvent.click(closeBtn)
    expect(fn).toHaveBeenCalled()
  })
})
