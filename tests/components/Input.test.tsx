import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input, Select } from '../../components/Input'

describe('Input', () => {
  it('renderiza input basico', () => {
    render(<Input placeholder="Digite algo" />)
    expect(screen.getByPlaceholderText('Digite algo')).toBeInTheDocument()
  })

  it('renderiza label', () => {
    render(<Input label="Nome" />)
    expect(screen.getByText('Nome')).toBeInTheDocument()
  })

  it('renderiza mensagem de erro', () => {
    render(<Input label="Nome" error="Campo obrigatorio" />)
    expect(screen.getByText('Campo obrigatorio')).toBeInTheDocument()
  })

  it('aplica borda vermelha quando erro', () => {
    render(<Input error="Erro" />)
    const input = screen.getByRole('textbox')
    expect(input.style.borderColor).toBe('rgb(239, 68, 68)')
  })
})

describe('Select', () => {
  it('renderiza select com options', () => {
    render(
      <Select>
        <option value="">Selecione</option>
        <option value="1">Opcao 1</option>
      </Select>
    )
    expect(screen.getByText('Opcao 1')).toBeInTheDocument()
  })

  it('renderiza label', () => {
    render(<Select label="Categoria"><option value="">Selecione</option></Select>)
    expect(screen.getByText('Categoria')).toBeInTheDocument()
  })
})
