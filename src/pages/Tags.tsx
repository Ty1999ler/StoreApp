import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Product } from "../../shared/types";
import { api } from "../lib/api";

/**
 * The printable display tags that sit on the showroom floor — one per item.
 * Each encodes the item's tag code as a QR. Open this on one screen and scan a
 * tag from the shopper app on another device to see the real loop.
 */
export function Tags() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    api.catalog().then(setProducts);
  }, []);

  return (
    <div>
      <p className="mb-4 text-sm text-ink/50">
        These are the floor tags. In the shopper view, tap{" "}
        <span className="font-medium text-ink">Scan a tag</span> and point your
        camera at one — or tap it directly in the scan sheet.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-col items-center rounded-2xl border border-black/10 bg-white p-4 text-center"
          >
            <div className="rounded-xl bg-white p-2">
              <QRCodeSVG value={p.tagCode} size={104} level="M" />
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-wide text-ink/40">
              {p.brand}
            </div>
            <div className="text-sm font-medium leading-tight">{p.name}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-ink/50">
              <span className="font-mono">#{p.tagCode}</span>
              <span>·</span>
              <span>${p.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
