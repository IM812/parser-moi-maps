"use client"

import { useMemo, useState } from "react"
import { Download, ExternalLink, FileSpreadsheet, Search } from "lucide-react"
import type { Lead } from "@/lib/types"
import { exportCsv, exportXlsx } from "@/lib/export"

type Filter = "phone" | "website" | "email" | "social"

const FILTERS: { id: Filter; label: string; test: (l: Lead) => boolean }[] = [
  { id: "phone", label: "С телефоном", test: (l) => !!l.phone },
  { id: "website", label: "С сайтом", test: (l) => !!l.website },
  { id: "email", label: "С email", test: (l) => !!l.email },
  { id: "social", label: "С соцсетями", test: (l) => !!(l.telegram || l.vk || l.instagram || l.whatsapp) },
]

type Props = {
  leads: Lead[]
  duplicatesRemoved: number
  baseName: string
}

function hrefFor(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function ResultsTable({ leads, duplicatesRemoved, baseName }: Props) {
  const [active, setActive] = useState<Set<Filter>>(new Set())
  const [query, setQuery] = useState("")
  const [exporting, setExporting] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return leads.filter(
      (l) =>
        FILTERS.every((f) => !active.has(f.id) || f.test(l)) &&
        (!q || l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)),
    )
  }, [leads, active, query])

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, leads.filter(f.test).length])) as Record<Filter, number>,
    [leads],
  )

  function toggle(id: Filter) {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section aria-labelledby="results-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="results-title" className="text-lg font-semibold">
            Найдено: <span className="font-mono text-primary">{leads.length}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {duplicatesRemoved > 0 ? `Удалено дублей: ${duplicatesRemoved}. ` : ""}
            Показано: {visible.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!visible.length || exporting}
            onClick={async () => {
              setExporting(true)
              try {
                await exportXlsx(visible, baseName)
              } finally {
                setExporting(false)
              }
            }}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            Excel
          </button>
          <button
            type="button"
            disabled={!visible.length}
            onClick={() => exportCsv(visible, baseName)}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-surface-raised disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden="true" />
            CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Фильтры">
          {FILTERS.map((f) => {
            const on = active.has(f.id)
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(f.id)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm ${
                  on ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="font-mono text-xs">{counts[f.id]}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 md:ml-auto md:w-64">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
          <input
            aria-label="Поиск по результатам"
            placeholder="Поиск в результатах"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium">Организация</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Телефон</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Сайт / Email</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Соцсети</th>
              <th scope="col" className="px-3 py-2.5 font-medium">Часы</th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                <span className="sr-only">Карта</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l) => (
              <tr key={l.id} className="border-t border-border align-top hover:bg-surface-raised/50">
                <td className="max-w-72 px-3 py-2.5">
                  <span className="block font-medium">{l.name}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">{l.address || "Адрес не указан"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                  {l.phone ? (
                    l.phone.split(/;\s*/).map((p) => (
                      <a key={p} href={`tel:${p.replace(/[^\d+]/g, "")}`} className="block hover:text-primary">
                        {p}
                      </a>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="max-w-56 px-3 py-2.5 text-xs">
                  {l.website && (
                    <a href={hrefFor(l.website)} target="_blank" rel="noopener noreferrer" className="block truncate hover:text-primary">
                      {l.website.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "")}
                    </a>
                  )}
                  {l.email && (
                    <a href={`mailto:${l.email}`} className="block truncate text-muted-foreground hover:text-primary">
                      {l.email}
                    </a>
                  )}
                  {!l.website && !l.email && <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {[
                      ["TG", l.telegram],
                      ["WA", l.whatsapp],
                      ["VK", l.vk],
                      ["IG", l.instagram],
                    ]
                      .filter(([, v]) => v)
                      .map(([label, v]) => (
                        <span key={label} title={v} className="rounded bg-surface-raised px-1.5 py-0.5 font-mono">
                          {label}
                        </span>
                      ))}
                    {!l.telegram && !l.whatsapp && !l.vk && !l.instagram && <span className="text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="max-w-40 px-3 py-2.5 font-mono text-xs text-muted-foreground">{l.hours || "—"}</td>
                <td className="px-3 py-2.5">
                  <a
                    href={l.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                    <span className="sr-only">Открыть {l.name} на Яндекс Картах</span>
                  </a>
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                  Ничего не подходит под выбранные фильтры
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
