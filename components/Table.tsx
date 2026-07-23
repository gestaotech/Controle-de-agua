import { ReactNode } from 'react'

interface Column {
  key: string
  label: string
  render?: (row: any) => ReactNode
}

interface TableProps {
  columns: Column[]
  data: any[]
  onRowClick?: (row: any) => void
  emptyMessage?: string
}

export function Table({ columns, data, onRowClick, emptyMessage = 'Nenhum registro encontrado.' }: TableProps) {
  if (!data.length) {
    return (
      <p style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem 0' }}>
        {emptyMessage}
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC', fontWeight: 600, color: '#64748B', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              style={{
                cursor: onRowClick ? 'pointer' : undefined,
                transition: 'background 0.1s',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC' }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {columns.map(col => (
                <td key={col.key} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', fontSize: '0.9rem' }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
