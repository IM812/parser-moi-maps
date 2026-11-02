export type Category = {
  id: string
  label: string
  selectors: string[]
}

export const CATEGORIES: Category[] = [
  {
    id: "food",
    label: "Кафе и рестораны",
    selectors: ['["amenity"~"^(cafe|restaurant|fast_food|bar|pub|food_court)$"]'],
  },
  {
    id: "beauty",
    label: "Салоны красоты и барбершопы",
    selectors: ['["shop"~"^(beauty|hairdresser|cosmetics|massage|tattoo)$"]'],
  },
  {
    id: "dentist",
    label: "Стоматологии",
    selectors: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  },
  {
    id: "clinic",
    label: "Медицинские центры",
    selectors: ['["amenity"~"^(clinic|doctors)$"]', '["healthcare"~"^(clinic|doctor|centre)$"]'],
  },
  {
    id: "auto",
    label: "Автосервисы и автомойки",
    selectors: ['["shop"~"^(car_repair|tyres|car_parts|car)$"]', '["amenity"="car_wash"]'],
  },
  {
    id: "fitness",
    label: "Фитнес и спорт",
    selectors: ['["leisure"~"^(fitness_centre|sports_centre|dance)$"]'],
  },
  {
    id: "hotel",
    label: "Гостиницы и хостелы",
    selectors: ['["tourism"~"^(hotel|hostel|guest_house|motel|apartment)$"]'],
  },
  {
    id: "clothes",
    label: "Одежда и обувь",
    selectors: ['["shop"~"^(clothes|shoes|boutique|bag|jewelry)$"]'],
  },
  {
    id: "grocery",
    label: "Продукты и пекарни",
    selectors: ['["shop"~"^(supermarket|convenience|bakery|butcher|confectionery|greengrocer)$"]'],
  },
  {
    id: "pharmacy",
    label: "Аптеки",
    selectors: ['["amenity"="pharmacy"]'],
  },
  {
    id: "legal",
    label: "Юристы и нотариусы",
    selectors: ['["office"~"^(lawyer|notary|accountant|tax_advisor)$"]'],
  },
  {
    id: "realty",
    label: "Агентства недвижимости",
    selectors: ['["office"="estate_agent"]'],
  },
  {
    id: "education",
    label: "Школы, курсы, автошколы",
    selectors: ['["amenity"~"^(language_school|driving_school|music_school|training|prep_school)$"]'],
  },
  {
    id: "repair",
    label: "Строительство и ремонт",
    selectors: [
      '["shop"~"^(hardware|doityourself|trade|paint|bathroom_furnishing|tiles)$"]',
      '["craft"~"^(builder|plumber|electrician|carpenter|roofer|window_construction)$"]',
    ],
  },
  {
    id: "flowers",
    label: "Цветы и подарки",
    selectors: ['["shop"~"^(florist|gift)$"]'],
  },
  {
    id: "pets",
    label: "Ветклиники и зоотовары",
    selectors: ['["amenity"="veterinary"]', '["shop"="pet"]'],
  },
  {
    id: "offices",
    label: "Все офисы компаний",
    selectors: ['["office"]'],
  },
  {
    id: "any",
    label: "Любые организации (по ключевому слову)",
    selectors: ['["amenity"]', '["shop"]', '["office"]', '["craft"]', '["leisure"]', '["tourism"]', '["healthcare"]'],
  },
]

export function getCategory(id: string) {
  return CATEGORIES.find((c) => c.id === id)
}
