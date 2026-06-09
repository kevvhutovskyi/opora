import { getTopProducts } from "@/lib";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await getTopProducts();
    return NextResponse.json(response);
  } catch (error) {
    console.error('API Top Products Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}