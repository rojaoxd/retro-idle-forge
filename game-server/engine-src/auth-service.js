"use strict";

/*
 * auth-service.js  —  substituto do HMAC-token original.
 *
 * Valida tokens JWT emitidos pelo Supabase Auth (mesmo projeto que o site
 * usa). O cliente abre o WebSocket em `ws://host:2222/?token=<jwt>&characterId=<uuid>`
 * e este serviço:
 *   1. verifica a assinatura via JWKS remoto (cache automático via `jose`),
 *   2. retorna o `characterId` que a WS deve carregar, ou `null` se inválido.
 *
 * A interface original era síncrona (`authenticate(token) → name|null`).
 * Como o JWT precisa de I/O para validar, expomos AGORA como async — o
 * http-server foi patchado para `await` no upgrade.
 */

const { createRemoteJWKSet, jwtVerify } = require("jose");

const AuthService = function() {

  const jwksUrl = process.env[CONFIG.SUPABASE.JWKS_URL_ENV];
  if(!jwksUrl) {
    throw new Error("Missing env " + CONFIG.SUPABASE.JWKS_URL_ENV);
  }

  this.jwks = createRemoteJWKSet(new URL(jwksUrl));
  this.issuer = jwksUrl.replace(/\/auth\/v1\/\.well-known\/jwks\.json$/, "/auth/v1");
  console.log("AuthService: JWKS at %s", jwksUrl);

};

AuthService.prototype.authenticate = async function(token, characterId) {

  /*
   * Function AuthService.authenticate
   * Valida um JWT do Supabase e devolve o payload de sessão pronto para
   * o WebsocketServer carregar do banco.
   *
   * Retorna: { userId, characterId } | null
   */

  if(!token || !characterId) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, this.jwks, {
      // Supabase Auth assina como issuer <projeto>/auth/v1
      issuer: this.issuer,
    });

    if(!payload.sub) {
      return null;
    }

    return {
      userId: payload.sub,
      characterId: characterId,
      email: payload.email || null,
    };

  } catch(error) {
    console.warn("AuthService: token rejeitado —", error.message);
    return null;
  }

};

module.exports = AuthService;
