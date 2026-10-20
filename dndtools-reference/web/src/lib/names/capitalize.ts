export function capitalizeWords(value: string): string {
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part.length === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}
