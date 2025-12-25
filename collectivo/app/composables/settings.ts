export function useSettings() {
  const settingsState = useState<null | SettingsHidden>("settings", () => null);
  const fetchSettings = async () => {
    if (!settingsState.value) {
      settingsState.value = await $fetch<SettingsHidden>("/api/settings");
    }
    return settingsState;
  };
  return { settingsState, fetchSettings };
}
