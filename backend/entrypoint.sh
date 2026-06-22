#!/bin/sh
echo "🚀 Iniciando KulipaPay..."
npx prisma generate
npx prisma db push
npm run dev
