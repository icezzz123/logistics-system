import type { LocationQuery, LocationQueryValue } from 'vue-router'

function pickFirstQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

export function readQueryString(query: LocationQuery, key: string) {
  const value = pickFirstQueryValue(query[key])
  if (typeof value !== 'string') {
    return undefined
  }
  const text = value.trim()
  return text ? text : undefined
}

export function readQueryNumber(query: LocationQuery, key: string) {
  const text = readQueryString(query, key)
  if (typeof text === 'undefined') {
    return undefined
  }
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

export function readQueryEnum<T extends string>(query: LocationQuery, key: string, options: readonly T[]) {
  const value = readQueryString(query, key)
  if (!value) {
    return undefined
  }
  return options.includes(value as T) ? (value as T) : undefined
}
