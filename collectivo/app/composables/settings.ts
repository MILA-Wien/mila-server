import { readSingleton } from "@directus/sdk";

export function useSettings() {
  const settingsState = useState<null | SettingsHidden>("settings", () => null);
  const directus = useDirectus();
  const fetchSettings = async () => {
    if (!settingsState.value) {
      settingsState.value = await directus.request(
        readSingleton("settings_hidden"),
      );
    }
    return settingsState;
  };
  return { settingsState, fetchSettings };
}
