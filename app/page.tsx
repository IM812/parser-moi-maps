import { LeadParser } from "@/components/lead-parser"

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
          LeadGen Free
        </div>
        <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-4xl">
          Контакты компаний по городу и рубрике. Бесплатно и без ключей.
        </h1>
        <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          Телефоны, сайты, email и соцсети организаций из открытой карты OpenStreetMap. Дубли убираются автоматически,
          результат выгружается в Excel или CSV.
        </p>
      </header>

      <LeadParser />

      <footer className="mt-auto border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        Данные: © участники{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          OpenStreetMap
        </a>
        , лицензия ODbL. Полнота зависит от того, насколько хорошо организации отмечены на карте в вашем городе.
      </footer>
    </main>
  )
}
