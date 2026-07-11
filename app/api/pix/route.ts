import { NextRequest, NextResponse } from 'next/server';
import { createAsaasCustomer, createAsaasPixPayment, getPixQrCode } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cobrancaId, existingPaymentId, unidadeEndereco, mes, valorTotal, vencimento, empresa } = body;

    if (!cobrancaId) {
      return NextResponse.json({ error: 'cobrancaId é obrigatório' }, { status: 400 });
    }

    if (!process.env.ASAAS_API_KEY) {
      return NextResponse.json({ error: 'Chave API do Asaas não configurada' }, { status: 500 });
    }

    if (existingPaymentId) {
      const pixQrCode = await getPixQrCode(existingPaymentId);
      if (!pixQrCode.encodedImage) {
        return NextResponse.json({ error: 'QR Code não disponível para esta cobrança' }, { status: 404 });
      }
      return NextResponse.json({
        paymentId: existingPaymentId,
        qrCodeBase64: pixQrCode.encodedImage,
        pixPayload: pixQrCode.payload,
        expirationDate: pixQrCode.expirationDate,
      });
    }

    if (!valorTotal || valorTotal <= 0) {
      return NextResponse.json({ error: 'Valor total inválido' }, { status: 400 });
    }

    const customer = await createAsaasCustomer({
      name: unidadeEndereco || 'Cliente',
      externalReference: cobrancaId,
    });

    if (!customer || !customer.id) {
      return NextResponse.json({ error: 'Erro ao criar cliente no Asaas' }, { status: 500 });
    }

    const dueDate = vencimento || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 10);
      return d.toISOString().split('T')[0];
    })();

    const payment = await createAsaasPixPayment({
      customer: customer.id,
      value: valorTotal,
      dueDate,
      description: `Fatura Agua - ${mes} - ${unidadeEndereco || ''}`,
      externalReference: cobrancaId,
    });

    if (!payment || !payment.id) {
      return NextResponse.json({ error: 'Erro ao criar cobrança no Asaas' }, { status: 500 });
    }

    const pixQrCode = await getPixQrCode(payment.id);

    if (!pixQrCode.encodedImage) {
      return NextResponse.json({ error: 'QR Code não disponível' }, { status: 500 });
    }

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
