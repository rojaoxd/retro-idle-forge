"use strict";

/*
 * account-database.js  —  substituto do AccountDatabase original (SQLite).
 *
 * Mantém a MESMA interface pública que o engine espera:
 *   - getCharacter(session, callback)  → callback(err, { character: JSON })
 *   - saveCharacter(gameSocket, callback)
 *   - close()
 *
 * Diferença: em vez de SQLite local, lê/escreve na tabela `characters`
 * do Supabase (mesmo banco que o site usa). O JSON completo do engine
 * fica no campo jsonb `engine_data`; colunas de resumo (level, HP, pos)
 * são atualizadas junto para exibição rápida no site e na /dev.
 *
 * A `session` recebida em getCharacter vem do AuthService (JWT já validado):
 *   { userId, characterId, email }
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const AccountDatabase = function() {

  const url = process.env[CONFIG.SUPABASE.URL_ENV];
  const key = process.env[CONFIG.SUPABASE.SERVICE_ROLE_KEY_ENV];

  if(!url || !key) {
    throw new Error(
      "Missing env " + CONFIG.SUPABASE.URL_ENV + " / " + CONFIG.SUPABASE.SERVICE_ROLE_KEY_ENV
    );
  }

  this.client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application": "olddungeons-engine" } },
  });

  // Template de personagem novo (para engine_data == '{}') — carregado uma vez.
  const templatePath = path.join(__dirname, "..", "data", CONFIG.SERVER.CLIENT_VERSION, "characters", "account-template.json");
  try {
    this.template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  } catch(e) {
    console.warn("AccountDatabase: template não encontrado em %s", templatePath);
    this.template = {};
  }

  console.log("AccountDatabase: conectado ao Supabase (%s)", url);

};

/*
 * getCharacter(session, callback)
 * Aceita a sessão validada pelo AuthService: { userId, characterId }.
 * Retorna { character: <JSON completo do engine> } — encaixa direto no
 * websocket-server: `JSON.parse(result.character)`.
 */
AccountDatabase.prototype.getCharacter = function(session, callback) {

  this.client
    .from("characters")
    .select("*")
    .eq("id", session.characterId)
    .eq("user_id", session.userId)
    .maybeSingle()
    .then(({ data: row, error }) => {

      if(error) {
        return callback(new Error(error.message));
      }
      if(!row) {
        return callback(new Error("Personagem não encontrado para este usuário."));
      }

      // Se ainda não tem estado do engine salvo, materializa a partir do template
      // + colunas resumo (level/HP/pos) para o primeiro login.
      let character;
      if(row.engine_data && Object.keys(row.engine_data).length > 0) {
        character = row.engine_data;
      } else {
        character = this.__seedCharacterFromRow(row);
      }

      // O engine espera esse envelope: { character: "<JSON string>" }
      return callback(null, { character: JSON.stringify(character) });

    }).catch((e) => callback(e));

};

/*
 * saveCharacter(gameSocket, callback)
 * Serializa gameSocket.player e persiste no Supabase.
 */
AccountDatabase.prototype.saveCharacter = function(gameSocket, callback) {

  const engineData = JSON.parse(JSON.stringify(gameSocket.player));

  // Extrai colunas resumo para consulta rápida (site / /dev / RLS)
  const summary = this.__extractSummary(engineData);

  this.client
    .from("characters")
    .update({
      engine_data: engineData,
      ...summary,
      last_login_at: new Date().toISOString(),
    })
    .eq("id", gameSocket.characterId)
    .then(({ error }) => {
      if(error) return callback(new Error(error.message));
      return callback(null);
    }).catch((e) => callback(e));

};

AccountDatabase.prototype.close = function() {
  // Cliente HTTP do Supabase — sem conexão persistente a fechar.
  console.log("AccountDatabase: closed.");
};

// ---------------------------------------------------------------------------
// helpers privados

AccountDatabase.prototype.__seedCharacterFromRow = function(row) {

  /*
   * Materializa o JSON esperado pelo engine a partir das colunas resumo
   * quando o personagem ainda não tem engine_data (primeiro login pós-criação).
   */

  const t = JSON.parse(JSON.stringify(this.template));
  if(!t.creatureStatistics) t.creatureStatistics = {};
  if(!t.characterStatistics) t.characterStatistics = {};

  t.creatureStatistics.name = row.name;
  t.creatureStatistics.health = row.health;
  t.creatureStatistics.maxHealth = row.health_max;
  t.creatureStatistics.direction = row.direction;
  t.creatureStatistics.outfit = row.outfit || t.creatureStatistics.outfit;

  t.characterStatistics.position = { x: row.pos_x, y: row.pos_y, z: row.pos_z };
  t.characterStatistics.level = row.level;
  t.characterStatistics.experience = Number(row.experience) || 0;
  t.characterStatistics.sex = row.sex === "female" ? 1 : 0;
  t.characterStatistics.maxCapacity = row.capacity;
  t.characterStatistics.vocation = row.vocation;

  t.mana = row.mana;
  t.maxMana = row.mana_max;

  return t;

};

AccountDatabase.prototype.__extractSummary = function(character) {

  const cs = character.characterStatistics || {};
  const cr = character.creatureStatistics || {};
  const pos = cs.position || {};

  return {
    level: cs.level ?? 1,
    experience: cs.experience ?? 0,
    health: cr.health ?? 100,
    health_max: cr.maxHealth ?? 100,
    mana: character.mana ?? 0,
    mana_max: character.maxMana ?? 0,
    capacity: cs.maxCapacity ?? 400,
    pos_x: pos.x ?? 32097,
    pos_y: pos.y ?? 32219,
    pos_z: pos.z ?? 7,
    direction: cr.direction ?? 2,
    outfit: cr.outfit ?? {},
  };

};

module.exports = AccountDatabase;
