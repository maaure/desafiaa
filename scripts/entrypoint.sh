#!/bin/sh
set -e

echo "Executando migrations..."
npx drizzle-kit migrate
echo "Migrations concluídas."

echo "Iniciando aplicação..."
exec "$@"
