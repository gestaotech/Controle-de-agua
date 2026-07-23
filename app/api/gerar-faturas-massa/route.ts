import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const { bairro_id, mes } = await req.json()
    if (!bairro_id || !mes) {
      return NextResponse.json({ error: 'bairro_id e mes são obrigatórios' }, { status: 400 })
    }

    const { data: config } = await supabase.from('config').select('valor_m3, taxa_fixa').limit(1)
    const valor_m3 = Number(config?.[0]?.valor_m3 || 8.50)
    const taxa_fixa = Number(config?.[0]?.taxa_fixa || 15.00)

    const { data: unidades } = await supabase
      .from('unidades').select('id').eq('bairro_id', bairro_id).eq('status', 'ativo')

    if (!unidades?.length) {
      return NextResponse.json({ error: 'Nenhuma unidade ativa encontrada neste bairro' }, { status: 400 })
    }

    const { data: leituras } = await supabase
      .from('leituras').select('unidade_id, consumo, usuario_id')
      .in('unidade_id', unidades.map(u => u.id))
      .eq('mes', mes)

    if (!leituras?.length) {
      return NextResponse.json({ error: 'Nenhuma leitura encontrada para este mês' }, { status: 400 })
    }

    const { data: existentes } = await supabase
      .from('cobrancas').select('unidade_id, mes')
      .in('unidade_id', unidades.map(u => u.id))
      .eq('mes', mes)

    const existentesSet = new Set((existentes || []).map(e => e.unidade_id))

    const vencimento = new Date()
    vencimento.setDate(vencimento.getDate() + 10)
    const vencStr = vencimento.toISOString().split('T')[0]

    let criadas = 0
    let ja_existentes = 0

    for (const leitura of leituras) {
      if (existentesSet.has(leitura.unidade_id)) {
        ja_existentes++
        continue
      }

      const valorTotal = Number(leitura.consumo) * valor_m3 + taxa_fixa

      const { error } = await supabase.from('cobrancas').insert({
        unidade_id: leitura.unidade_id,
        mes,
        consumo: leitura.consumo,
        valor_m3,
        taxa_fixa,
        valor_total: valorTotal,
        vencimento: vencStr,
        status: 'pendente',
        usuario_id: leitura.usuario_id,
      })

      if (error) {
        if (error.code === '23505') { ja_existentes++; continue }
        throw error
      }
      criadas++
    }

    return NextResponse.json({ criadas, ja_existentes })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao gerar faturas' }, { status: 500 })
  }
}
