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
      dict.value = categories.reduce(
        (acc, category) => {
          acc[category.id] = category;
          return acc;
        },
        {} as Record<string, ShiftsCategory>,
      );
      loaded = true;
      return categories;
    });
  }
  return { data, dict, loaded, loadPromise };
}

async function loadData() {
  return await $fetch<ShiftsCategory[]>("/api/shifts/categories");
}
