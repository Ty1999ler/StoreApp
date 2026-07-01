// Shared domain types used by both the Express backend and the React client.

export type GarmentType =
  | "tshirt"
  | "dress"
  | "pants"
  | "jacket"
  | "shoes"
  | "accessory";

export interface Color {
  name: string;
  hex: string;
  /** Optional per-colour hero photo — when set, the detail view swaps to it. */
  image?: string;
}

export interface Collection {
  id: string;
  /** Brand label, e.g. "HUGO BOSS". */
  label: string;
  /** Short tab label, e.g. "Men's". */
  tab: string;
}

// The two storefronts. Order here is the order they appear in the nav.
export const COLLECTIONS: Collection[] = [
  { id: "dynamite", label: "Dynamite", tab: "Women's" },
  { id: "hugo-boss", label: "HUGO BOSS", tab: "Men's" },
];

export interface Product {
  id: string;
  /** Which storefront this belongs to (see COLLECTIONS). */
  collection: string;
  /** The code printed on the floor display tag the customer scans. */
  tagCode: string;
  name: string;
  brand: string;
  category: string;
  garment: GarmentType;
  price: number;
  description: string;
  colors: Color[];
  sizes: string[];
  /** Hero photo path under /public; falls back to the SVG icon if it fails. */
  image?: string;
}

/** Where a requested item should be staged. */
export type Destination = "fitting_room" | "checkout";

/** Lifecycle of a single requested item. */
export type ItemStatus =
  | "in_basket" // customer added it, not yet sent anywhere
  | "requested" // sent to fulfillment, waiting for staff to claim
  | "picking" // staff has claimed it and is retrieving from stockroom
  | "staged" // physically placed at the room / counter
  | "kept" // customer tried it and wants to buy
  | "returned" // customer tried it and put it back
  | "purchased"; // paid for

export interface RequestItem {
  id: string;
  sessionId: string;
  productId: string;
  productName: string;
  brand: string;
  garment: GarmentType;
  image?: string;
  color: Color;
  size: string;
  price: number;
  /** Where staff should pull stock from — purely cosmetic flavor for the demo. */
  binLocation: string;
  destination: Destination;
  status: ItemStatus;
  createdAt: number;
  /** Wall-clock (ms) stamps for measuring fulfilment speed. */
  requestedAt?: number;
  pickedAt?: number;
  stagedAt?: number;
}

export type FittingRoomStatus = "available" | "assigned" | "occupied";

export interface FittingRoom {
  id: string;
  number: number;
  status: FittingRoomStatus;
  sessionId: string | null;
}

export interface Session {
  id: string;
  name: string;
  fittingRoomId: string | null;
  createdAt: number;
}

export type EventKind =
  | "request"
  | "assign"
  | "stage"
  | "keep"
  | "return"
  | "order"
  | "release";

export interface StoreEvent {
  id: number;
  ts: number;
  kind: EventKind;
  text: string;
}

/** Snapshot returned by GET /api/state and polled by every client. */
export interface StoreState {
  sessions: Session[];
  rooms: FittingRoom[];
  items: RequestItem[];
  /** sku ("productId|color|size") -> remaining stock count. */
  inventory: Record<string, number>;
  /** Most recent activity, oldest-first, capped server-side. */
  events: StoreEvent[];
}

export function skuKey(productId: string, color: string, size: string): string {
  return `${productId}|${color}|${size}`;
}

/** Example sales-tax rate, shared so client previews and server agree. */
export const TAX_RATE = 0.0875;

export interface ReceiptLine {
  id: string;
  name: string;
  color: string;
  size: string;
  price: number;
  image?: string;
  garment: GarmentType;
}

export interface Receipt {
  orderId: string;
  items: ReceiptLine[];
  subtotal: number;
  tax: number;
  total: number;
  count: number;
}
