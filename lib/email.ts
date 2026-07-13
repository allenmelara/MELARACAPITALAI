import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

// Plain, non-marketing formatting — matches the app's tone elsewhere
// (no promotional styling, just the notification's own title/body).
function toHtml(title: string, body: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://melaracapitalai.vercel.app";
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="margin: 0 0 12px;">${title}</h2>
    <p style="margin: 0 0 20px; line-height: 1.5;">${body}</p>
    <a href="${appUrl}/dashboard" style="color: #0a5c36;">View your dashboard</a>
    <p style="margin-top: 32px; font-size: 12px; color: #666;">
      Melara Capital AI — manage notification preferences in
      <a href="${appUrl}/dashboard/settings" style="color: #666;">Settings</a>.
    </p>
  </body>
</html>`;
}

// Additive only — a failed or unconfigured email send must never block
// in-app notification creation (the cron route creates the notification row
// first, then calls this separately and logs a warning on failure).
export async function sendNotificationEmail(to: string, notification: { title: string; body: string }): Promise<void> {
  const resend = getClient();
  if (!resend) return;

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: notification.title,
    html: toHtml(notification.title, notification.body)
  });
  if (error) throw new Error(typeof error === "string" ? error : JSON.stringify(error));
}
