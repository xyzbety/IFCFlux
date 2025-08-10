// 常见对象类型
export interface CommonObject {
  [key: string | number]: string | number | boolean | CommonObject
}
/**
 * 合并两个对象
 * @param a 对象一 
 * @param b 对象二
 * @returns 
 */
export const deepMerge = (a: CommonObject, b: CommonObject) => {
  const output = { ...a };

  for (const key in b) {
    // 如果 b 的属性是对象且 a 的对应属性也是对象，则递归合并 
    if (typeof b[key] === 'object' && b[key] !== null && !Array.isArray(b[key])) {
      if (a[key] && typeof a[key] === 'object' && !Array.isArray(a[key])) {
        output[key] = deepMerge(a[key], b[key]);
      } else {
        // 如果 a 中没有对应属性或不是对象，直接覆盖 
        output[key] = b[key];
      }
    } else {
      // 非对象属性或数组，直接覆盖（可根据需求调整数组的处理逻辑）
      output[key] = b[key];
    }
  }

  return output;
}