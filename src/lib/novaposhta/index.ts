// Серверний клієнт Нової Пошти.
// Працює лише на сервері (в route handlers) — API-ключ ніколи не потрапляє в браузер.
// Достатньо виставити змінну середовища NOVA_POSHTA_API_KEY — і все запрацює.

const NP_ENDPOINT = "https://api.novaposhta.ua/v2.0/json/";

export interface NpCity {
  ref: string;
  name: string;
  area: string;
}

export interface NpWarehouse {
  ref: string;
  name: string;
  number: string;
}

interface NpApiResponse<T> {
  success: boolean;
  data: T[];
  errors: string[];
  warnings: string[];
}

// Базовий виклик API Нової Пошти
async function npRequest<T>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, string>
): Promise<T[]> {
  const apiKey = process.env.NOVA_POSHTA_API_KEY;
  if (!apiKey) {
    throw new Error("NOVA_POSHTA_API_KEY не налаштовано");
  }

  const response = await fetch(NP_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey, modelName, calledMethod, methodProperties }),
    // Нова Пошта не має CDN-кешу для нас — кешуємо самі на короткий час
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Nova Poshta API error: ${response.status}`);
  }

  const json = (await response.json()) as NpApiResponse<T>;
  if (!json.success) {
    throw new Error(json.errors?.join(", ") || "Nova Poshta request failed");
  }
  return json.data;
}

// Пошук міст за рядком (для автозаповнення)
export async function searchCities(query: string): Promise<NpCity[]> {
  if (!query || query.trim().length < 2) return [];
  const data = await npRequest<{ Ref: string; Description: string; AreaDescription: string }>(
    "Address",
    "getCities",
    { FindByString: query.trim(), Limit: "20" }
  );
  return data.map((c) => ({ ref: c.Ref, name: c.Description, area: c.AreaDescription }));
}

// Мінімальна вантажопідйомність відділення, яку приймаємо (кг).
// Відсікає поштомати та малоформатні відділення (до 5 / 30-35 кг).
const MIN_WAREHOUSE_WEIGHT_KG = 200;

// Список відділень обраного міста (з опціональним фільтром за номером/назвою).
// Повертаємо ЛИШЕ повноцінні відділення, що приймають відправлення від 200 кг —
// без поштоматів і без малих відділень (5 / 35 кг).
export async function getWarehouses(cityRef: string, query = ""): Promise<NpWarehouse[]> {
  if (!cityRef) return [];
  const props: Record<string, string> = { CityRef: cityRef, Limit: "500" };
  if (query.trim()) props.FindByString = query.trim();
  const data = await npRequest<{
    Ref: string;
    Description: string;
    Number: string;
    CategoryOfWarehouse?: string;
    TotalMaxWeightAllowed?: string;
  }>("Address", "getWarehouses", props);

  return data
    .filter((w) => {
      // Виключаємо поштомати
      if (w.CategoryOfWarehouse === "Postomat") return false;
      // Лишаємо лише ті, що приймають відправлення вагою >= 200 кг
      const maxWeight = Number(w.TotalMaxWeightAllowed ?? 0);
      return maxWeight >= MIN_WAREHOUSE_WEIGHT_KG;
    })
    .map((w) => ({ ref: w.Ref, name: w.Description, number: w.Number }));
}
