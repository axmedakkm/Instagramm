"use client";

import { Check, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/useTranslation";
import { LANGUAGES } from "@/i18n/messages";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguageStore } from "@/store/useLanguageStore";

export default function LanguagePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="flex items-center gap-2 border-b border-border px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.back")}
          className="size-8"
          onClick={() => router.back()}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="text-xl font-semibold">{t("language.title")}</h1>
      </header>

      <p className="px-4 pt-4 text-sm text-muted-foreground">
        {t("language.desc")}
      </p>

      <div className="p-2">
        {LANGUAGES.map((option) => {
          const isSelected = option.code === language;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-accent"
            >
              <span
                className={cn(
                  "flex-1 text-sm",
                  isSelected && "font-semibold",
                )}
              >
                {option.nativeLabel}
              </span>
              {isSelected && <Check className="size-5 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
