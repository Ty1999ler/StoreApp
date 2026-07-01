import type { Product } from "../shared/types.js";

// ===========================================================================
// Dynamite — women's collection (one hero photo per item)
// ===========================================================================
const DYNAMITE = [
  {
    id: "p-andrea-tee",
    tagCode: "100098543",
    name: "Andrea Shirred Jersey T-Shirt",
    brand: "Dynamite",
    category: "Tops",
    garment: "tshirt" as const,
    price: 34.95,
    description:
      "Soft, lightweight cotton jersey with a fitted silhouette and shirred sides.",
    colors: [
      { name: "Jet Black", hex: "#222222" },
      { name: "Bright White", hex: "#f4f1ea" },
      { name: "Heather Blue", hex: "#9aa7c4" },
      { name: "Urban Chic Green", hex: "#6b6f47" },
    ],
    sizes: ["XXS", "XS", "S", "M", "L", "XL"],
  },
  {
    id: "p-stacie-skort",
    tagCode: "100103201",
    name: "Stacie Linen Mini Skort",
    brand: "Dynamite",
    category: "Bottoms",
    garment: "pants" as const,
    price: 59.95,
    description:
      "Airy, lightweight linen mini skort with a structured feel that sits below the waist.",
    colors: [
      { name: "Linen Snow White", hex: "#f4f1ea" },
      { name: "Cornstalk Beige", hex: "#d8c5a5" },
      { name: "Java Brown", hex: "#5a4632" },
      { name: "Deep Well Navy", hex: "#27374d" },
    ],
    sizes: ["00", "0", "2", "4", "6", "8", "10", "12", "14"],
  },
  {
    id: "p-priya-pants",
    tagCode: "100103980",
    name: "Priya Wide Leg Pants",
    brand: "Dynamite",
    category: "Bottoms",
    garment: "pants" as const,
    price: 69.95,
    description:
      "Flowy, lightweight crepe with a subtle crinkle, a waist-high rise and a relaxed wide leg.",
    colors: [
      { name: "Deep Well Navy", hex: "#27374d" },
      { name: "Calming White", hex: "#f4f1ea" },
      { name: "Chocolate Lab", hex: "#5a4632" },
      { name: "Voile Jet Black", hex: "#222222" },
    ],
    sizes: ["XXS", "XS", "S", "M", "L", "XL"],
  },
  {
    id: "p-sculpt-bodysuit",
    tagCode: "100104794",
    name: "Sculpt Plunge Sweetheart Bodysuit",
    brand: "Dynamite",
    category: "Tops",
    garment: "tshirt" as const,
    price: 39.95,
    description:
      "Butter-soft Sculpt fabric with a body-contouring fit and a plunge sweetheart neckline.",
    colors: [
      { name: "Jet Black", hex: "#222222" },
      { name: "Goji Berry Red", hex: "#a3263a" },
    ],
    sizes: ["XXS", "XS", "S", "M", "L", "XL"],
  },
  {
    id: "p-linen-shorts",
    tagCode: "100103903",
    name: "Linen High Rise Shorts",
    brand: "Dynamite",
    category: "Bottoms",
    garment: "pants" as const,
    price: 54.95,
    description:
      "Airy, lightweight linen shorts with a structured look that sit high at the waist.",
    colors: [
      { name: "Snow White", hex: "#f4f1ea" },
      { name: "Natural Linen Beige", hex: "#d8c5a5" },
      { name: "Chocolate Torte Brown", hex: "#5a4632" },
      { name: "Jet Black", hex: "#222222" },
    ],
    sizes: ["XXS", "XS", "S", "M", "L", "XL"],
  },
  {
    id: "p-sculpt-buckle-top",
    tagCode: "100102689",
    name: "Sculpt Buckle Detail Top",
    brand: "Dynamite",
    category: "Tops",
    garment: "tshirt" as const,
    price: 44.95,
    description:
      "Soft, stretchy Sculpt fabric with a sleek bodycon fit and a gold buckle detail at the shoulder.",
    colors: [
      { name: "Jet Black", hex: "#222222" },
      { name: "Calming Off White", hex: "#efe9dd" },
    ],
    sizes: ["XXS", "XS", "S", "M", "L", "XL"],
  },
  {
    id: "p-ellie-tank",
    tagCode: "100102299",
    name: "Ellie Ribbed Tank Top",
    brand: "Dynamite",
    category: "Tops",
    garment: "tshirt" as const,
    price: 29.95,
    description:
      "Thick rib-knit tank with a bodycon fit that skims the body. An everyday layering staple.",
    colors: [
      { name: "Bright White", hex: "#f4f1ea" },
      { name: "Jet Black", hex: "#222222" },
      { name: "Java Brown", hex: "#5a4632" },
    ],
    sizes: ["XXS", "XS", "S", "M", "L", "XL"],
  },
];

// ===========================================================================
// HUGO BOSS — men's collection (a model photo per colour)
// ===========================================================================
const HUGO_BOSS: Product[] = [
  {
    id: "p-hb-stacked-polo",
    collection: "hugo-boss",
    tagCode: "015344602209",
    name: "Stacked-Logo Interlock Polo",
    brand: "HUGO",
    category: "Polos",
    garment: "tshirt",
    price: 189,
    description:
      "Slim-fit polo in structured interlock cotton with a stacked HUGO logo.",
    image: "/products/hb-stacked-polo-002.jpg",
    colors: [
      { name: "Black", hex: "#222222", image: "/products/hb-stacked-polo-002.jpg" },
      { name: "White", hex: "#f4f1ea", image: "/products/hb-stacked-polo-103.jpg" },
      { name: "Light Brown", hex: "#b08d57", image: "/products/hb-stacked-polo-237.jpg" },
      { name: "Dark Blue", hex: "#27374d", image: "/products/hb-stacked-polo-418.jpg" },
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    id: "p-hb-leather-belt",
    collection: "hugo-boss",
    tagCode: "604553153949",
    name: "Italian-Leather Belt",
    brand: "BOSS",
    category: "Accessories",
    garment: "accessory",
    price: 85,
    description:
      "Italian-made leather belt with a signature-stripe keeper and a polished pin buckle.",
    image: "/products/hb-leather-belt-001.jpg",
    colors: [
      { name: "Black", hex: "#222222", image: "/products/hb-leather-belt-001.jpg" },
      { name: "Dark Brown", hex: "#5a4632", image: "/products/hb-leather-belt-205.jpg" },
      { name: "Dark Blue", hex: "#27374d", image: "/products/hb-leather-belt-410.jpg" },
    ],
    sizes: ["30", "32", "34", "36", "38", "40", "42", "44"],
  },
  {
    id: "p-hb-mercerised-polo",
    collection: "hugo-boss",
    tagCode: "604553615492",
    name: "Mercerised-Cotton Two-Tone Polo",
    brand: "BOSS",
    category: "Polos",
    garment: "tshirt",
    price: 249,
    description:
      "Mercerised-cotton polo with a subtle two-tone textured structure and a zip neck.",
    image: "/products/hb-mercerised-polo-131.jpg",
    colors: [
      { name: "Light Beige", hex: "#d8c5a5", image: "/products/hb-mercerised-polo-131.jpg" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
  },
  {
    id: "p-hb-logo-tee",
    collection: "hugo-boss",
    tagCode: "604553432402",
    name: "Structured-Logo Cotton T-Shirt",
    brand: "BOSS",
    category: "T-Shirts",
    garment: "tshirt",
    price: 139,
    description:
      "Regular-fit cotton-jersey T-shirt with a structured tonal BOSS logo across the chest.",
    image: "/products/hb-logo-tee-100.jpg",
    colors: [
      { name: "White", hex: "#f4f1ea", image: "/products/hb-logo-tee-100.jpg" },
      { name: "Light Green", hex: "#9aa886", image: "/products/hb-logo-tee-358.jpg" },
      { name: "Dark Blue", hex: "#27374d", image: "/products/hb-logo-tee-402.jpg" },
      { name: "Purple", hex: "#5e3a52", image: "/products/hb-logo-tee-517.jpg" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
  },
  {
    id: "p-hb-longsleeve-polo",
    collection: "hugo-boss",
    tagCode: "627919634487",
    name: "Long-Sleeved Interlock Polo",
    brand: "BOSS",
    category: "Polos",
    garment: "tshirt",
    price: 199,
    description:
      "Long-sleeved interlock-cotton polo with a tonal logo and a ribbed collar.",
    image: "/products/hb-longsleeve-polo-252.jpg",
    colors: [
      { name: "Khaki", hex: "#8b8158", image: "/products/hb-longsleeve-polo-252.jpg" },
      { name: "Light Blue", hex: "#a9c3d9", image: "/products/hb-longsleeve-polo-468.jpg" },
    ],
    sizes: ["S", "M", "L", "XL", "XXL", "XXXL"],
  },
];

// Dynamite items derive their single hero photo from the id; Hugo Boss items
// carry explicit per-colour photos. Combined into one catalog.
export const CATALOG: Product[] = [
  ...DYNAMITE.map((p) => ({
    ...p,
    collection: "dynamite",
    image: `/products/${p.id.replace(/^p-/, "")}.jpg`,
  })),
  ...HUGO_BOSS,
];
