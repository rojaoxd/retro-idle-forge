# Página /auth — Login e Registro com Nome do Personagem

## Objetivo
Criar a rota pública `/auth` para autenticação no jogo. No registro, o jogador escolhe o **nome do personagem** (único).

## Banco de dados (migration)
Hoje não existe tabela de perfil/personagem. Criar:

**`public.profiles`**
- `id uuid PK` → referencia `auth.users(id)` on delete cascade
- `character_name text not null unique` (case-insensitive via índice `lower(character_name)`, 3–20 chars, regex `^[A-Za-z0-9_]+$`)
- `created_at`, `updated_at` + trigger

RLS:
- SELECT: `authenticated` pode ler seu próprio perfil (`id = auth.uid()`); admins leem tudo via `has_role`.
- INSERT/UPDATE: apenas o dono (`id = auth.uid()`).
- GRANT para `authenticated` e `service_role`.

Validação de nome (formato + tamanho) via **trigger** `BEFORE INSERT/UPDATE` (não CHECK, seguindo convenção do projeto).

## Rota `/auth` (`src/routes/auth.tsx`)
Pública, SSR default. Se já autenticado, redireciona para `/` (ou `search.redirect`).

UI com dois modos (tabs "Entrar" / "Criar conta"):

**Entrar**
- Campos: email, senha
- `supabase.auth.signInWithPassword`
- Após sucesso → `navigate({ to: search.redirect ?? "/" })`

**Criar conta**
- Campos: email, senha, **nome do personagem**
- Valida nome no cliente (zod: 3–20, `^[A-Za-z0-9_]+$`)
- `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })`
- Após sessão ativa, `insert` em `profiles { id: user.id, character_name }`
  - Se colidir (unique violation) → mostra erro "Nome já em uso" e permite reescolher (mantém sessão; usuário pode tentar de novo sem re-signup).
- Feedback via `toast` (sonner já usado no projeto).

Search param: `redirect?: string` (validado como path relativo).

## Integração com `/dev`
Fluxo atual já checa admin via `checkIsAdmin`. Sem mudanças além de:
- No topo do painel dev (ou em `dev.tsx`), se não autenticado, link para `/auth`.
- (Opcional, fora deste escopo) mover `/dev` para `_authenticated/` no futuro.

## Estilo
Reusar tokens dark/emerald já definidos em `src/styles.css`. Card centralizado, tabs shadcn, inputs shadcn, botão emerald.

## Metadata
`head()` com título "Entrar — Retro Idle Forge" e description curta; `robots: noindex`.

## Arquivos a criar/alterar
- **Migration**: tabela `profiles` + RLS + trigger de validação + trigger updated_at.
- **Novo**: `src/routes/auth.tsx`.
- (Sem alterações em server functions — signup/login usam o client Supabase no browser.)

## Fora de escopo
- Recuperação de senha (`/reset-password`).
- OAuth (Google/Apple).
- Múltiplos personagens por conta (1 conta = 1 personagem por enquanto).
- Auto-desbloquear/logout dentro do `/dev` (permanece como está).

Confirmar antes de implementar?
