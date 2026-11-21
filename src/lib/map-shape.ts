import type { MapShape } from "@/lib/types";

export function isShopShape(shape: MapShape): boolean {
  return !shape.kind || shape.kind === "shop";
}
