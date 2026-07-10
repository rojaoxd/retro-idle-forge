import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const nameSchema = z
  .string()
  .trim()
  .min(3, "Nome deve ter entre 3 e 20 caracteres")
  .max(20, "Nome deve ter entre 3 e 20 caracteres")
  .regex(/^[A-Za-z][A-Za-z ]*[A-Za-z]$/, "Apenas letras e espaços");

const vocationSchema = z.enum(["none", "knight", "paladin", "sorcerer", "druid"]);

export const listVocations = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await supabase
    .from("vocations_catalog")
    .select("id, label, description, hp_base, mana_base, cap_base")
    .order("hp_base", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listMyCharacters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("characters")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCharacter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("characters")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Personagem não encontrado");
    return row;
  });

export const createCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; vocation: string }) =>
    z.object({ name: nameSchema, vocation: vocationSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: voc, error: ve } = await context.supabase
      .from("vocations_catalog")
      .select("hp_base, mana_base, cap_base")
      .eq("id", data.vocation)
      .maybeSingle();
    if (ve) throw new Error(ve.message);
    if (!voc) throw new Error("Vocação inválida");

    const { data: inserted, error } = await context.supabase
      .from("characters")
      .insert({
        user_id: context.userId,
        name: data.name,
        vocation: data.vocation,
        hp: voc.hp_base,
        hp_max: voc.hp_base,
        mana: voc.mana_base,
        mana_max: voc.mana_base,
        cap: voc.cap_base,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um personagem com esse nome");
      throw new Error(error.message);
    }
    return inserted;
  });

export const deleteCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("characters")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
