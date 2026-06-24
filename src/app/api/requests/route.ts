import { ClientRequest, tableRequests, FIELDS } from "@/lib";
import { NextRequest, NextResponse } from "next/server";

// Коди способів доставки → людські назви (для Airtable та Telegram)
const DELIVERY_LABELS: Record<string, string> = {
  novaposhta: "Нова Пошта",
  auto: "Delivery Auto",
  private: "Приватні перевізники",
};

export async function POST(request: NextRequest) {
  try {
    // Парсимо JSON з тіла запиту
    const body = await request.json() as ClientRequest;
    const { name, phoneNumber, orders, deliveryMethod, deliveryCity, deliveryWarehouse } = body;
    const deliveryLabel = deliveryMethod ? DELIVERY_LABELS[deliveryMethod] : "";

    // Базова валідація
    if (!name || !phoneNumber) {
      return NextResponse.json(
        { error: 'Ім\'я та контактний спосіб (телефон або пошта) є обов\'язковими' },
        { status: 400 }
      );
    }

    // 1. Номер замовлення приходить з клієнта; якщо ні — генеруємо тут як запасний варіант
    const orderNumber = body.orderNumber || Math.floor(100000 + Math.random() * 900000).toString();

    // Збираємо ID товарів для Airtable на основі нової структури
    let linkedProductIds: string[] = [];
    if (orders && Array.isArray(orders)) {
      const allProductIds = orders.map(item => item.id || item.id);
      linkedProductIds = Array.from(new Set(allProductIds)); 
    }

    // 2. Створюємо запис в Airtable, додаючи "Номер замовлення"
    const newRecord = await tableRequests.create([
      {
        fields: {
          [FIELDS.request.name]: name,
          [FIELDS.request.phoneNumber]: phoneNumber || '',
          [FIELDS.request.orderNumber]: orderNumber,
          ...(deliveryLabel && { [FIELDS.request.delivery]: deliveryLabel }),
          ...(deliveryCity && { [FIELDS.request.deliveryCity]: deliveryCity }),
          ...(deliveryWarehouse && { [FIELDS.request.deliveryWarehouse]: deliveryWarehouse }),
          ...(linkedProductIds.length > 0 && { [FIELDS.request.orders]: linkedProductIds })
        }
      }
    ]);

    // =====================================================================
    // ГЕНЕРАЦІЯ ТА ВІДПРАВКА ПОВІДОМЛЕННЯ В TELEGRAM
    // =====================================================================
    try {
      let messageText = "";

      // ПЕРЕВІРКА: Якщо кошик порожній -> це просто консультація
      if (!orders || orders.length === 0) {
        messageText = 
          `💡 <b>Запит на консультацію!</b>\n` +
          `🔖 <b>Запит №:</b> ${orderNumber}\n\n` +
          `👤 <b>Ім'я:</b> ${name}\n` +
          `📞 <b>Телефон:</b> ${phoneNumber}\n\n`;
      } 
      // ІНАКШЕ: Це повноцінне замовлення
      else {
        let totalSum = 0;
        let productsListText = "\n\n🛍 <b>Деталі замовлення:</b>\n";
        
        orders.forEach((item, index) => {
          const itemQuantity = item.quantity || 1;
          const itemTotal = item.price * itemQuantity;
          totalSum += itemTotal;
          
          const optionNames = item.options?.map((o) => o.name).join(' / ') || '';
          const articleLine = item.sku ? ` [Art: ${item.sku}]` : '';

          productsListText += `${index + 1}. ${item.title}${articleLine}\n`;
          if (optionNames) productsListText += `   🎨 ${optionNames}\n`;
          productsListText += `   ${itemQuantity} шт. x ${item.price.toLocaleString('uk-UA')} ₴ = <b>${itemTotal.toLocaleString('uk-UA')} ₴</b>\n`;
        });

        const deliveryText =
          deliveryLabel || deliveryCity || deliveryWarehouse
            ? `\n\n🚚 <b>Доставка${deliveryLabel ? ` (${deliveryLabel})` : ""}:</b>\n` +
              (deliveryCity ? `   🏙 ${deliveryCity}\n` : "") +
              (deliveryWarehouse ? `   🏤 ${deliveryWarehouse}\n` : "")
            : "";

        messageText =
          `🎉 <b>Нове замовлення!</b>\n` +
          `🔖 <b>Замовлення №:</b> ${orderNumber}\n\n` +
          `👤 <b>Ім'я:</b> ${name}\n` +
          `📞 <b>Телефон:</b> ${phoneNumber}` +
          deliveryText +
          productsListText +
          `\n💰 <b>Загальна сума до сплати:</b> ${totalSum.toLocaleString('uk-UA')} ₴`;
      }

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

    // Повертаємо успішну відповідь з номером замовлення
    return NextResponse.json({ 
      success: true, 
      data: {
        id: newRecord[0].id,
        name: newRecord[0].get(FIELDS.request.name),
        orderNumber: orderNumber,
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