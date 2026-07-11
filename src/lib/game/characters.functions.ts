import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const nameSchema = z
  .string()
  .trim()
  .min(3, "Nome deve ter entre 3 e 20 caracteres")
  .max(20, "Nome deve ter entre 3 e 20 caracteres")
  .regex(/^[A-Za-z][A-Za-z ]*[A-Za-z]$/, "Apenas letras e espaços");

/**
 * Vocações do Tibia 7.4 (fixas, iguais ao engine).
 * IDs seguem o padrão do engine (0..4).
 */
export const VOCATIONS = [
  { id: 0, key: "none",     label: "None",     hp: 150, mana: 0,   cap: 400, description: "Sem vocação — HP alto, sem magias." },
  { id: 1, key: "sorcerer", label: "Sorcerer", hp: 130, mana: 60,  cap: 390, description: "Mago ofensivo — dano mágico alto." },
  { id: 2, key: "druid",    label: "Druid",    hp: 130, mana: 60,  cap: 390, description: "Mago de suporte — cura e natureza." },
  { id: 3, key: "paladin",  label: "Paladin",  hp: 140, mana: 45,  cap: 410, description: "Combate à distância — arco e balestra." },
  { id: 4, key: "knight",   label: "Knight",   hp: 160, mana: 15,  cap: 470, description: "Corpo-a-corpo — tank do time." },
] as const;

const vocationSchema = z.enum(["none", "sorcerer", "druid", "paladin", "knight"]);

export const listVocations = createServerFn({ method: "GET" }).handler(async () => {
  return VOCATIONS.map((v) => ({
    id: v.key,
    label: v.label,
    description: v.description,
    hp_base: v.hp,
    mana_base: v.mana,
    cap_base: v.cap,
  }));
});

export const listMyCharacters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("characters")
      .select("id, name, vocation, level, experience, health, health_max, mana, mana_max, pos_x, pos_y, pos_z, last_login_at, online")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
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
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createCharacter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; vocation: string }) =>
    z.object({ name: nameSchema, vocation: vocationSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const voc = VOCATIONS.find((v) => v.key === data.vocation);
    if (!voc) throw new Error("Vocação inválida");

    const { data: inserted, error } = await context.supabase
      .from("characters")
      .insert({
        user_id: context.userId,
        name: data.name,
        vocation: voc.id,
        health: voc.hp,
        health_max: voc.hp,
        mana: voc.mana,
        mana_max: voc.mana,
        capacity: voc.cap,
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
