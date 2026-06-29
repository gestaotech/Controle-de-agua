export function formatCurrency(value: number): string {
  return 'R$ ' + value.toFixed(2).replace('.', ',');
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

export function formatMonthYear(monthStr: string): string {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[parseInt(month) - 1] + '/' + year;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0');
}

export function generateCode(): string {
  return 'AG' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();
}

export function generateBarcodeNumber(code: string): string {
  return code.replace(/[^0-9]/g, '').padStart(20, '0');
}
