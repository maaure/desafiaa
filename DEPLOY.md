# Deploy — desafia.fun

Tudo containerizado. Só precisa de Docker na VPS, o build acontece dentro dos containers.

## Pré-requisitos na VPS

- Ubuntu/Debian (recente)
- Domínio `desafia.fun` apontando pro IP da VPS
- Portas 80 e 443 liberadas no firewall

```bash
ssh root@desafia.fun
```

## 1. Instalar Docker + git

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
apt install -y git certbot
```

## 2. Clonar o projeto

```bash
git clone <url-do-repo> /opt/desafia
cd /opt/desafia
```

## 3. Configurar variáveis de ambiente

Gere segredos na VPS:

```bash
openssl rand -hex 32  # → JWT_SECRET
openssl rand -hex 32  # → JWT_REFRESH_SECRET
```

Copie o arquivo de exemplo e edite:

```bash
cp backend/.env.example backend/.env
vim backend/.env
```

Preencha `JWT_SECRET` e `JWT_REFRESH_SECRET` com os valores gerados.

> **Nota:** `DB_PASSWORD` define a senha do Postgres. Se trocar, troque antes do primeiro `docker compose up`. Depois que o volume for criado, mudar a senha não funciona sem recriar o volume.

## 4. Preparar SSL

O nginx precisa responder o desafio HTTP do Let's Encrypt antes de ativar HTTPS.

```bash
mkdir -p /opt/desafia/backend/certbot/www

# Sobe só o nginx na porta 80
cd /opt/desafia/backend
docker compose up -d nginx

# Gera o certificado
certbot certonly --webroot \
  -w /opt/desafia/backend/certbot/www \
  -d desafia.fun
```

## 5. Subir tudo

```bash
cd /opt/desafia/backend
docker compose up --build -d
```

O `--build` faz o build dos containers (backend e frontend). Na primeira vez demora um pouco. Depois, sem `--build`, sobe instantâneo.

Verifica se subiu:

```bash
docker compose ps
```

Deve mostrar 5 containers `Up`:

| Container | Porta | Função |
|---|---|---|
| `desafia-db` | 5432 | Postgres |
| `desafia-redis` | 6379 | Redis |
| `desafia-api` | 3000 | API Fastify + Socket.IO |
| `desafia-frontend` | 3001 | SvelteKit server |
| `desafia-nginx` | 80, 443 | Proxy reverso + SSL |

## 6. Renovação automática do SSL

```bash
(
  crontab -l 2>/dev/null
  echo '0 3 * * * certbot renew --quiet --deploy-hook "docker exec desafia-nginx nginx -s reload"'
) | crontab -
```

## Atualizar o app (deploy de nova versão)

```bash
cd /opt/desafia
git pull
cd backend
docker compose up --build -d
```

Só o que mudou é rebuildado. O resto continua rodando.

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

**nginx não sobe (certificado não existe):**
Rode o passo 4 primeiro.

**Erro de conexão no banco:**
Os containers estão na rede interna do compose — `app` acessa `postgres:5432`. Verifique se o healthcheck do postgres passou: `docker compose ps postgres`.

**Migrations não rodaram:**
O entrypoint do `app` roda `drizzle-kit migrate` antes de iniciar. Logs:

```bash
docker compose logs app | head -20
```

**Portas em uso:**
Se 80/443/3000/3001/5432/6379 estiverem ocupadas, ajuste no `docker-compose.yml` ou pare o serviço conflitante.

**Frontend não builda:**
O Dockerfile do frontend usa `pnpm` via corepack. Se falhar na etapa de install, verifique se o `pnpm-lock.yaml` está atualizado no repositório:

```bash
git status frontend/pnpm-lock.yaml
```
