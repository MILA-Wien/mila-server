type types = "error" | "success" | "warn" | "info";
type colors = "error" | "success" | "warning" | "info";

const toastDefaults: Record<types, { title: string; description: string; color: colors; icon: string }> = {
  error:   { title: "Error",   description: "An error occurred",    color: "error",   icon: "i-heroicons-exclamation-triangle" },
  success: { title: "Success", description: "Operation successful", color: "success", icon: "i-heroicons-check" },
  warn:    { title: "Warning", description: "",                     color: "warning", icon: "i-heroicons-exclamation-triangle" },
  info:    { title: "Info",    description: "",                     color: "info",    icon: "i-heroicons-information-circle" },
};

export function showToast(options: {
  type?: types;
  title?: string;
  description?: any;
  icon?: string;
  color?: colors;
}) {
  const toast = useToast();
  const type = options.type ?? "info";
  const defaults = toastDefaults[type];

  toast.add({
    title: options.title ?? defaults.title,
    description: options.description ?? defaults.description,
    icon: options.icon ?? defaults.icon,
    color: options.color ?? defaults.color,
  });
}
