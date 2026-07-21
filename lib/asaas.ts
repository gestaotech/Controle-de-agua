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

  const body = await res.text();

  if (!res.ok) {
    let msg = `Asaas API error: ${res.status}`;
    try { const j = JSON.parse(body); msg = j.errors?.[0]?.description || msg; } catch {}
    throw new Error(msg);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Asaas retornou HTML em vez de JSON (status ${res.status}). URL: ${ASAAS_BASE}${path}. Key termina com: ...${ASAAS_KEY.slice(-8)}`);
  }
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

export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}
