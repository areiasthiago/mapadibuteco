export const TAG_MAP: Record<string, { emoji: string; label: string }> = {
  "carne-bovina":   { emoji: "🥩", label: "Carne bovina" },
  "porco":          { emoji: "🐷", label: "Porco" },
  "frango":         { emoji: "🍗", label: "Frango" },
  "peixe":          { emoji: "🐟", label: "Peixe" },
  "frutos-do-mar":  { emoji: "🦐", label: "Frutos do mar" },
  "miudos":         { emoji: "🫀", label: "Miúdos" },
  "vegetariano":    { emoji: "🥚", label: "Vegetariano" },
  "vegano":         { emoji: "🥦", label: "Vegano" },
  "frito":          { emoji: "🍳", label: "Frito" },
  "assado":         { emoji: "🔥", label: "Assado" },
  "cozido":         { emoji: "🫕", label: "Cozido" },
  "gratinado":      { emoji: "🧀", label: "Gratinado" },
};

export const TAG_CATEGORIES = [
  {
    label: "Proteína",
    tags: ["carne-bovina", "porco", "frango", "peixe", "frutos-do-mar", "miudos", "vegetariano", "vegano"],
  },
  {
    label: "Preparo",
    tags: ["frito", "assado", "cozido", "gratinado"],
  },
];
