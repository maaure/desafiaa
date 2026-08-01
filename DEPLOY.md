# Deploy

A aplicação é toda containerizada — o host só precisa de Docker e de um proxy reverso com SSL. O build acontece dentro dos containers.

## Arquitetura

| Componente          | Onde roda                          |
| ------------------- | ---------------------------------- |
| PostgreSQL, Redis   | Containers (Docker Compose)        |
| API (Fastify+WS)    | Container, porta **3100** no host  |
| Frontend (SvelteKit)| Container, porta **3001** no host  |
| Proxy + SSL         | Caddy no host (fora dos containers)|

As portas publicadas no host são definidas no `ports:` do `backend/docker-compose.yml` — se ajustar, atualize também os `reverse_proxy` do Caddy.

## Pré-requisitos no host

- Docker + Docker Compose
- Caddy instalado (`apt install caddy`, ou https://caddyserver.com/docs/install)
- Domínio apontando para o IP do host (A record)
- Portas 80 e 443 liberadas no firewall (Caddy)

## 1. Instalar Docker e Caddy

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
apt install -y caddy git
```

## 2. Clonar e configurar variáveis de ambiente

```bash
git clone <url-do-repo> /opt/desafia
cd /opt/desafia

cp backend/.env.example backend/.env
openssl rand -hex 32  # → JWT_SECRET
openssl rand -hex 32  # → JWT_REFRESH_SECRET
```

Edite `backend/.env` e preencha `JWT_SECRET` e `JWT_REFRESH_SECRET`.

> **Nota:** `DB_PASSWORD` define a senha do Postgres. Se trocar, troque antes do primeiro `docker compose up` — depois que o volume for criado, mudar a senha não funciona sem recriar o volume.

## 3. Subir a stack

```bash
cd /opt/desafia/backend
docker compose up --build -d
```

O `--build` faz o build dos containers (API e frontend). Na primeira vez demora um pouco; depois, sem `--build`, sobe instantâneo.

Verifique:

```bash
docker compose ps
```

Devem aparecer 4 containers `Up` (db, redis, api, frontend). As migrations rodam automaticamente no entrypoint da API antes de ela iniciar.

## 4. Configurar o Caddy

Adicione um site block por domínio no `/etc/caddy/Caddyfile`. O exemplo abaixo assume as portas padrão do compose (3100 API, 3001 frontend):

```
desafia.fun {
    encode zstd gzip

    # API + WebSocket + uploads → backend
    handle /api/* {
        reverse_proxy localhost:3100
    }
    handle /socket.io/* {
        reverse_proxy localhost:3100
    }
    handle /uploads/* {
        reverse_proxy localhost:3100
    }

    # Frontend
    handle {
        reverse_proxy localhost:3001
    }
}
```

- O Caddy emite e renova o certificado Let's Encrypt automaticamente — não há certbot nem cron.
- O `reverse_proxy` do Caddy faz o upgrade WebSocket automaticamente (Socket.IO funciona sem configuração extra).
- Se o Caddyfile já tem outros domínios, é só adicionar o bloco — os site blocks são independentes.

Valide e aplique:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

## Atualizar o app (deploy de nova versão)

```bash
cd /opt/desafia
git pull
cd backend
docker compose up --build -d
```

Só o que mudou é rebuildado — o restante continua rodando.

## Comandos úteis

```bash
cd /opt/desafia/backend

docker compose ps                # status dos containers
docker compose logs -f           # logs em tempo real (todos)
docker compose logs -f app       # logs só da API
docker compose logs -f frontend  # logs só do frontend
docker compose restart app       # reinicia só a API
docker compose down              # para tudo (dados persistem)
docker compose up -d             # sobe de novo
docker compose down -v           # DESTRÓI tudo (banco + uploads)
```

## Troubleshooting

**API não sobe:**
```bash
docker compose logs app | head -30
```
Causa comum: variáveis de ambiente ausentes/inválidas (`backend/.env`).

**Erro de conexão no banco:**
Os containers estão na rede interna do compose — `app` acessa `postgres:5432`. Verifique se o healthcheck do postgres passou: `docker compose ps postgres`.

**Migrations não rodaram:**
O entrypoint do `app` roda `drizzle-kit migrate` antes de iniciar. Logs:
```bash
docker compose logs app | head -20
```

**Porta em uso no host:**
Se a porta publicada já está ocupada por outro processo, ajuste o lado esquerdo do mapeamento em `ports:` (ex.: `"3100:3000"` → `"3200:3000"`) e o `reverse_proxy` correspondente no Caddyfile.

**Frontend não builda:**
O Dockerfile do frontend usa `pnpm` via corepack. Se falhar na etapa de install, verifique se o `pnpm-lock.yaml` está atualizado no repositório:
```bash
git status frontend/pnpm-lock.yaml
```
