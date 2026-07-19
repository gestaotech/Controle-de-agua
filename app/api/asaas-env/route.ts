import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    environment: process.env.ASAAS_ENVIRONMENT || 'sandbox',
  });
}
