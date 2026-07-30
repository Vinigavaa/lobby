# Lobby

Base de um app web de party games multiplayer com Next.js App Router,
TypeScript, TailwindCSS, Shadcn/UI, Prisma, PostgreSQL (Neon), Socket.IO e
Framer Motion.

## Requisitos

- Node.js 20.19 ou superior
- npm

## Instalacao

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Abra `http://localhost:3000`.

## Banco de dados

Configure `DATABASE_URL` no arquivo `.env` com a connection string do seu
banco Postgres (ex: Neon).

```env
DATABASE_URL="postgresql://usuario:senha@host/banco?sslmode=require"
```

O Prisma esta configurado em `prisma/schema.prisma` com PostgreSQL.

## Scripts

- `npm run dev`: inicia o Next.js em desenvolvimento.
- `npm run build`: compila o projeto.
- `npm run start`: executa a build de producao.
- `npm run lint`: roda ESLint.
- `npm run db:generate`: gera o Prisma Client.
- `npm run db:migrate`: cria/aplica migrations quando houver modelos.

## Socket.IO

A estrutura inicial esta em `lib/socket`. O endpoint `GET /api/socket` expoe um
health check simples e os helpers de servidor/cliente deixam o caminho
`/api/socket/io` preparado para acoplar um servidor HTTP customizado quando os
jogos em tempo real forem implementados.
