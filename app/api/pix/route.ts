import { NextRequest, NextResponse } from 'next/server';
import { createAsaasCustomer, createAsaasPixPayment, getPixQrCode } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cobrancaId, unidadeEndereco, unidadeHidrometro, mes, valorTotal, vencimento, empresa, clienteNome } = body;

    if (!cobrancaId || !valorTotal || !mes) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 });
    }

    if (!process.env.ASAAS_API_KEY) {
      return NextResponse.json({ error: 'Chave API do Asaas não configurada' }, { status: 500 });
    }

    const customer = await createAsaasCustomer({
      name: clienteNome || unidadeEndereco || 'Cliente',
      externalReference: cobrancaId,
    });

    const dueDate = vencimento || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 10);
      return d.toISOString().split('T')[0];
    })();

    const payment = await createAsaasPixPayment({
      customer: customer.id,
      value: valorTotal,
      dueDate,
      description: `Fatura Água - ${mes} - ${unidadeEndereco || ''}`,
      externalReference: cobrancaId,
    });

    const pixQrCode = await getPixQrCode(payment.id);

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      qrCodeBase64: pixQrCode.encodedImage,
      pixPayload: pixQrCode.payload,
      expirationDate: pixQrCode.expirationDate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao gerar PIX' }, { status: 500 });
  }
}
