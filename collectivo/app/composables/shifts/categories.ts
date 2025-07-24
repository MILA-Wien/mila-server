import { readItems } from "@directus/sdk";

let loaded = false;
let loadPromise: Promise<ShiftsCategory[]> = Promise.resolve([]);

export function useShiftsCategories() {
  const data = useState<ShiftsCategory[]>("shifts_categories", () => []);

  if (!loaded) {
    loadPromise = loadData().then((categories) => {
      data.value = categories;
      loaded = true;
      return categories;
    });
  }
  return { data, loaded, loadPromise };
}

async function loadData() {
  const directus = useDirectus();
  return await directus.request(
    readItems("shifts_categories", {
      limit: -1,
      fields: ["id", "name"],
    }),
  );
}
