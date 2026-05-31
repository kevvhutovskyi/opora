import { ClientRequest, tableRequests } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Парсимо JSON з тіла запиту
    const body = await request.json() as ClientRequest;
    const { name, phoneNumber, orders } = body;

    // Базова валідація
    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Ім\'я та контактний спосіб (телефон або пошта) є обов\'язковими' },
        { status: 400 }
      );
    }

    // Збираємо ID товарів для Airtable на основі нової структури
    let linkedProductIds: string[] = [];
    if (orders && Array.isArray(orders)) {
      // Зі скріншоту видно, що у вас є productId (ID самого товару) та id (можливо, ID варіації). 
      // Беремо productId, а якщо його немає - беремо id.
      const allProductIds = orders.map(item => item.id || item.id);
      linkedProductIds = Array.from(new Set(allProductIds)); 
    }

    // Створюємо запис в Airtable
    const newRecord = await tableRequests.create([
      {
        fields: {
          "Ім'я": name,
          "Номер телефону": phoneNumber || '',
          ...(linkedProductIds.length > 0 && { "Замовлення": linkedProductIds })
        }
      }
    ]);

    // =====================================================================
    // ГЕНЕРАЦІЯ ТА ВІДПРАВКА ПОВІДОМЛЕННЯ В TELEGRAM
    // =====================================================================
    try {
      let totalSum = 0;
      let productsListText = "";

      // Формуємо красивий список на основі масиву зі скріншоту
      if (orders && Array.isArray(orders) && orders.length > 0) {
        productsListText = "\n\n🛍 <b>Деталі замовлення:</b>\n";
        
        orders.forEach((item, index) => {
          // Рахуємо суму для конкретної позиції (ціна * кількість)
          const itemQuantity = item.quantity || 1;
          const itemTotal = item.price * itemQuantity;
          totalSum += itemTotal;
          
          // Використовуємо назву варіації, якщо вона є (наприклад, 'Modelo Classic Black/Red')
          const itemName = item.variation ? item.variation : item.title;

          // Формат: 
          // 1. Modelo Classic Black/Red
          //    3 шт. x 1 115 ₴ = 3 345 ₴
          productsListText += `${index + 1}. ${itemName}\n   ${itemQuantity} шт. x ${item.price.toLocaleString('uk-UA')} ₴ = <b>${itemTotal.toLocaleString('uk-UA')} ₴</b>\n`;
        });
      }

      // Збираємо фінальний текст
      const messageText = 
        `🎉 <b>Нове замовлення!</b>\n\n` +
        `👤 <b>Ім'я:</b> ${name}\n` +
        `📞 <b>Телефон:</b> ${phoneNumber}` +
        productsListText +
        `\n💰 <b>Загальна сума до сплати:</b> ${totalSum.toLocaleString('uk-UA')} ₴`;

      // Відправляємо запит на ваш Telegram-роут
      const baseUrl = request.nextUrl.origin;
      await fetch(`${baseUrl}/api/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText, orders }),
      });
      
    } catch (notifyError) {
      console.error('Не вдалося відправити сповіщення в Telegram:', notifyError);
    }
    // =====================================================================

    // Повертаємо успішну відповідь
    return NextResponse.json({ 
      success: true, 
      data: {
        id: newRecord[0].id,
        name: newRecord[0].get("Ім'я"),
      },
      message: 'Запит успішно створено!' 
    }, { status: 201 });

  } catch (error) {
    console.error('API Create Request Error:', error);
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера при створенні запиту' }, 
      { status: 500 }
    );
  }
}