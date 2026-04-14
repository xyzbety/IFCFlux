let resolvedPathPromise: Promise<string> | null = null;

function getBaseUrl(): URL {
  // BASE_URL 在开发环境通常是 "/"，打包后可能是 "./" 或子路径。
  return new URL(import.meta.env.BASE_URL || "/", window.location.origin);
}

function getCandidateDirectories(): string[] {
  const base = getBaseUrl();
  const candidates = [
    new URL("web-ifc/", base).toString(),
    new URL("web-ifc/node_modules/web-ifc/", base).toString(),
    `${window.location.origin}/web-ifc/`,
    `${window.location.origin}/web-ifc/node_modules/web-ifc/`
  ];
  return [...new Set(candidates)];
}

async function isValidWasmFile(wasmUrl: string): Promise<boolean> {
  try {
    const response = await fetch(wasmUrl, { cache: "no-store" });
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

export function getWebIfcWasmPath(): string {
  // 默认路径（同步场景下使用）；真正初始化前会通过 resolveWebIfcWasmPath 再校验一次。
  return getCandidateDirectories()[0];
}

export async function resolveWebIfcWasmPath(): Promise<string> {
  if (!resolvedPathPromise) {
    resolvedPathPromise = (async () => {
      const candidates = getCandidateDirectories();
      for (const dir of candidates) {
        const wasmUrl = new URL("web-ifc.wasm", dir).toString();
        if (await isValidWasmFile(wasmUrl)) {
          console.info("[web-ifc] 使用 wasm 路径:", dir);
          return dir;
        }
      }
      console.warn("[web-ifc] 未找到可用 wasm 路径，将回退到默认路径:", candidates[0]);
      return candidates[0];
    })();
  }

  return resolvedPathPromise;
}
