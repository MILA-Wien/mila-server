import { parse } from "marked";

export function markdownToHtml(data: string) {
  try {
    return parse(data);
  } catch (error) {
    return "Error while loading text";
  }
}
