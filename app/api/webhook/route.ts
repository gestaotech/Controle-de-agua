import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('access_token');
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (expectedToken && token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const event = body.event;
    const payment = body.payment;

    if (!event || !payment) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const allowedEvents = [
      'PAYMENT_RECEIVED',
      'PAYMENT_UPDATED',
      'PAYMENT_OVERDUE',
      'PAYMENT_DELETED',
      'PAYMENT_REFUNDED',
    ];

    if (!allowedEvents.includes(event)) {
      return NextResponse.json({ received: true });
    }

    const externalRef = payment.externalReference;

    if (!externalRef) {
      return NextResponse.json({ received: true });
    }

    let status = 'pendente';
    if (event === 'PAYMENT_RECEIVED' || payment.status === 'RECEIVED') {
      status = 'pago';
    } else if (event === 'PAYMENT_OVERDUE' || payment.status === 'OVERDUE') {
      status = 'atrasado';
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      status = 'pendente';
    }

    const { error } = await supabase
      .from('cobrancas')
      .update({ status })
      .eq('id', externalRef);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
