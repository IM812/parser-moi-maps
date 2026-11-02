import { NextResponse } from "next/server"
import { getCategory } from "@/lib/categories"
import { searchLeads } from "@/lib/osm"
import type { SearchRequest } from "@/lib/types"

export const maxDuration = 120

export async function POST(request: Request) {
  let body: SearchRequest
  try {
    body = (await request.json()) as SearchRequest
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 })
  }

  const { city, categoryId, keyword } = body
  const category = getCategory(categoryId)
  const osmId = Number(city?.osmId)
  const bbox = Array.isArray(city?.bbox) ? city.bbox.map(Number) : []
  const [south, west, north, east] = bbox
  const validBbox =
    bbox.length === 4 &&
    bbox.every(Number.isFinite) &&
    north > south &&
    east > west &&
    north - south < 3 &&
    east - west < 5
  if (
    !category ||
    !validBbox ||
    !Number.isInteger(osmId) ||
    !["node", "way", "relation"].includes(city?.osmType) ||
    !Number.isFinite(Number(city?.lat)) ||
    !Number.isFinite(Number(city?.lon))
  ) {
    return NextResponse.json({ error: "Выберите город из подсказок и рубрику" }, { status: 400 })
  }
  if (keyword && (typeof keyword !== "string" || keyword.length > 60)) {
    return NextResponse.json({ error: "Ключевое слово слишком длинное" }, { status: 400 })
  }
  if (category.id === "any" && !keyword?.trim()) {
    return NextResponse.json({ error: "Для «Любые организации» укажите ключевое слово" }, { status: 400 })
  }

  const limit = Math.min(Math.max(Math.floor(Number(body.limit) || 300), 10), 3000)

  try {
    const result = await searchLeads(
      { ...city, osmId, lat: Number(city.lat), lon: Number(city.lon), bbox: [south, west, north, east] },
      category,
      keyword,
      limit,
    )
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: "Сервер карт перегружен или не ответил. Попробуйте ещё раз через минуту." },
      { status: 502 },
    )
  }
}
