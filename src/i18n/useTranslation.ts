"use client";

import { messages } from "@/i18n/messages";
import { useLanguageStore } from "@/store/useLanguageStore";

/**
 * The one hook every component uses to read translated text:
 *
 *   const { t } = useTranslation();
 *   <h1>{t("settings.title")}</h1>
 *
 * `t` looks the key up in the current language, falls back to English if it's
 * missing there, and finally returns the key itself so a missing string is
 * obvious rather than blank. No provider needed — it reads the Zustand store,
 * so switching language re-renders every component that calls it.
 */
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  const t = (key: string) =>
    messages[language][key] ?? messages.en[key] ?? key;

  return { t, language };
}
