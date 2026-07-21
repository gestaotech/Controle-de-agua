import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAsaasCustomer, createAsaasPixPayment, getPixQrCode } from '@/lib/asaas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cobrancaId, existingPaymentId, unidadeId, unidadeEndereco, mes, valorTotal, vencimento } = body;

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

    let customerId = '';
    if (unidadeId) {
      const { data: unidade } = await supabase.from('unidades').select('asaas_customer_id, endereco').eq('id', unidadeId).single();
      customerId = unidade?.asaas_customer_id || '';
    }

    if (!customerId) {
      const customer = await createAsaasCustomer({
        name: unidadeEndereco || 'Cliente',
        cpfCnpj: '00000000000',
        externalReference: unidadeId || cobrancaId,
      });
      if (!customer?.id) {
        return NextResponse.json({ error: 'Erro ao criar cliente no Asaas' }, { status: 500 });
      }
      customerId = customer.id;
      if (unidadeId) {
        await supabase.from('unidades').update({ asaas_customer_id: customerId }).eq('id', unidadeId);
      }
    }

    const dueDate = vencimento || (() => {
      const d = new Date();
      d.setDate(d.getDate() + 10);
      return d.toISOString().split('T')[0];
    })();

    const payment = await createAsaasPixPayment({
      customer: customerId,
      value: valorTotal,
      dueDate,
      description: `Fatura Agua - ${mes} - ${unidadeEndereco || ''}`,
      externalReference: cobrancaId,
    });

    if (!payment?.id) {
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
