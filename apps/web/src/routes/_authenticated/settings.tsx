import { createFileRoute } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@yres/ui";
import { Moon, Monitor, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type SupportedLanguage, SUPPORTED_LANGUAGES } from "../../i18n";
import type { ThemePreference } from "../../stores/use-theme-store";
import { useThemeStore } from "../../stores/use-theme-store";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  uz: "O'zbek",
  ru: "Русский",
  en: "English",
};

const THEME_ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function SettingsPage() {
  const { t, i18n } = useTranslation("settings");
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("description")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("appearance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(["light", "dark", "system"] as const).map((option) => {
              const Icon = THEME_ICONS[option];
              return (
                <Button
                  key={option}
                  type="button"
                  variant={theme === option ? "default" : "outline"}
                  onClick={() => setTheme(option)}
                >
                  <Icon className="h-4 w-4" />
                  {t(option)}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">{t("languageDescription")}</p>
          <Select
            value={i18n.language}
            onValueChange={(value) => i18n.changeLanguage(value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
