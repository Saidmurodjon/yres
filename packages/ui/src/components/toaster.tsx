import { Toaster as SonnerToaster } from "sonner";

export { toast } from "sonner";

/**
 * Sonner's own `theme` prop only understands "light"/"dark"/"system" and
 * has no idea about this repo's `data-theme` attribute (see globals.css) —
 * "system" is the closest match today (follows `prefers-color-scheme`,
 * same as the app's current unthemed default). Once the manual light/dark
 * toggle lands (docs/i18n-and-appearance.md), wire its value in here too.
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="system"
      toastOptions={{
        classNames: {
          toast: "border border-border bg-popover text-popover-foreground shadow-lg",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
