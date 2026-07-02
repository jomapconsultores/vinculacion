// Cliente de IA multi-proveedor (compatible con API OpenAI).
// Orden de preferencia con fallback automático: DeepSeek -> Mistral -> Codestral.
// Configurable con AI_PROVIDERS (lista separada por comas).

type Provider = {
  name: string;
  url: string;
  key?: string;
  model: string;
  jsonMode: boolean; // soporta response_format json_object
};

function allProviders(): Record<string, Provider> {
  return {
    deepseek: {
      name: "deepseek",
      url: "https://api.deepseek.com/chat/completions",
      key: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      jsonMode: true,
    },
    mistral: {
      name: "mistral",
      url: "https://api.mistral.ai/v1/chat/completions",
      key: process.env.MISTRAL_API_KEY,
      model: process.env.MISTRAL_MODEL || "mistral-large-latest",
      jsonMode: true,
    },
    codestral: {
      name: "codestral",
      url: "https://codestral.mistral.ai/v1/chat/completions",
      key: process.env.CODESTRAL_API_KEY,
      model: process.env.CODESTRAL_MODEL || "codestral-latest",
      jsonMode: false,
    },
  };
}

function activeProviders(): Provider[] {
  const all = allProviders();
  const order = (process.env.AI_PROVIDERS || "deepseek,mistral,codestral")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return order.map((n) => all[n]).filter((p): p is Provider => !!p && !!p.key);
}

export function aiConfigurado(): boolean {
  return activeProviders().length > 0;
}

export const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

/**
 * Pide una respuesta JSON a la IA, probando proveedores en orden hasta que uno
 * devuelva JSON válido. Robusto ante texto/markdown alrededor del JSON.
 */
export async function askJSON<T = unknown>(
  system: string,
  user: string,
  maxTokens = 1500
): Promise<T> {
  const provs = activeProviders();
  if (provs.length === 0) {
    throw new Error("IA no configurada: define DEEPSEEK_API_KEY, MISTRAL_API_KEY o CODESTRAL_API_KEY.");
  }

  const errores: string[] = [];
  for (const p of provs) {
    try {
      const body: Record<string, unknown> = {
        model: p.model,
        max_tokens: maxTokens,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      };
      if (p.jsonMode) body.response_format = { type: "json_object" };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      const res = await fetch(p.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${p.key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        errores.push(`${p.name} HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
        continue;
      }
      const data = await res.json();
      const text: string = data?.choices?.[0]?.message?.content ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        errores.push(`${p.name}: respuesta sin JSON`);
        continue;
      }
      return JSON.parse(match[0]) as T;
    } catch (e: any) {
      errores.push(`${p.name}: ${e?.message || e}`);
    }
  }
  throw new Error("Todos los proveedores de IA fallaron. " + errores.join(" | "));
}
