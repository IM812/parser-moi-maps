import { NextResponse } from "next/server"
import { searchCities } from "@/lib/osm"

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 2 || q.length > 100) return NextResponse.json({ cities: [] })

  try {
    const cities = await searchCities(q)
    return NextResponse.json({ cities })
  } catch {
    return NextResponse.json({ error: "Не удалось получить список городов" }, { status: 502 })
  }
}
