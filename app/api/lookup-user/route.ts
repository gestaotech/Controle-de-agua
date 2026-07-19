import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { email } = (await request.json()) as { email: string };
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  const users = (data?.users || []) as { id: string; email: string }[];
  const user = users.find(u => u.email === email);
  return NextResponse.json({ id: user?.id || null });
}
