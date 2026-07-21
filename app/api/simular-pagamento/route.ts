import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    if (process.env.ASAAS_ENVIRONMENT !== 'sandbox') {
      return NextResponse.json({ error: 'Disponível apenas em ambiente sandbox' }, { status: 400 });
    }

    const { paymentId } = await req.json() as { paymentId: string };
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId é obrigatório' }, { status: 400 });
    }

    const res = await fetch(
      `https://api-sandbox.asaas.com/v3/payments/${paymentId}/confirmPayment`,
      {
        method: 'POST',
        headers: {
          'access_token': process.env.ASAAS_API_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );

    const body = await res.text();
    if (!res.ok) {
      let msg = `Erro ao simular: ${res.status}`;
      try { const j = JSON.parse(body); msg = j.errors?.[0]?.description || msg; } catch {}
      throw new Error(msg);
    }

    return NextResponse.json({ sucesso: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao simular pagamento' }, { status: 500 });
  }
}
