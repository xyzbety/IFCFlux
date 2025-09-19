import { parse, stringify } from "uuid";

const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";

const reverse = Object.fromEntries(chars.split("").map((char, index) => [char, index]));

const ifcGuidRegex = new RegExp(/^[0-3][\dA-Za-z_$]{21}$/);

export function validate(ifcGuid: string): boolean {
  return typeof ifcGuid === "string" && ifcGuidRegex.test(ifcGuid);
}

export function toIfcGuidArray(uuid: Uint8Array): string {
  if (!(uuid instanceof Uint8Array))
    throw new TypeError("Invalid UUID type");
  if (uuid.length !== 16)
    throw Error("Invalid UUID length");

  let result = chars[(uuid[0] >> 6) & 63] + chars[uuid[0] & 63];

  for (let i = 1; i < 16; i = i + 3) {
    const u24 = (uuid[i] << 16) | (uuid[i + 1] << 8) | uuid[i + 2];
    result +=
      chars[(u24 >> 18) & 63] +
      chars[(u24 >> 12) & 63] +
      chars[(u24 >> 6) & 63] +
      chars[u24 & 63];
  }

  return result;
}

export function fromIfcGuidArray(ifcGuid: string): Uint8Array {
  if (typeof ifcGuid !== "string")
    throw new TypeError("Invalid IFC-GUID type");
  if (ifcGuid.length !== 22)
    throw Error("Invalid IFC-GUID length");
  if (!ifcGuidRegex.test(ifcGuid)) throw Error("Invalid character in IFC-GUID");

  const result = new Uint8Array(16);
  result[0] = (reverse[ifcGuid[0]] << 6) | reverse[ifcGuid[1]];

  for (let i = 2, j = 1; j < 16; i = i + 4, j = j + 3) {
    const u24 =
      (reverse[ifcGuid[i]] << 18) |
      (reverse[ifcGuid[i + 1]] << 12) |
      (reverse[ifcGuid[i + 2]] << 6) |
      reverse[ifcGuid[i + 3]];

    result[j] = (u24 >> 16) & 255;
    result[j + 1] = (u24 >> 8) & 255;
    result[j + 2] = u24 & 255;
  }

  return result;
}

export function toIfcGuid(uuid: string): string {
  return toIfcGuidArray(parse(uuid));
}

export function fromIfcGuid(ifcGuid: string): string {
  return stringify(fromIfcGuidArray(ifcGuid));
}