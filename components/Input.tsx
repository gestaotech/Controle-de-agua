import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

const baseStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.15s',
}

export function Input({ label, error, style, ...props }: InputProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' }}>{label}</label>}
      <input
        style={{ ...baseStyle, borderColor: error ? '#EF4444' : '#E2E8F0', ...style } as React.CSSProperties}
        {...props}
      />
      {error && <span style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: 2 }}>{error}</span>}
    </div>
  )
}

export function Select({ label, error, children, style, ...props }: SelectProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' }}>{label}</label>}
      <select
        style={{ ...baseStyle, borderColor: error ? '#EF4444' : '#E2E8F0', ...style } as React.CSSProperties}
        {...props}
      >
        {children}
      </select>
      {error && <span style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: 2 }}>{error}</span>}
    </div>
  )
}

export function Textarea({ label, error, style, ...props }: TextareaProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ fontWeight: 500, color: '#64748B', fontSize: '0.85rem', marginBottom: 4, display: 'block' }}>{label}</label>}
      <textarea
        style={{ ...baseStyle, borderColor: error ? '#EF4444' : '#E2E8F0', resize: 'vertical', ...style } as React.CSSProperties}
        {...props}
      />
      {error && <span style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: 2 }}>{error}</span>}
    </div>
  )
}
