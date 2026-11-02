"use client"

import { useEffect, useId, useState } from "react"
import useSWR from "swr"
import { Loader2, MapPin } from "lucide-react"
import type { City } from "@/lib/types"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("fetch failed")
  return (await res.json()) as { cities: City[] }
}

type Props = {
  value: City | null
  onChange: (city: City | null) => void
}

export function CityPicker({ value, onChange }: Props) {
  const listId = useId()
  const [text, setText] = useState(value?.name ?? "")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 350)
    return () => clearTimeout(t)
  }, [text])

  const shouldFetch = open && debounced.length >= 2 && debounced !== value?.name
  const { data, isLoading } = useSWR(
    shouldFetch ? `/api/cities?q=${encodeURIComponent(debounced)}` : null,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  )
  const cities = shouldFetch ? (data?.cities ?? []) : []

  function select(city: City) {
    onChange(city)
    setText(city.name)
    setOpen(false)
  }

  return (
    <div className="relative">
      <label htmlFor={`${listId}-input`} className="mb-2 block text-sm font-medium text-muted-foreground">
        Город
      </label>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 focus-within:border-primary">
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={open && cities.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Например, Казань"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setActive(0)
            if (value) onChange(null)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!cities.length) return
            if (e.key === "ArrowDown") {
              e.preventDefault()
              setActive((i) => (i + 1) % cities.length)
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setActive((i) => (i - 1 + cities.length) % cities.length)
            } else if (e.key === "Enter") {
              if (e.nativeEvent.isComposing || e.keyCode === 229) return
              e.preventDefault()
              select(cities[active])
            } else if (e.key === "Escape") {
              setOpen(false)
            }
          }}
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
        />
        {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Загрузка" />}
      </div>

      {value && (
        <p className="mt-1.5 truncate text-xs text-muted-foreground">
          {value.description || "Выбран"}
        </p>
      )}

      {open && cities.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-surface-raised py-1 shadow-xl"
        >
          {cities.map((city, i) => (
            <li
              key={city.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                select(city)
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? "bg-primary/15" : ""}`}
            >
              <span className="block text-sm font-medium">{city.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{city.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
