import { createServer } from "node:http";
import { parse } from "node:url";

import { createJiti } from "jiti";
import next from "next";

const portArgIndex = process.argv.findIndex(
  (argument) => argument === "--port" || argument === "-p"
);
const portFromArgs =
  portArgIndex >= 0 ? process.argv.at(portArgIndex + 1) : undefined;
const port = Number.parseInt(portFromArgs ?? process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const dev =
  process.env.NODE_ENV !== "production" &&
  !process.argv.includes("--production");

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const jiti = createJiti(import.meta.url);

await app.prepare();

const server = createServer((request, response) => {
  const parsedUrl = parse(request.url ?? "/", true);
  handle(request, response, parsedUrl);
});

const { createSocketServer } = await jiti.import("./lib/socket/server.ts");

createSocketServer(server);

server.listen(port, hostname, () => {
  console.log(`> Ready on http://localhost:${port}`);
});
