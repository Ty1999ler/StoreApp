import type { Product, Destination, Receipt } from "../../shared/types";

async function post<T = any>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  async catalog(): Promise<Product[]> {
    const res = await fetch("/api/catalog");
    const data = await res.json();
    return data.products;
  },

  async scan(code: string): Promise<Product> {
    const res = await fetch(`/api/scan/${encodeURIComponent(code)}`);
    if (!res.ok) throw new Error("Unknown tag code");
    const data = await res.json();
    return data.product;
  },

  createSession: () => post<{ session: any }>("/api/session"),

  addToBasket: (args: {
    sessionId: string;
    productId: string;
    colorName: string;
    size: string;
    destination: Destination;
  }) => post("/api/basket/add", args),

  removeFromBasket: (itemId: string) =>
    post("/api/basket/remove", { itemId }),

  setDestination: (itemId: string, destination: Destination) =>
    post("/api/basket/destination", { itemId, destination }),

  sendToFittingRoom: (sessionId: string) =>
    post<{ roomNumber: number }>("/api/fulfill/fitting-room", { sessionId }),

  sendToCheckout: (sessionId: string) =>
    post("/api/fulfill/checkout", { sessionId }),

  staffAdvance: (itemId: string, action: "pick" | "stage") =>
    post("/api/staff/advance", { itemId, action }),

  decide: (itemId: string, decision: "keep" | "return") =>
    post("/api/try/decide", { itemId, decision }),

  roomAdd: (
    roomId: string,
    args: { productId: string; colorName: string; size: string }
  ) => post(`/api/room/${roomId}/add`, args),

  roomRelease: (roomId: string) =>
    post<{ restocked: number }>(`/api/room/${roomId}/release`),

  checkout: (sessionId: string) => post<Receipt>("/api/checkout", { sessionId }),

  reset: () => post("/api/reset"),
};
