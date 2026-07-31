# Escopo do Projeto — Sistema de Controle de Água

## 1. Objetivo
Sistema web para gerenciamento do consumo de água e emissão de faturas de bairros/condomínios. Controla leituras de hidrômetro, calcula tarifas (água + esgoto + taxa fixa), gera faturas mensais e disponibiliza cobrança via PIX. Destinado ao uso pelo responsável (admin) e leitores que fazem as leituras em campo.

## 2. Usuários e Perfis

| Perfil | Acesso |
|---|---|
| **Admin** (primeira conta criada) | Painel completo: dashboard, bairros, unidades, leitores, config, geração de faturas em massa |
| **Leitor** | Painel simplificado: registrar leituras, consultar faturas do mês, emitir PIX, editar próprio perfil |

- Cadastro/autenticação por nome + senha; e-mail é derivado automaticamente do nome (`nome@controle-agua.app`).
- A primeira conta criada vira **admin**; admin cadastra os leitores.
- Login de usuário sem perfil recria automaticamente o perfil como admin.

## 3. Escopo Funcional

### 3.1 Administração (dashboard)
- Dashboard com estatísticas: total de unidades, ativas, faturas pendentes, pagas, leitores ativos.
- Lista das últimas faturas com filtro por status (pendente / pago / atrasado).
- **Geração de faturas em massa**: seleciona bairro + mês; cria faturas para todas as unidades com leitura no mês e sem fatura.
- Realtime: dashboard atualiza sozinho quando há mudanças em unidades/cobranças.

### 3.2 Bairros / Condomínios
- CRUD de bairros (nome, ativo).
- **Limite de 2 bairros** no total — ao tentar criar o 3º, exibe: "Limite de memoria atingido, contate o suporte."
- Bloqueio também garantido no banco (trigger).

### 3.3 Unidades
- CRUD de unidades: endereço, nº do hidrômetro, bairro, leitura inicial, status (ativo/inativo).
- **Limite de 500 unidades por bairro** — mesma mensagem de alerta.
- Bloqueio também garantido no banco (trigger).

### 3.4 Leituras (leitor)
- Registro mensal por unidade: leitura atual, mês de referência, consumidor responsável.
- Leitura anterior preenchida automaticamente (última leitura ou leitura inicial).
- Consumo calculado automaticamente (`atual - anterior`).
- Uma leitura por unidade/mês (única).
- Realtime para atualização em vários dispositivos.

### 3.5 Faturas e Tarifas
- Fatura mensal por unidade/mês (única), com:
  - Consumo (m³), valor do m³, taxa de esgoto por m³, taxa fixa, **valor total**.
  - Cálculo: `consumo × valor_m³ + consumo × taxa_esgoto + taxa_fixa`.
- Tarifas configuráveis pelo admin (valor m³, taxa esgoto m³, taxa fixa).
- Valores tarifários gravados na fatura no momento da geração (histórico preservado).
- Status: pendente → pago (via webhook do Asaas) ou atrasado.
- Modal da fatura com detalhamento: água, esgoto, taxa fixa, total.

### 3.6 Pagamento PIX (Asaas)
- Gera QR Code PIX para a fatura com valor e vencimento.
- Em produção, usa **API real do Asaas** com um único cliente criado com o **CPF/CNPJ do responsável** (`ASAAS_CUSTOMER_CPF`) — sem cadastro de CPF por morador.
- Cliente Asaas é criado por unidade (nome = endereço da unidade) e reutilizado.
- Webhook do Asaas atualiza automaticamente o status da cobrança (pago/atrasado/pendente).
- Endpoint de simulação de pagamento **somente em sandbox**.

### 3.7 Configuração
- Dados da empresa (nome, CNPJ, contato) e tarifas (m³, esgoto, taxa fixa).

## 4. Fora de Escopo
- Upload de foto por leitura/unidade (revertido — fora do escopo).
- Cadastro de CPF/CNPJ por unidade/morador.
- Emissão de boleto (somente PIX).
- Recursos de marketing, relatórios avançados, exportação de dados.
- App mobile nativo (sistema é responsivo via navegador).

## 5. Tecnologias
- **Frontend/Backend**: Next.js 14.2.5 (App Router), React 18, TypeScript.
- **Banco/Auth**: Supabase (PostgreSQL, Auth, RLS, Realtime).
- **Pagamentos**: Asaas API v3 (PIX), webhooks.
- **QR Code**: `qrcode.react` (payload PIX copia-e-cola).
- **Deploy**: Vercel.
- **Testes**: Vitest + Testing Library (42 testes dos componentes).

## 6. Arquitetura
- **Supabase** (banco, autenticação, RLS):
  - Tabelas: `bairros`, `unidades`, `leituras`, `cobrancas`, `config`, `perfis`.
  - RLS: admin controla tudo; leitor vê tudo, insere/edita apenas o que é dele (leituras).
  - Triggers de limite (2 bairros, 500 unidades/bairro).
  - Realtime habilitado para leituras, unidades, cobranças, bairros e perfis.
- **API Routes** (Next.js):
  - `/api/pix` — cria cliente/pagamento no Asaas e retorna QR Code.
  - `/api/webhook` — recebe eventos do Asaas e atualiza status da cobrança (validado por token).
  - `/api/gerar-faturas-massa` — gera faturas de um bairro/mês (service role).
  - `/api/simular-pagamento` — confirmação de pagamento (apenas sandbox).
  - `/api/asaas-env` e `/api/lookup-user` — utilitários.
- **middleware.ts** — proteção de rotas autenticadas.
- **lib/asaas.ts** — cliente Asaas (base URL conforme ambiente: `sandbox` → `api-sandbox.asaas.com`, `production` → `api.asaas.com`).

## 7. Variáveis de Ambiente
| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (API routes) |
| `ASAAS_API_KEY` | Chave de API do Asaas |
| `ASAAS_ENVIRONMENT` | `sandbox` ou `production` |
| `ASAAS_WEBHOOK_TOKEN` | Token de validação do webhook |
| `ASAAS_CUSTOMER_CPF` | CPF/CNPJ do responsável (obrigatório em produção) |

## 8. Limites e Regras de Negócio
- Máximo **2 bairros** cadastrados.
- Máximo **500 unidades por bairro**.
- Uma leitura e uma fatura por unidade/mês (unicidade).
- Fatura só é gerada se existir leitura no mês; faturas existentes não são duplicadas.
- Vencimento padrão: data informada ou +10 dias.
- Em produção, CPF do cliente Asaas deve ser válido (validação da própria Asaas).

## 9. Fases / Situação Atual
1. ✅ Núcleo (auth, bairros, unidades, leituras, faturas, dashboard) — implementado.
2. ✅ Integração Asaas sandbox (PIX + webhook + simulação).
3. ✅ Taxa de esgoto, limites de bairros/unidades, testes automatizados.
4. ✅ Preparação para produção (CPF via env, proteção sandbox).
5. 🔄 Em andamento: criação da conta Asaas do cliente e ativação de produção (trocar `ASAAS_API_KEY`, `ASAAS_ENVIRONMENT=production`, registrar webhook, preencher `ASAAS_CUSTOMER_CPF`).

## 10. Entregas
- Código-fonte no GitHub (repo atual).
- App deployado na Vercel.
- Banco Supabase (schema em `supabase/schema.sql`).
- Documentação de setup (este escopo + instruções de variáveis).
