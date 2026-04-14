import type { NotificationEvent } from "@/types/core";

export async function dispatchTwilioNotification(notification: NotificationEvent) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.TWILIO_ALERT_TO;

  if (!sid || !token || !from || !to) {
    return {
      ok: false,
      skipped: true,
      reason: "Twilio env vars not configured",
    };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  if (notification.channels.includes("sms")) {
    const smsResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: `${notification.title}\n${notification.body}`,
      }),
    });

    if (!smsResponse.ok) {
      return {
        ok: false,
        skipped: false,
        reason: `Twilio SMS failed with status ${smsResponse.status}`,
      };
    }
  }

  return {
    ok: true,
    skipped: false,
  };
}
