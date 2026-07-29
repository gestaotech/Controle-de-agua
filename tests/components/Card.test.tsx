import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '../../components/Card'

describe('Card', () => {
  it('renderiza children', () => {
    render(<Card><p>Conteudo</p></Card>)
    expect(screen.getByText('Conteudo')).toBeInTheDocument()
  })

  it('renderiza titulo quando fornecido', () => {
    render(<Card title="Meu Card"><p>Conteudo</p></Card>)
    expect(screen.getByText('Meu Card')).toBeInTheDocument()
  })

  it('nao renderiza titulo quando nao fornecido', () => {
    const { container } = render(<Card><p>Conteudo</p></Card>)
    expect(container.querySelector('h3')).not.toBeInTheDocument()
  })

  it('aplica style customizado', () => {
    const { container } = render(<Card style={{ maxWidth: 500 }}><p>Conteudo</p></Card>)
    const card = container.firstChild as HTMLElement
    expect(card.style.maxWidth).toBe('500px')
  })
})
