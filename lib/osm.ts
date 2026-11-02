import type { Category } from "./categories"
import type { City, Lead } from "./types"

const USER_AGENT = "LeadGenFree/1.0 (open-source lead parser)"

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
]

type NominatimItem = {
  place_id: number
  osm_type: "node" | "way" | "relation"
  osm_id: number
  lat: string
  lon: string
  name: string
  display_name: string
  addresstype?: string
}

export async function searchCities(query: string): Promise<City[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", query)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "8")
  url.searchParams.set("accept-language", "ru")
  url.searchParams.set("featureType", "settlement")

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 60 * 60 * 24 },
  })
  if (!res.ok) throw new Error(`Nominatim: ${res.status}`)
  const items = (await res.json()) as NominatimItem[]

  return items.map((item) => ({
    id: `${item.osm_type}-${item.osm_id}`,
    name: item.name || item.display_name.split(",")[0],
    description: item.display_name.split(",").slice(1, 4).join(",").trim(),
    osmType: item.osm_type,
    osmId: item.osm_id,
    lat: Number(item.lat),
    lon: Number(item.lon),
  }))
}

function escapeRegex(value: string) {
  return value.replace(/[\\"^$.*+?()[\]{}|]/g, "\\$&")
}

function buildQuery(city: City, category: Category, keyword: string | undefined, limit: number) {
  const nameFilter = keyword?.trim() ? `["name"~"${escapeRegex(keyword.trim())}",i]` : '["name"]'

  let areaSetup = ""
  let scope = ""
  if (city.osmType === "relation") {
    areaSetup = `area(id:${3600000000 + city.osmId})->.city;`
    scope = "(area.city)"
  } else if (city.osmType === "way") {
    areaSetup = `area(id:${2400000000 + city.osmId})->.city;`
    scope = "(area.city)"
  } else {
    scope = `(around:12000,${city.lat},${city.lon})`
  }

  const parts = category.selectors.map((sel) => `nwr${sel}${nameFilter}${scope};`).join("")
  return `[out:json][timeout:90];${areaSetup}(${parts});out center tags ${limit};`
}

type OverpassElement = {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

async function runOverpass(query: string): Promise<OverpassElement[]> {
  let lastError: unknown
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
        signal: AbortSignal.timeout(95_000),
      })
      if (!res.ok) {
        lastError = new Error(`${endpoint}: ${res.status}`)
        continue
      }
      const json = (await res.json()) as { elements: OverpassElement[] }
      return json.elements ?? []
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Overpass недоступен")
}

const pick = (tags: Record<string, string>, ...keys: string[]) => {
  for (const key of keys) if (tags[key]) return tags[key].trim()
  return ""
}

function formatAddress(tags: Record<string, string>) {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(", ")
  const extra = tags["addr:unit"] || tags["addr:flats"] ? `, ${tags["addr:unit"] || tags["addr:flats"]}` : ""
  const city = tags["addr:city"]
  return [city, street ? street + extra : ""].filter(Boolean).join(", ") || tags["addr:full"] || ""
}

function describeKind(tags: Record<string, string>) {
  for (const key of ["amenity", "shop", "office", "craft", "leisure", "tourism", "healthcare"]) {
    if (tags[key]) return `${key}:${tags[key]}`
  }
  return ""
}

function toLead(el: OverpassElement): Lead | null {
  const tags = el.tags ?? {}
  const name = tags.name?.trim()
  if (!name) return null
  const lat = el.lat ?? el.center?.lat ?? 0
  const lon = el.lon ?? el.center?.lon ?? 0

  return {
    id: `${el.type}/${el.id}`,
    name,
    category: describeKind(tags),
    address: formatAddress(tags),
    phone: pick(tags, "phone", "contact:phone", "contact:mobile", "mobile"),
    website: pick(tags, "website", "contact:website", "url"),
    email: pick(tags, "email", "contact:email"),
    telegram: pick(tags, "contact:telegram", "telegram"),
    vk: pick(tags, "contact:vk", "vk"),
    instagram: pick(tags, "contact:instagram", "instagram"),
    whatsapp: pick(tags, "contact:whatsapp", "whatsapp"),
    hours: pick(tags, "opening_hours"),
    lat,
    lon,
    mapUrl: `https://yandex.ru/maps/?pt=${lon},${lat}&z=18&l=map`,
  }
}

function normalizePhone(phone: string) {
  const first = phone.split(/[;,]/)[0]
  const digits = first.replace(/\D/g, "")
  return digits.slice(-10)
}

function dedupe(leads: Lead[]) {
  const seen = new Set<string>()
  const result: Lead[] = []
  for (const lead of leads) {
    const keys = [`n:${lead.name.toLowerCase()}|${lead.address.toLowerCase()}`]
    const phone = normalizePhone(lead.phone)
    if (phone.length >= 7) keys.push(`p:${phone}`)
    if (keys.some((k) => seen.has(k))) continue
    keys.forEach((k) => seen.add(k))
    result.push(lead)
  }
  return result
}

export async function searchLeads(city: City, category: Category, keyword: string | undefined, limit: number) {
  const elements = await runOverpass(buildQuery(city, category, keyword, limit))
  const raw = elements.map(toLead).filter((l): l is Lead => l !== null)
  const leads = dedupe(raw)
  return { leads, total: raw.length, duplicatesRemoved: raw.length - leads.length }
}
