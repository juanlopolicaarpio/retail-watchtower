import { NextResponse } from "next/server";


export async function POST(request: Request) {
  const body = await request.json();
  if (!body.storeName || !Array.isArray(body.oosItems)) {
    return NextResponse.json({ error: "Missing stock-alert details" }, { status: 400 });
  }

  return NextResponse.json({
    simulated: true,
    sent: 0,
    total: 2,
    branch: String(body.storeName).split("—").at(-1)?.trim() ?? "demo",
    itemCount: body.oosItems.length,
    message: "Out-of-stock escalation prepared for the store and area managers.",
  });
}
