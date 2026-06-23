import { useState } from "react";
import type { GarmentType } from "../../shared/types";
import { GarmentIcon } from "./GarmentIcon";

/**
 * Shows the product's hero photo, filling its (sized, overflow-hidden) parent.
 * If the photo is missing or fails to load, it falls back to the tinted SVG
 * garment icon — so the catalog always renders something sensible.
 */
export function ProductImage({
  src,
  garment,
  hex,
  alt,
}: {
  src?: string;
  garment: GarmentType;
  hex: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt ?? garment}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-black/[0.04]">
      <GarmentIcon garment={garment} hex={hex} className="h-3/4 w-3/4" />
    </div>
  );
}
