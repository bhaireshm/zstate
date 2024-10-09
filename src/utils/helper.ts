import type { DeepPartial } from "..";

export function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key as keyof DeepPartial<T>])) {
        if (!(key in target)) {
          Object.assign(output as object, { [key]: source[key as keyof DeepPartial<T>] });
        } else {
          output[key as keyof T] = deepMerge(target[key as keyof T], source[key as keyof DeepPartial<T>] as DeepPartial<T[keyof T]>);
        }
      } else {
        Object.assign(output as object, { [key]: source[key as keyof DeepPartial<T>] });
      }
    });
  }
  return output;
}

export function isObject(item: unknown): item is object {
  return typeof item === 'object' && item !== null && !Array.isArray(item);
}

export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
}

export function removeNestedProperty(obj: any, path: string): any {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((prev, curr) => prev?.[curr], obj);
  if (parent && last) {
    delete parent[last];
  }
  return obj;
}
