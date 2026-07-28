# Guia Arquitetural para Projetos Next.js

Este documento descreve o padrao de arquitetura, organizacao de pastas,
autenticacao, comunicacao com API, separacao de responsabilidades e estilo de
codigo que deve ser seguido ao criar um projeto do zero ou reformular um projeto
existente com esta base.

O foco nao e documentar regras de negocio especificas. O foco e manter uma
estrutura previsivel, segura e facil de evoluir em projetos Next.js com App
Router, autenticacao, banco de dados, validacao e componentes reutilizaveis.

## Regra principal para agentes

Este projeto usa Next.js moderno com App Router. Antes de escrever codigo de
Next.js, leia a documentacao local relevante em `node_modules/next/dist/docs/`,
porque APIs, convencoes e comportamento podem mudar entre versoes.

Guias locais recomendados:

- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`

## Objetivo do padrao

Projetos construidos com este padrao devem:

- separar rotas, componentes, infraestrutura, validacoes e banco de dados;
- usar Server Components por padrao;
- usar Client Components apenas onde houver interatividade;
- centralizar autenticacao;
- proteger APIs no servidor;
- validar toda entrada de usuario com schemas;
- acessar banco apenas por uma camada compartilhada;
- manter dados escopados ao usuario autenticado quando houver multiusuario;
- reutilizar componentes de UI antes de criar novos;
- evitar regra de negocio espalhada pela interface.

## Stack recomendada

- Next.js com App Router.
- TypeScript em modo estrito.
- NextAuth/Auth.js para autenticacao.
- Prisma para acesso ao banco.
- Zod para validacao.
- React Hook Form para formularios complexos.
- Tailwind CSS para estilo.
- shadcn/radix para componentes base.
- `lucide-react` para icones.

Adapte banco, providers e bibliotecas auxiliares conforme o projeto, mas preserve
a separacao de responsabilidades descrita aqui.

## Estrutura de pastas

Use esta estrutura como base:

```text
app/
  layout.tsx
  page.tsx
  (public)/
    <rota-publica>/page.tsx
  (protected)/
    <feature>/page.tsx
    <feature>/nova/page.tsx
    <feature>/[id]/page.tsx
  api/
    [...nextauth]/route.ts
    <feature>/route.ts
    <feature>/[id]/route.ts

components/
  <feature>-content.tsx
  <feature>-form.tsx
  <feature>-card.tsx
  <feature>-delete.tsx
  ui/

lib/
  auth.ts
  auth-helper.ts
  prisma.ts
  utils.ts
  validations/
    <feature>.ts

prisma/
  schema.prisma
  migrations/

generated/
  prisma/

public/
```

Para features grandes, e aceitavel criar subpastas por dominio:

```text
components/
  <feature>/
    <feature>-content.tsx
    <feature>-form.tsx
    <feature>-card.tsx
```

Tambem e aceitavel colocacao local dentro de uma rota com `_components` quando o
componente nao deve ser compartilhado fora daquele segmento:

```text
app/
  (protected)/
    <feature>/
      page.tsx
      _components/
        <feature>-view.tsx
```

## Roteamento

Use apenas o App Router dentro de `app/`. Nao crie `pages/` para novas features.

Convencoes:

- `page.tsx` define uma rota navegavel.
- `layout.tsx` define UI compartilhada.
- `route.ts` define endpoint HTTP.
- Pastas entre parenteses, como `(public)` e `(protected)`, agrupam rotas sem alterar a URL.
- Segmentos dinamicos usam colchetes, como `[id]`.
- Rotas publicas ficam em `(public)`.
- Rotas que exigem sessao ficam em `(protected)`.

Em Route Handlers com parametros dinamicos, trate `params` como `Promise`:

```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

## Server Components e Client Components

Paginas e layouts devem ser Server Components por padrao.

Use Server Components para:

- verificar sessao;
- redirecionar usuarios;
- buscar dados no servidor quando fizer sentido;
- manter tokens, secrets e acesso direto a infraestrutura fora do cliente;
- montar a composicao principal da pagina.

Use Client Components apenas quando houver:

- `useState`, `useEffect` ou hooks de cliente;
- eventos como `onClick`, `onSubmit` ou `onChange`;
- APIs do browser;
- chamadas `fetch` disparadas pela interface;
- `useRouter()` de `next/navigation`;
- dialogs, menus, formularios interativos ou estado local.

Coloque `"use client"` somente no menor componente que precisa de
interatividade. Evite transformar uma pagina inteira em Client Component quando
apenas um formulario, botao ou lista interativa precisa rodar no browser.

## Autenticacao

Centralize a configuracao de autenticacao em `lib/auth.ts`.

Padrao recomendado:

```ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // providers do projeto
  ],
});
```

O Route Handler do Auth.js deve apenas expor os handlers:

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

Paginas protegidas devem checar sessao no servidor:

```ts
const session = await auth();

if (!session?.user?.id) {
  redirect("/<rota-de-login>");
}
```

Paginas de login ou cadastro devem redirecionar usuarios ja autenticados quando
essa for a experiencia esperada:

```ts
if (session?.user?.id) {
  redirect("/<rota-inicial-protegida>");
}
```

## Protecao de APIs

APIs privadas devem usar um helper compartilhado de autenticacao, por exemplo
`lib/auth-helper.ts`.

Responsabilidades desse helper:

- chamar `auth()`;
- verificar se existe usuario autenticado;
- retornar `401` quando nao houver sessao valida;
- injetar `userId` ou contexto autenticado no handler real.

Exemplo de formato:

```ts
type Handler = (
  request: NextRequest,
  userId: string,
  ...args: unknown[]
) => Promise<Response>;

export function withAuth(handler: Handler) {
  return async (request: NextRequest, ...args: unknown[]) => {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    return handler(request, session.user.id, ...args);
  };
}
```

Toda operacao sensivel deve ser validada no servidor, mesmo que a interface ja
tenha feito validacao ou escondido botoes.

## Comunicacao com a API

Use Route Handlers em `app/api` como fronteira HTTP da aplicacao.

Padrao para endpoints:

- receber `NextRequest` quando precisar ler body, query, headers ou cookies;
- responder com `NextResponse.json`;
- usar status HTTP explicito;
- validar body com Zod;
- proteger endpoints privados com `withAuth`;
- escopar consultas pelo usuario autenticado quando houver multiusuario;
- retornar erros previsiveis em JSON;
- evitar vazar detalhes internos de excecoes.

Estrutura comum:

```text
app/api/<feature>/route.ts
app/api/<feature>/[id]/route.ts
```

Use `route.ts` da colecao para listagem e criacao. Use `[id]/route.ts` para
operacoes sobre um registro especifico.

Exemplo de consumo em Client Component:

```ts
const response = await fetch("/api/<feature>", {
  cache: "no-store",
});
```

Exemplo de mutacao:

```ts
const response = await fetch("/api/<feature>", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

Depois de uma mutacao, use:

- `router.push()` quando a acao muda a rota;
- `router.refresh()` quando Server Components precisam revalidar dados;
- atualizacao local de estado quando a mudanca e pequena e previsivel.

## Banco de dados

O acesso ao banco deve ser centralizado em `lib/prisma.ts`.

Regras:

- nao instancie cliente de banco dentro de componentes;
- nao instancie cliente de banco diretamente em cada Route Handler;
- importe sempre a instancia compartilhada;
- mantenha configuracao do datasource fora dos componentes;
- quando alterar schema, crie migration;
- nao exponha detalhes do banco para componentes de UI;
- em sistemas multiusuario, toda query sensivel deve considerar o usuario atual.

Exemplo de arquivo:

```ts
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

export { prisma };
```

A configuracao concreta pode variar conforme o adapter, runtime e banco usado.
Preserve a ideia: uma entrada compartilhada para infraestrutura de dados.

## Validacao

Schemas de entrada devem ficar em `lib/validations`.

Padrao:

- um arquivo por feature ou dominio;
- Zod como fonte unica de validacao;
- tipos TypeScript inferidos a partir do schema;
- validacao no cliente para experiencia de uso;
- validacao no servidor para seguranca;
- respostas de erro estruturadas nos Route Handlers.

Exemplo:

```ts
import z from "zod";

export const featureSchema = z.object({
  name: z.string().min(2),
});

export const createFeatureSchema = featureSchema;
export const updateFeatureSchema = featureSchema.partial();

export type FeatureInput = z.infer<typeof featureSchema>;
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
```

## Responsabilidades por camada

Paginas em `app/**/page.tsx`:

- definem rotas;
- fazem checks de autenticacao quando necessario;
- fazem redirects;
- montam a composicao macro da tela;
- delegam interatividade para componentes menores.

Route Handlers em `app/api/**/route.ts`:

- sao a fronteira HTTP;
- validam autenticacao;
- validam autorizacao;
- validam entrada;
- chamam a camada de dados;
- retornam JSON com status HTTP correto.

Componentes de feature:

- representam partes da interface de uma feature;
- coordenam estado local quando forem Client Components;
- chamam APIs quando a interacao parte do browser;
- nao devem acessar banco diretamente;
- nao devem conhecer secrets;
- nao devem conter regras globais de autenticacao.

Componentes em `components/ui`:

- sao primitives visuais reutilizaveis;
- nao conhecem regra de negocio;
- nao chamam APIs;
- nao acessam auth;
- devem ser reutilizados antes de criar novos componentes visuais.

Arquivos em `lib`:

- guardam infraestrutura e codigo compartilhado;
- centralizam auth, banco, helpers, utils e validacoes;
- nao devem depender de componentes React;
- devem ser pequenos, explicitos e reutilizaveis.

## Separacao de componentes por feature

Para cada feature, prefira esta divisao:

- `<feature>-content.tsx`: carregamento client-side, estados de tela e composicao da lista/visao.
- `<feature>-form.tsx`: formulario, validacao, submit e loading state.
- `<feature>-card.tsx` ou `<feature>-row.tsx`: representacao visual de um item.
- `<feature>-delete.tsx`: confirmacao e remocao.
- `<feature>-filters.tsx`: filtros, busca e ordenacao quando existirem.
- `<feature>-empty.tsx`: estado vazio quando a tela exigir apresentacao especifica.

Crie apenas os componentes necessarios. Nao crie arquivos vazios ou abstracoes
antecipadas.

## UI e estilo

Padrao visual:

- Tailwind CSS para estilo.
- shadcn/radix para primitives.
- `lucide-react` para icones.
- tokens globais em `app/globals.css`.
- alias `@/*` para imports internos.

Regras:

- reutilize componentes de `components/ui`;
- mantenha componentes de UI sem regra de negocio;
- use icones existentes antes de criar SVG manual;
- mantenha formularios acessiveis com `label`, `aria-invalid` e mensagens de erro;
- estados de loading, erro e vazio devem ser tratados explicitamente;
- evite estilos globais quando uma classe local resolve.

## Padrao para criar nova feature

Ao criar uma feature autenticada:

1. Defina o modelo de dados necessario no schema do banco.
2. Crie a migration.
3. Crie schemas Zod em `lib/validations/<feature>.ts`.
4. Crie `app/api/<feature>/route.ts`.
5. Crie `app/api/<feature>/[id]/route.ts` se houver operacoes por id.
6. Proteja endpoints privados com `withAuth`.
7. Garanta autorizacao e escopo por usuario quando aplicavel.
8. Crie a pagina em `app/(protected)/<feature>/page.tsx`.
9. Crie componentes da feature em `components/` ou `_components`.
10. Use Client Components apenas para interatividade.
11. Rode `npm run lint`.
12. Rode `npm run build` quando a mudanca afetar arquitetura, rotas ou tipos.

Ao criar uma feature publica:

1. Coloque a pagina em `app/(public)/<rota>/page.tsx`.
2. Evite depender de sessao obrigatoria.
3. Redirecione usuarios autenticados apenas se isso fizer sentido para o fluxo.
4. Separe formularios interativos em Client Components.
5. Valide qualquer submit no servidor.

## Convencoes de codigo

- TypeScript estrito.
- Imports absolutos com `@/`.
- Nomes explicitos para funcoes, componentes e arquivos.
- Preferir `async/await`.
- Retornar cedo em casos de erro.
- Usar status HTTP correto em APIs.
- Validar dados externos sempre.
- Nao duplicar schema de validacao.
- Nao misturar regra de banco com componente visual.
- Nao misturar regra de autenticacao com UI primitive.
- Nao retornar dados de outro usuario.
- Nao expor secrets no cliente.

## Checklist para agentes

Antes de alterar codigo:

- leia este guia;
- leia a documentacao local relevante do Next.js;
- inspecione arquivos existentes da mesma camada;
- preserve a arquitetura `app` + `components` + `lib` + `prisma`;
- siga os nomes e padroes ja existentes;
- use `auth()` em Server Components protegidos;
- use `withAuth` em APIs privadas;
- use Zod para validar entrada;
- use a instancia compartilhada de banco;
- mantenha componentes pequenos e com responsabilidade clara.

Antes de finalizar:

- verifique imports e tipos;
- remova logs temporarios;
- garanta estados de loading, erro e vazio quando houver interface;
- rode `npm run lint`;
- rode `npm run build` quando apropriado;
- documente qualquer decisao arquitetural nova.

## O que evitar

- Criar `pages/` em projetos baseados no App Router.
- Marcar paginas inteiras com `"use client"` sem necessidade.
- Chamar banco diretamente de componentes de UI.
- Repetir validacao manual em vez de usar schema.
- Criar componentes genericos antes de existir repeticao real.
- Colocar regra de negocio em `components/ui`.
- Retornar excecoes cruas em respostas HTTP.
- Fazer autorizacao apenas escondendo elementos na interface.
- Misturar responsabilidade de pagina, formulario, API e banco no mesmo arquivo.

## Resultado esperado

Projetos seguindo este guia devem ter uma arquitetura consistente:

- paginas cuidam de rota e composicao;
- componentes cuidam de interface e interacao;
- Route Handlers cuidam da fronteira HTTP;
- `lib` concentra infraestrutura compartilhada;
- Prisma concentra acesso ao banco;
- Zod define contratos de entrada;
- Auth fica centralizado e reutilizavel;
- regras sensiveis ficam no servidor.
