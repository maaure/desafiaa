# Deploy

Produção: **https://desafia.fun** na VPS `ubuntu@80.190.81.6`, em `/opt/desafia`.

A aplicação é toda containerizada. O HTTPS fica com o **Caddy compartilhado da VPS** (`/opt/caddy`, também em container), que alcança os containers pela rede Docker externa `web`. Nenhuma porta do projeto é publicada no host.

## Arquitetura

| Componente           | Container          | Rede             |
| -------------------- | ------------------ | ---------------- |
| PostgreSQL           | `desafia-db`       | interna          |
| Redis                | `desafia-redis`    | interna          |
| API (Fastify + WS)   | `desafia-api:3000` | interna + `web`  |
| Frontend (SvelteKit) | `desafia-frontend:3001` | `web`       |
| Proxy + SSL          | `caddy` (`/opt/caddy`) | `web`        |

Roteamento (`desafia.caddy`): `/api/*`, `/socket.io/*`, `/uploads/*` → API; resto → frontend; `www` redireciona para o domínio raiz. O Caddy emite e renova o certificado Let's Encrypt sozinho.

## Primeiro deploy

Pré-requisitos na VPS: Docker, a rede `web` e o Caddy compartilhado rodando (ver `/opt/caddy/README.md`). DNS (registro A) de `desafia.fun` e `www` apontando para a VPS.

```bash
# da máquina local, na raiz do repo
ssh ubuntu@80.190.81.6 'sudo mkdir -p /opt/desafia && sudo chown ubuntu: /opt/desafia'
git ls-files | rsync -az --files-from=- . ubuntu@80.190.81.6:/opt/desafia/

# na VPS
cd /opt/desafia/backend
umask 077; cat > .env <<EOF
DB_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com
EOF
docker compose up --build -d

cp /opt/desafia/desafia.caddy /opt/caddy/sites/desafia.caddy
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

> **`DB_PASSWORD`** só vale na criação do volume. Trocar depois exige recriar o volume (perde dados).
>
> **`GOOGLE_CLIENT_ID`** entra no bundle do frontend em build-time: se mudar, rode `docker compose up --build -d`. O cliente OAuth precisa ter `https://desafia.fun` em "Origens JavaScript autorizadas".

As migrations rodam automaticamente no entrypoint da API.

## Atualizar (nova versão)

```bash
# da máquina local, na raiz do repo
git ls-files | rsync -az --files-from=- . ubuntu@80.190.81.6:/opt/desafia/
ssh ubuntu@80.190.81.6 'cd /opt/desafia/backend && docker compose up --build -d'
```

Se `desafia.caddy` mudou, copie de novo para `/opt/caddy/sites/` e recarregue o Caddy.

## Comandos úteis (na VPS, em `/opt/desafia/backend`)

```bash
docker compose ps                # status
docker compose logs -f app       # logs da API
docker compose logs -f frontend  # logs do frontend
docker compose restart app       # reinicia só a API
docker compose down              # para tudo (dados persistem)
docker compose down -v           # DESTRÓI tudo (banco + uploads)
docker logs -f caddy             # logs do proxy / certificados
docker exec -it desafia-db psql -U quiz quizplatform   # psql
```

## Troubleshooting

- **API não sobe:** `docker compose logs app | head -30` — geralmente variável ausente/inválida no `.env`.
- **502 no site:** o container caiu ou não está na rede `web` — `docker network inspect web`.
- **Certificado não sai:** DNS ainda não propagou — `docker logs caddy | grep desafia`. O Caddy tenta de novo sozinho.
