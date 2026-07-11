/**
 * Lovable bootstrap for the vendor Tibia74 client.
 *
 * Runs after all vendor scripts. Reads session/config from location.hash,
 * bypasses the vendor's account+password login (we use Supabase JWT), and
 * points asset/WS URLs at the game server (may be a different origin than
 * the Lovable-hosted static client).
 *
 * Hash format: #token=JWT&cid=CHAR_UUID&host=game.example.com:1337&assets=https://assets.example.com
 */
(function () {
  function parseHash() {
    var out = {};
    var h = (location.hash || "").replace(/^#/, "");
    if (!h) return out;
    h.split("&").forEach(function (kv) {
      var i = kv.indexOf("=");
      if (i < 0) return;
      out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1));
    });
    return out;
  }

  var cfg = parseHash();
  if (!cfg.token || !cfg.cid || !cfg.host) {
    console.warn("[lovable] missing token/cid/host in hash; vendor login flow left intact");
    return;
  }

  var assetsBase = cfg.assets || ("//" + cfg.host);

  // Intercept /data/740/Tibia.spr etc. to load from the game-server host.
  var _fetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === "string" && input.indexOf("/data/740/") === 0) {
      return _fetch(assetsBase + input, init);
    }
    return _fetch(input, init);
  };

  function waitFor(fn, cb, tries) {
    tries = tries || 0;
    if (fn()) return cb();
    if (tries > 200) return console.error("[lovable] boot timeout");
    setTimeout(function () { waitFor(fn, cb, tries + 1); }, 50);
  }

  waitFor(
    function () { return window.gameClient && window.NetworkManager && window.NetworkManager.prototype.connect; },
    function () {
      // Force host field so getConnectionSettings() returns our WS host.
      var hostInput = document.getElementById("host");
      if (hostInput) hostInput.value = cfg.host;

      // Replace connect() with a JWT-based handshake; the engine websocket
      // upgrade handler already accepts ?token=...&characterId=...
      NetworkManager.prototype.connect = function () {
        var wsProto = location.protocol === "https:" ? "wss:" : "ws:";
        var url = wsProto + "//" + cfg.host + "/?token=" + encodeURIComponent(cfg.token) + "&characterId=" + encodeURIComponent(cfg.cid);
        try {
          this.socket = new WebSocket(url);
          this.socket.binaryType = "arraybuffer";
          this.socket.onopen = this.__handleConnection.bind(this);
          this.socket.onmessage = this.__handlePacket.bind(this);
          this.socket.onclose = this.__handleClose.bind(this);
          this.socket.onerror = this.__handleError.bind(this);
        } catch (err) {
          console.error("[lovable] ws open failed", err);
        }
      };

      // Auto-click "Enter Gameworld" as soon as it's enabled (assets loaded).
      var btn = document.getElementById("enter-game");
      if (btn) {
        var iv = setInterval(function () {
          if (!btn.disabled) {
            clearInterval(iv);
            btn.click();
          }
        }, 250);
      }
    }
  );
})();
