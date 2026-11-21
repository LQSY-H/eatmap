import { RandomDishesClient } from "@/components/RandomDishesClient";
import { getBuildings, getFloors, getPublicShops } from "@/lib/data";

export default async function RandomDishesPage() {
  const [shops, buildings, floors] = await Promise.all([
    getPublicShops(),
    getBuildings(),
    getFloors(),
  ]);
  return <RandomDishesClient shops={shops} buildings={buildings} floors={floors} />;
}
