import { NextResponse } from "next/server";

const MAX_MESSAGE_LENGTH = 2000;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const message =
    typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
      ? body.message.trim()
      : "";

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.FEEDBACK_EMAIL;

  if (!apiKey || !toEmail) {
    console.error("Feedback not configured: set RESEND_API_KEY and FEEDBACK_EMAIL");
    return NextResponse.json({ error: "Feedback is not configured yet" }, { status: 503 });
  }

  const fromEmail = process.env.FEEDBACK_FROM_EMAIL ?? "Labmate <onboarding@resend.dev>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: "Labmate feedback",
      text: message,
    }),
  });

  if (!response.ok) {
    console.error("Failed to send feedback email:", await response.text());
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
