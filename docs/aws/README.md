# Serving Tibia74 client assets from AWS

O cliente HTML5 hospedado no Lovable (`public/client/`) precisa baixar
`Tibia.spr` (~9 MB) e `Tibia.dat` para desenhar sprites. Esses arquivos
**não ficam no repositório** — só no seu servidor AWS.

## Instalação

1. Copie os binários do Tibia 7.40 pra AWS:

   ```bash
   scp Tibia.spr Tibia.dat ubuntu@SEU_HOST:~/olddungeons/game-server/client/data/740/
   # (constants.json normalmente já vem no repo Tibia74-JS-Engine)
   ```

   > Se você já tem os arquivos em outro caminho, edite a constante `ROOT`
   > no topo de `assets-server.js`.

2. Copie `docs/aws/assets-server.js` para a AWS:

   ```bash
   scp docs/aws/assets-server.js ubuntu@SEU_HOST:~/olddungeons/game-server/
   ```

3. Suba com PM2 (roda ao lado do `olddungeons-engine`, na porta 2223):

   ```bash
   ssh ubuntu@SEU_HOST
   cd ~/olddungeons/game-server
   pm2 start assets-server.js --name olddungeons-assets --update-env
   pm2 save
   pm2 status
   ```

4. Teste local na AWS:

   ```bash
   curl -I http://127.0.0.1:2223/data/740/Tibia.dat
   # Espera: HTTP/1.1 200 OK + Access-Control-Allow-Origin
   ```

## Expor via HTTPS

O cliente é servido pelo Lovable em `https://`, então o browser exige
HTTPS pros assets também. Duas opções:

### Opção A — Caddy (recomendado, HTTPS automático)

Se `fibula.pro` já aponta para a AWS, adicione ao `/etc/caddy/Caddyfile`:

```
fibula.pro {
  reverse_proxy /data/* 127.0.0.1:2223
  reverse_proxy 127.0.0.1:2222
}
```

Depois: `sudo systemctl reload caddy`.

### Opção B — Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name fibula.pro;
  # ... ssl_certificate ...

  location /data/ {
    proxy_pass http://127.0.0.1:2223;
    proxy_set_header Host $host;
  }
  location / {
    proxy_pass http://127.0.0.1:2222;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## Verificar do navegador

```bash
curl -I https://fibula.pro/data/740/Tibia.dat \
  -H "Origin: https://retro-idle-forge.lovable.app"
```

Precisa retornar `200 OK` + `access-control-allow-origin: https://retro-idle-forge.lovable.app`.

Feito isso, abra `https://retro-idle-forge.lovable.app/play/<characterId>`
— os campos `Sprites` e `Objects` devem virar `Loaded` e o botão
"Enter Game" fica clicável (o `lovable-bootstrap.js` clica sozinho).
