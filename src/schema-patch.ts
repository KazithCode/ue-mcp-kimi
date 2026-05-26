/**
 * Monkey-patch para o SDK MCP: intercepta a conversao Zod -> JSON Schema
 * e remove todos os $ref inlineando os schemas.
 *
 * Isso resolve a incompatibilidade com a API Moonshot (Kimi Code), que
 * rejeita $ref fora do formato #/$defs/.
 *
 * O patch eh aplicado no modulo CJS compartilhado do SDK, entao afeta
 * automaticamente todas as chamadas internas do McpServer.
 */

import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeInputSchema } from "./resolve-schema-refs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const compatPath = path.resolve(
  __dirname,
  "../node_modules/@modelcontextprotocol/sdk/dist/cjs/server/zod-json-schema-compat.js",
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const compatModule = require(compatPath) as {
  toJsonSchemaCompat: (...args: any[]) => any;
};

const originalToJsonSchemaCompat = compatModule.toJsonSchemaCompat;

compatModule.toJsonSchemaCompat = function (...args: any[]) {
  const result = originalToJsonSchemaCompat.apply(this, args);
  // Aplica sanitizacao apenas em schemas de entrada (input), nao em output
  const opts = args[1] as { pipeStrategy?: string } | undefined;
  if (opts?.pipeStrategy === "output") {
    return result;
  }
  return sanitizeInputSchema(result);
};

console.error("[ue-mcp] Schema patch aplicado: $ref serao inlineados para compatibilidade Moonshot/Kimi");
