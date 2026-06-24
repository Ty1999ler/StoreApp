import type { Product } from "../shared/types.js";

// The showroom catalog — 7 Dynamite pieces. One of each is on the floor;
// everything else is pulled from the stockroom on request.
const PRODUCTS: Product[] = [
  {
    id: "p-andrea-tee",
    tagCode: "100098543",
    name: "Andrea Shirred Jersey T-Shirt",
    brand: "Dynamite",
    category: "Tops",
    garment: "tshirt",
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
    garment: "pants",
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
    garment: "pants",
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
    garment: "tshirt",
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
    garment: "pants",
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
    garment: "tshirt",
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
    garment: "tshirt",
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

// Attach the hero photo for each product. Files live in /public/products and
// are named after the product id with the "p-" prefix dropped.
export const CATALOG: Product[] = PRODUCTS.map((p) => ({
  ...p,
  image: `/products/${p.id.replace(/^p-/, "")}.jpg`,
}));
