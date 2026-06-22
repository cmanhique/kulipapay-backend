#!/bin/bash

echo "🔧 Instalando dependências..."
npm install

echo "🔧 Gerando Prisma Client..."
npx prisma generate

echo "🔧 Rodando migrações..."
npx prisma migrate deploy

echo "✅ Build concluído!"