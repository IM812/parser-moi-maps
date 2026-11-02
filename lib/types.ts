export type City = {
  id: string
  name: string
  description: string
  osmType: "node" | "way" | "relation"
  osmId: number
  lat: number
  lon: number
  bbox: [south: number, west: number, north: number, east: number]
}

export type Lead = {
  id: string
  name: string
  category: string
  address: string
  phone: string
  website: string
  email: string
  telegram: string
  vk: string
  instagram: string
  whatsapp: string
  hours: string
  lat: number
  lon: number
  mapUrl: string
}

export type SearchRequest = {
  city: City
  categoryId: string
  keyword?: string
  limit: number
}

export type SearchResponse = {
  leads: Lead[]
  total: number
  duplicatesRemoved: number
}
