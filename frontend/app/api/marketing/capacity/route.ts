import { NextResponse } from "next/server";
import { computeCapacity } from "@/app/lib/marketing";

export const runtime = "nodejs";

// Public — powers the /pricing "N of Y seats remaining" badges.
export async function GET() {
  const capacity = await computeCapacity();
  return NextResponse.json({ capacity });
}
