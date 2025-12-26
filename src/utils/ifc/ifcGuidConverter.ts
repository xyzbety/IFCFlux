const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";

function u64(v: string): number {
  return Array.from(v).reduce((a, b) => a * 64 + chars.indexOf(b), 0);
}

// 将一个数值转换为指定长度的Base64编码字符串
function b64(v: number, l: number = 4): string {
  const result: string[] = [];
  for (let i = 0; i < l; i++) {
    result.push(chars[Math.floor(v / (64 ** i)) % 64]);
  }
  return result.reverse().join('');
}

export function ifcGuidToUuid(g: string): string {
  const bs = [u64(g.substring(0, 2))];
  for (let i = 0; i < 5; i++) {
    const d = u64(g.substring(2 + 4 * i, 6 + 4 * i));
    for (let j = 0; j < 3; j++) {
      bs.push((d >> (8 * (2 - j))) % 256);
    }
  }
  const bsf = bs.map(b => b.toString(16).padStart(2, '0')).join("");
  return `${bsf.slice(0, 8)}-${bsf.slice(8, 12)}-${bsf.slice(12, 16)}-${bsf.slice(16, 20)}-${bsf.slice(20)}`
}

export function uuidToIfcGuid(uuid: string): string {
  const g = uuid.replace(/[{}-]/g, '');
  const bs: number[] = [];
  for (let i = 0; i < g.length; i += 2) {
    bs.push(parseInt(g.substring(i, i + 2), 16));
  }
  const parts: string[] = [b64(bs[0], 2)];
  for (let i = 1; i < 16; i += 3) {
    const val = (bs[i] << 16) + (bs[i + 1] << 8) + bs[i + 2];
    parts.push(b64(val));
  }
  return parts.join('');
}