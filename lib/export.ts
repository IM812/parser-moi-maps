import type { Lead } from "./types"

const COLUMNS: { header: string; get: (l: Lead) => string }[] = [
  { header: "Название", get: (l) => l.name },
  { header: "Адрес", get: (l) => l.address },
  { header: "Телефон", get: (l) => l.phone },
  { header: "Сайт", get: (l) => l.website },
  { header: "Email", get: (l) => l.email },
  { header: "Telegram", get: (l) => l.telegram },
  { header: "WhatsApp", get: (l) => l.whatsapp },
  { header: "ВКонтакте", get: (l) => l.vk },
  { header: "Instagram", get: (l) => l.instagram },
  { header: "Часы работы", get: (l) => l.hours },
  { header: "Тип", get: (l) => l.category },
  { header: "На карте", get: (l) => l.mapUrl },
]

export function fileBaseName(city: string, rubric: string) {
  const date = new Date().toISOString().slice(0, 10)
  return `${city}_${rubric}_${date}`.replace(/[\\/:*?"<>|\s]+/g, "_")
}

export async function exportXlsx(leads: Lead[], baseName: string) {
  const { default: writeExcelFile } = await import("write-excel-file/browser")
  const header = COLUMNS.map((c) => ({ value: c.header, fontWeight: "bold" as const }))
  const rows = leads.map((lead) => COLUMNS.map((c) => c.get(lead) || null))
  await writeExcelFile([header, ...rows], {
    columns: COLUMNS.map((c) => ({ width: c.header === "Название" || c.header === "Адрес" ? 40 : 22 })),
    stickyRowsCount: 1,
  }).toFile(`${baseName}.xlsx`)
}

export function exportCsv(leads: Lead[], baseName: string) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    COLUMNS.map((c) => escape(c.header)).join(";"),
    ...leads.map((lead) => COLUMNS.map((c) => escape(c.get(lead))).join(";")),
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${baseName}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
