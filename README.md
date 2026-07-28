# Lobby

Base de um app web de party games multiplayer com Next.js App Router,
TypeScript, TailwindCSS, Shadcn/UI, Prisma, SQLite, Socket.IO e Framer Motion.

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

Configure `DATABASE_URL` no arquivo `.env`.

```env
DATABASE_URL="file:./dev.db"
```

O Prisma esta configurado em `prisma/schema.prisma` com SQLite, mas ainda nao ha
modelos de dominio porque esta etapa cobre apenas o setup inicial.

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
