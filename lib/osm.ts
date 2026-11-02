import type { Category } from "./categories"
import type { City, Lead } from "./types"

const USER_AGENT = "LeadGenFree/1.0 (open-source lead parser)"

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
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
  boundingbox: [string, string, string, string]
}

const MIN_HALF_SPAN = 0.06

function toBbox(item: NominatimItem): City["bbox"] {
  const [s, n, w, e] = item.boundingbox.map(Number)
  const lat = Number(item.lat)
  const lon = Number(item.lon)
  return [
    Math.min(s, lat - MIN_HALF_SPAN),
    Math.min(w, lon - MIN_HALF_SPAN * 1.8),
    Math.max(n, lat + MIN_HALF_SPAN),
    Math.max(e, lon + MIN_HALF_SPAN * 1.8),
  ]
}

export async function searchCities(query: string): Promise<City[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("q", query)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "8")
  url.searchParams.set("accept-language", "ru")
  url.searchParams.set("featureType", "settlement")
  url.searchParams.set("addressdetails", "0")

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
    bbox: toBbox(item),
  }))
}

function escapeRegex(value: string) {
  return value.replace(/[\\"^$.*+?()[\]{}|]/g, "\\$&")
}

function buildQuery(city: City, category: Category, keyword: string | undefined, limit: number) {
  const nameFilter = keyword?.trim() ? `["name"~"${escapeRegex(keyword.trim())}",i]` : '["name"]'

  // A bounding box uses Overpass's spatial index and is far cheaper than area() lookups,
  // which public mirrors frequently reject with 502/504 for large cities.
  const bbox = city.bbox.map((n) => n.toFixed(5)).join(",")
  const parts = category.selectors.map((sel) => `nwr${sel}${nameFilter};`).join("")
  return `[out:json][timeout:50][bbox:${bbox}];(${parts});out center tags ${limit};`
}

type OverpassElement = {
  type: "node" | "way" | "relation"
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const HEDGE_DELAY_MS = 4_000
const REQUEST_TIMEOUT_MS = 90_000

// Public Overpass mirrors are often slow or overloaded, so requests are hedged:
// the next mirror starts if the previous one hasn't answered within HEDGE_DELAY_MS,
// and the first successful response wins while the rest are aborted.
async function runOverpass(query: string): Promise<OverpassElement[]> {
  const controllers = OVERPASS_ENDPOINTS.map(() => new AbortController())
  let settled = false

  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint, i) => {
    if (i > 0) await new Promise((r) => setTimeout(r, i * HEDGE_DELAY_MS))
    if (settled) throw new Error("skipped")
    const timer = setTimeout(() => controllers[i].abort(), REQUEST_TIMEOUT_MS)
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
        signal: controllers[i].signal,
      })
      if (!res.ok) throw new Error(`${endpoint}: ${res.status}`)
      const json = (await res.json()) as { elements?: OverpassElement[]; remark?: string }
      if (!json.elements) throw new Error(json.remark ?? "empty response")
      return json.elements
    } finally {
      clearTimeout(timer)
    }
  })

  try {
    const elements = await Promise.any(attempts)
    return elements
  } catch {
    throw new Error("Overpass недоступен")
  } finally {
    settled = true
    controllers.forEach((c) => c.abort())
  }
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
