import { getTopProducts } from "@/lib";
import { NextResponse } from "next/server";

// Топ-товари змінюються рідко — кешуємо на рівні CDN.
export const revalidate = 300;

export async function GET() {
  try {
    const response = await getTopProducts();
    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error('API Top Products Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}