# Limpeza total do banco Supabase

O projeto Supabase `OLDDUNGEONS` hoje contém 29 tabelas, várias funções (`has_role`, `consume_tokens`, `redeem_serial_key`, etc.), tipos enum, buckets de storage e usuários cadastrados — tudo herdado de outro projeto. Vamos zerar para começar limpo o MMORPG.

## O que será apagado

- **Todas as tabelas** do schema `public` (profiles, user_roles, chat_messages, serial_keys, tool_*, nano_*, claude_*, flow_veo_*, grok_*, library_*, cakto_transactions, system_settings, user_limits, user_usage, ai_usage_logs, etc.) com `CASCADE`
- **Todas as views e materialized views** do `public`
- **Todas as funções** do `public` (has_role, handle_new_user, consume_tokens, consume_brl, redeem_serial_key, get_user_effective_limits, update_updated_at_column, etc.)
- **Todos os tipos/enums** do `public` (app_role, limit_rank, etc.)
- Trigger `on_auth_user_created` em `auth.users`, se existir
- **Todos os usuários** cadastrados (`auth.users` → cascata em identities/sessions)

## O que **NÃO** será tocado

- Schemas gerenciados pelo Supabase (`auth`, `storage`, `realtime`, `vault`, `supabase_functions`) — apenas o trigger custom em `auth.users` é removido
- Secrets do projeto (LOVABLE_API_KEY, SUPABASE_*, etc.)
- Buckets de storage existentes ficam vazios mas preservados; se quiser removê-los também, me avise
- Código do front-end (game shell já implementado permanece intacto)

## Após a limpeza

- `src/integrations/supabase/types.ts` será regenerado automaticamente e ficará praticamente vazio
- Ficamos prontos para desenhar o schema do novo MMORPG (personagens, inventário, party, chat, etc.) do zero

## Detalhes técnicos

Uma única migration executa `DROP` em loop sobre `pg_tables`, `pg_views`, `pg_matviews`, `pg_proc` e `pg_type` filtrando por `nspname='public'`, depois `DELETE FROM auth.users`. Operação **destrutiva e irreversível**.

Sobre o erro de build citado: uma execução anterior de `bun run build:dev` já concluiu com sucesso (exit 0) após o ajuste de formatação de números no `CurrencyDisplay`. Não há mudanças de código nesta etapa — apenas SQL.

Confirma que posso executar a limpeza destrutiva?