'use client'

import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, React.CSSProperties> = {
  primary:   { background: '#3B82F6', color: '#fff' },
  secondary: { background: '#E2E8F0', color: '#1E293B' },
  success:   { background: '#10B981', color: '#fff' },
  warning:   { background: '#F59E0B', color: '#fff' },
  danger:    { background: '#EF4444', color: '#fff' },
  ghost:     { background: 'transparent', color: '#3B82F6', border: '1px solid #3B82F6' },
}

const sizes: Record<Size, React.CSSProperties> = {
  sm: { padding: '0.375rem 0.75rem', fontSize: '0.8rem' },
  md: { padding: '0.625rem 1.25rem', fontSize: '0.9rem' },
}

export function Button({
  variant = 'primary', size = 'md', loading, disabled, children, style, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        border: 'none',
        borderRadius: 8,
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      {...props}
    >
      {loading && <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
      {children}
    </button>
  )
}
