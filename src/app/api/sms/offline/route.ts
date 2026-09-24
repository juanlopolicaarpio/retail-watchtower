import { NextResponse } from "next/server";


export async function POST(request: Request) {
  const body = await request.json();
  if (!body.storeName || !body.storeUrl || !body.platform) {
    return NextResponse.json({ error: "Missing store details" }, { status: 400 });
  }

  return NextResponse.json({
    simulated: true,
    sent: 0,
    total: 2,
    branch: String(body.storeName).split("—").at(-1)?.trim() ?? "demo",
    message: "Offline escalation prepared for the store and area managers.",
  });
}
