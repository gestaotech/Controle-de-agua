type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'secondary'

interface BadgeProps {
  variant: BadgeVariant
  children: string
}

const colors: Record<BadgeVariant, { bg: string; color: string }> = {
  success:   { bg: '#D1FAE5', color: '#065F46' },
  danger:    { bg: '#FEE2E2', color: '#991B1B' },
  warning:   { bg: '#FEF3C7', color: '#92400E' },
  info:      { bg: '#CFFAFE', color: '#155E75' },
  secondary: { bg: '#F1F5F9', color: '#475569' },
}

export function Badge({ variant, children }: BadgeProps) {
  const c = colors[variant]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 500,
        background: c.bg,
        color: c.color,
      }}
    >
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    pago: 'success',
    atrasado: 'danger',
    pendente: 'warning',
    ativo: 'success',
    inativo: 'secondary',
  }
  return <Badge variant={map[status] || 'secondary'}>{status}</Badge>
}
