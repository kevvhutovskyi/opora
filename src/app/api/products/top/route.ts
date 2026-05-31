import { getTopProducts } from "@/lib";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await getTopProducts();
    return NextResponse.json(response);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ error: 'Помилка видалення файлу' }, { status: 500 });
  }
} 