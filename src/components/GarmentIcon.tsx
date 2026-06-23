import type { GarmentType } from "../../shared/types";

/**
 * Local, dependency-free product illustrations. Each garment type is a simple
 * silhouette filled with the selected colour, so the catalog always renders
 * with no network image calls.
 */
export function GarmentIcon({
  garment,
  hex,
  className,
}: {
  garment: GarmentType;
  hex: string;
  className?: string;
}) {
  const stroke = "rgba(0,0,0,0.18)";
  const common = {
    fill: hex,
    stroke,
    strokeWidth: 2,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={garment}
    >
      {garment === "tshirt" && (
        <path
          {...common}
          d="M44 22 L30 30 L20 44 L32 54 L40 48 L40 98 L80 98 L80 48 L88 54 L100 44 L90 30 L76 22 C70 32 50 32 44 22 Z"
        />
      )}
      {garment === "dress" && (
        <path
          {...common}
          d="M46 20 L34 30 L40 46 L36 54 L26 100 L94 100 L84 54 L80 46 L86 30 L74 20 C68 30 52 30 46 20 Z"
        />
      )}
      {garment === "pants" && (
        <path
          {...common}
          d="M38 18 L82 18 L84 60 L74 104 L62 104 L60 64 L58 104 L46 104 L36 60 Z"
        />
      )}
      {garment === "jacket" && (
        <>
          <path
            {...common}
            d="M44 20 L28 30 L18 46 L30 56 L38 50 L38 100 L82 100 L82 50 L90 56 L102 46 L92 30 L76 20 L60 30 Z"
          />
          <line
            x1="60"
            y1="30"
            x2="60"
            y2="100"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="2"
          />
        </>
      )}
      {garment === "shoes" && (
        <path
          {...common}
          d="M20 60 L60 56 C70 56 78 64 92 70 L100 78 C102 84 98 88 90 88 L26 88 C20 88 18 82 18 74 Z"
        />
      )}
      {garment === "accessory" && (
        <>
          <rect
            {...common}
            x="40"
            y="24"
            width="14"
            height="72"
            rx="6"
          />
          <rect
            {...common}
            x="62"
            y="24"
            width="14"
            height="72"
            rx="6"
          />
        </>
      )}
    </svg>
  );
}
