import { ReactNode } from 'react'

interface CardProps {
  title?: string
  children: ReactNode
  style?: React.CSSProperties
}

export function Card({ title, children, style }: CardProps) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: '1.5rem',
        ...style,
      }}
    >
      {title && (
        <h3 style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 600, color: '#1E293B' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
