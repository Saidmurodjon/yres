import { Check, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Shared shell for login/register: a split-screen brand panel + form on
 * `lg+`, collapsing to a compact logo strip above a full-width form below
 * `lg` (docs/ui-guidelines.md's breakpoint table — `lg` is the desktop
 * threshold) rather than squeezing the decorative panel onto phone/tablet
 * screens where it would just push the form below the fold.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation("auth");

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:px-16 lg:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2 text-xl font-semibold">
          <Zap className="h-6 w-6" />
          YRES
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-balance">
            {t("brand.tagline")}
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/90">
            {[t("brand.feature1"), t("brand.feature2"), t("brand.feature3")].map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} YRES
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 pt-8 pb-2 lg:hidden">
        <Zap className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">YRES</span>
      </div>

      <div className="flex-1 px-4 pt-4 pb-10 sm:px-6 lg:flex lg:items-center lg:justify-center lg:px-12 lg:py-16">
        <div className="mx-auto w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </div>
    </div>
  );
}
