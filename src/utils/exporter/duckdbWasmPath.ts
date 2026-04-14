import type * as duckdb from "@duckdb/duckdb-wasm";

let resolvedBundlesPromise: Promise<duckdb.DuckDBBundles> | null = null;

function getBaseUrl(): URL {
  return new URL(import.meta.env.BASE_URL || "/", window.location.origin);
}

function getCandidateDirs(): string[] {
  const base = getBaseUrl();
  const candidates = [
    new URL("duckdb/", base).toString(),
    `${window.location.origin}/duckdb/`
  ];
  return [...new Set(candidates)];
}

async function exists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "GET", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function isValidWasm(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return false;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length >= 4
      && bytes[0] === 0x00
      && bytes[1] === 0x61
      && bytes[2] === 0x73
      && bytes[3] === 0x6d;
  } catch {
    return false;
  }
}

async function pickBundleEntry(
  dir: string,
  wasmNames: string[],
  workerNames: string[]
): Promise<{ mainModule: string; mainWorker: string } | null> {
  for (const wasmName of wasmNames) {
    const wasmUrl = new URL(wasmName, dir).toString();
    if (!(await isValidWasm(wasmUrl))) continue;

    for (const workerName of workerNames) {
      const workerUrl = new URL(workerName, dir).toString();
      if (await exists(workerUrl)) {
        return { mainModule: wasmUrl, mainWorker: workerUrl };
      }
    }
  }
  return null;
}

export async function resolveDuckDbBundles(): Promise<duckdb.DuckDBBundles> {
  if (!resolvedBundlesPromise) {
    resolvedBundlesPromise = (async () => {
      const dirs = getCandidateDirs();
      for (const dir of dirs) {
        const mvp = await pickBundleEntry(
          dir,
          ["duckdb-mvp.wasm"],
          ["duckdb-browser-mvp.worker.js"]
        );
        const eh = await pickBundleEntry(
          dir,
          ["duckdb-eh.wasm"],
          ["duckdb-browser-eh.worker.js"]
        );

        if (mvp && eh) {
          console.info("[duckdb] 使用 wasm 路径:", dir);
          return { mvp, eh };
        }
      }

      const fallbackDir = dirs[0];
      console.warn("[duckdb] 未探测到可用 wasm 路径，回退默认路径:", fallbackDir);
      return {
        mvp: {
          mainModule: new URL("duckdb-mvp.wasm", fallbackDir).toString(),
          mainWorker: new URL("duckdb-browser-mvp.worker.js", fallbackDir).toString()
        },
        eh: {
          mainModule: new URL("duckdb-eh.wasm", fallbackDir).toString(),
          mainWorker: new URL("duckdb-browser-eh.worker.js", fallbackDir).toString()
        }
      };
    })();
  }

  return resolvedBundlesPromise;
}
