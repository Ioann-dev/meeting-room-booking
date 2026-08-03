export function trimStringValue({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}
