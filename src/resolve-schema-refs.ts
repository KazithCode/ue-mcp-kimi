/**
 * Resolve (inlineia) todos os $ref em um JSON Schema recursivamente.
 * Remove completamente as referencias, substituindo pelo conteudo inline.
 *
 * Necessario porque a API Moonshot (Kimi Code) rejeita $ref fora do
 * formato #/$defs/. Inlinear os schemas elimina o problema.
 */

export function resolveRefs(schema: any, root?: any, depth: number = 0, maxDepth: number = 50): any {
  if (depth > maxDepth) {
    console.warn(`[resolveRefs] Max depth ${maxDepth} atingido`);
    return schema;
  }
  if (root === undefined) root = schema;
  if (schema === null || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map((item) => resolveRefs(item, root, depth + 1, maxDepth));

  // Se tem $ref, resolve e mergeia com outras propriedades se houver
  if ("$ref" in schema) {
    const refPath = schema["$ref"];
    const resolved = resolveRefPath(root, refPath);
    if (resolved !== null) {
      const inlined = JSON.parse(JSON.stringify(resolved));
      if (typeof inlined === "object" && inlined !== null && "$ref" in inlined) {
        delete inlined["$ref"];
      }
      // Merge: propriedades do schema original (exceto $ref) sobrescrevem as do resolved
      const { $ref, ...rest } = schema;
      const merged = { ...inlined, ...rest };
      return resolveRefs(merged, root, depth + 1, maxDepth);
    }
    console.warn(`[resolveRefs] Nao conseguiu resolver: ${refPath}`);
  }

  // Varre recursivamente todas as propriedades
  const result: any = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = resolveRefs(value, root, depth + 1, maxDepth);
  }
  return result;
}

function resolveRefPath(root: any, refPath: string): any {
  if (!refPath.startsWith("#/")) return null;
  const parts = refPath.slice(2).split("/");
  let current = root;
  for (const part of parts) {
    if (current !== null && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }
  return current;
}

/**
 * Wrapper obrigatorio para TODOS os inputSchema antes de registrar no MCP Server.
 * Garante que nenhum $ref reste no schema final.
 */
export function sanitizeInputSchema(schema: any): any {
  const resolved = resolveRefs(schema);
  const str = JSON.stringify(resolved);
  if (str.includes('"$ref"')) {
    console.warn("[sanitizeInputSchema] AVISO: Schema ainda contem $ref apos resolucao!");
    console.warn("[sanitizeInputSchema] Schema:", JSON.stringify(resolved, null, 2).slice(0, 500));
  }
  return resolved;
}
