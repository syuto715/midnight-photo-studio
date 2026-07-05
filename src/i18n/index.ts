import { en } from "./en";
import { ja, type TextKey } from "./ja";

const dictionaries = {
  ja,
  en
};

export type Locale = keyof typeof dictionaries;
export type { TextKey };

export function t(key: TextKey, locale: Locale = "ja"): string {
  return dictionaries[locale][key];
}
