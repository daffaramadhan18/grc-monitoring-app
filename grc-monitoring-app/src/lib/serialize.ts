// Converts BigInt values to Number so they serialize safely to JSON
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_, v) =>
    typeof v === 'bigint' ? Number(v) : v
  ))
}
