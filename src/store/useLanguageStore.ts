import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Language = "en" | "ru" | "tg";

/**
 * The app's chosen UI language, persisted to localStorage — same pattern as
 * `useThemeStore`. Components read it through `useTranslation()`; changing it
 * re-renders everything that calls that hook, so the whole UI switches at once.
 */
interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "instagramm-language",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
