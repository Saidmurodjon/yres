import type { Env } from "../index";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends transactional email via Resend's HTTP API (no SDK needed — a plain
 * fetch call works fine on Workers and keeps this dependency-free). If
 * RESEND_API_KEY isn't configured (local dev without a key), this logs
 * instead of throwing so auth flows that call it don't hard-fail — but it
 * does throw on an actual Resend API error, since a silently-dropped
 * password-reset email is worse than a visible 500.
 */
export async function sendEmail(env: Env, { to, subject, html }: SendEmailInput): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY not set — skipping send of "${subject}" to ${to}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || "YRES <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}
