"use client"

import { useState } from "react"
import useSWRMutation from "swr/mutation"
import { Loader2, Play } from "lucide-react"
import { CATEGORIES, getCategory } from "@/lib/categories"
import { fileBaseName } from "@/lib/export"
import type { City, SearchRequest, SearchResponse } from "@/lib/types"
import { CityPicker } from "./city-picker"
import { ResultsTable } from "./results-table"

async function runSearch(url: string, { arg }: { arg: SearchRequest }) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? "Ошибка сбора")
  return json as SearchResponse
}

const LIMITS = [100, 300, 1000, 3000]

export function LeadParser() {
  const [city, setCity] = useState<City | null>(null)
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id)
  const [keyword, setKeyword] = useState("")
  const [limit, setLimit] = useState(300)
  const [lastRun, setLastRun] = useState<{ city: string; rubric: string } | null>(null)

  const { trigger, data, error, isMutating } = useSWRMutation("/api/search", runSearch)

  const needsKeyword = categoryId === "any" && !keyword.trim()
  const canStart = !!city && !needsKeyword && !isMutating

  async function start(e: React.FormEvent) {
    e.preventDefault()
    if (!city || needsKeyword) return
    try {
      await trigger({ city, categoryId, keyword: keyword.trim() || undefined, limit })
      setLastRun({ city: city.name, rubric: keyword.trim() || getCategory(categoryId)?.label || categoryId })
    } catch {
      // error is exposed through useSWRMutation
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={start}
        className="grid gap-4 rounded-md border border-border bg-surface p-4 md:grid-cols-2 md:p-6 lg:grid-cols-[1.2fr_1.2fr_1fr_auto] lg:items-start"
      >
        <CityPicker value={city} onChange={setCity} />

        <div>
          <label htmlFor="category" className="mb-2 block text-sm font-medium text-muted-foreground">
            Рубрика
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus:border-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="keyword" className="mb-2 block text-sm font-medium text-muted-foreground">
            Слово в названии {categoryId === "any" ? "" : "(необязательно)"}
          </label>
          <input
            id="keyword"
            value={keyword}
            maxLength={60}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="кофе, барбер, суши…"
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-base outline-none placeholder:text-muted-foreground/70 focus:border-primary"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
          <span className="text-sm font-medium text-muted-foreground" id="limit-label">
            Лимит
          </span>
          <div className="flex gap-2">
            <div role="radiogroup" aria-labelledby="limit-label" className="flex rounded-md border border-border bg-background p-1">
              {LIMITS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={limit === n}
                  onClick={() => setLimit(n)}
                  className={`h-9 rounded px-2.5 font-mono text-sm ${
                    limit === n ? "bg-surface-raised text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!canStart}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:flex-none"
            >
              {isMutating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              {isMutating ? "Собираю…" : "Начать сбор"}
            </button>
          </div>
        </div>
      </form>

      <div aria-live="polite">
        {isMutating && (
          <p className="rounded-md border border-border bg-surface px-4 py-6 text-center text-muted-foreground">
            Опрашиваю карту. Для больших городов это может занять до минуты.
          </p>
        )}
        {error && !isMutating && (
          <p role="alert" className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
            {error.message}
          </p>
        )}
        {!isMutating && !error && !data && (
          <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-muted-foreground">
            Выберите город из подсказок, рубрику и нажмите «Начать сбор».
          </p>
        )}
      </div>

      {data && !isMutating && lastRun && (
        <ResultsTable
          key={`${lastRun.city}-${lastRun.rubric}-${data.total}`}
          leads={data.leads}
          duplicatesRemoved={data.duplicatesRemoved}
          baseName={fileBaseName(lastRun.city, lastRun.rubric)}
        />
      )}
    </div>
  )
}
