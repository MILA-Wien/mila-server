import { readItems } from "@directus/sdk";

let loaded = false;
let loadPromise: Promise<ShiftsCategory[]> = Promise.resolve([]);

export function useShiftsCategories() {
  const data = useState<ShiftsCategory[]>("shifts_categories", () => []);
  const dict = useState<Record<string, ShiftsCategory>>(
    "shifts_categories_dict",
    () => ({}),
  );

  if (!loaded) {
    loadPromise = loadData().then((categories) => {
      data.value = categories;
      dict.value = categories.reduce((acc, category) => {
        acc[category.id] = category;
        return acc;
      }, {});
      loaded = true;
      return categories;
    });
  }
  return { data, dict, loaded, loadPromise };
}

async function loadData() {
  const directus = useDirectus();
  return await directus.request(
    readItems("shifts_categories", {
      limit: -1,
      fields: ["id", "name", "beschreibung", "for_all"],
    }),
  );
}
