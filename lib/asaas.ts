const ASAAS_BASE = process.env.ASAAS_ENVIRONMENT === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/v3';

const ASAAS_KEY = process.env.ASAAS_API_KEY || '';

interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
}

interface AsaasPayment {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  status: string;
  dueDate: string;
  description: string;
  externalReference: string;
}

interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

async function asaasFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...options,
    headers: {
      'access_token': ASAAS_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.errors?.[0]?.description || `Asaas API error: ${res.status}`);
  }

  return res.json();
}

export async function createAsaasCustomer(data: {
  name: string;
  cpfCnpj?: string;
  email?: string;
  mobilePhone?: string;
  externalReference?: string;
}): Promise<AsaasCustomer> {
  return asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      cpfCnpj: data.cpfCnpj || '',
      email: data.email || '',
      mobilePhone: data.mobilePhone || '',
      externalReference: data.externalReference || '',
      notificationDisabled: true,
    }),
  });
}

export async function createAsaasPixPayment(data: {
  customer: string;
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
}): Promise<AsaasPayment> {
  return asaasFetch('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: data.customer,
      billingType: 'PIX',
      value: data.value,
      dueDate: data.dueDate,
      description: data.description,
      externalReference: data.externalReference || '',
    }),
  });
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasFetch(`/payments/${paymentId}/pixQrCode`);
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasFetch(`/payments/${paymentId}`);
}

export function verifyWebhookSignature(access_token: string): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN || '';
  if (!expected) return true;
  return access_token === expected;
}

export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
