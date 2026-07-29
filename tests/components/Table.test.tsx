import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table } from '../../components/Table'

const columns = [
  { key: 'nome', label: 'Nome' },
  { key: 'idade', label: 'Idade' },
]

const data = [
  { id: 1, nome: 'Joao', idade: 30 },
  { id: 2, nome: 'Maria', idade: 25 },
]

describe('Table', () => {
  it('renderiza cabecalhos', () => {
    render(<Table columns={columns} data={data} />)
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.getByText('Idade')).toBeInTheDocument()
  })

  it('renderiza linhas', () => {
    render(<Table columns={columns} data={data} />)
    expect(screen.getByText('Joao')).toBeInTheDocument()
    expect(screen.getByText('Maria')).toBeInTheDocument()
  })

  it('renderiza emptyMessage quando vazio', () => {
    render(<Table columns={columns} data={[]} emptyMessage="Vazio" />)
    expect(screen.getByText('Vazio')).toBeInTheDocument()
  })

  it('renderiza mensagem padrao quando vazio sem emptyMessage', () => {
    render(<Table columns={columns} data={[]} />)
    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument()
  })

  it('usa render customizado', () => {
    const cols = [{ key: 'nome', label: 'Nome', render: (row: any) => <strong>{row.nome}</strong> }]
    render(<Table columns={cols} data={data} />)
    expect(screen.getByText('Joao').tagName).toBe('STRONG')
  })
})
