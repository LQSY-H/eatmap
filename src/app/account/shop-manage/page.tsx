import { MerchantShopManageClient } from "@/components/MerchantShopManageClient";
import { getBuildings, getFloors, getMapShapes, getShops, getTags } from "@/lib/data";

export default async function AccountShopManagePage() {
  const [buildings, floors, shops, shapes, tagsCatalog] = await Promise.all([
    getBuildings(),
    getFloors(),
    getShops(),
    getMapShapes(),
    getTags(),
  ]);

  return (
    <MerchantShopManageClient
      buildings={buildings}
      floors={floors}
      shops={shops}
      shapes={shapes}
      tagsCatalog={tagsCatalog}
    />
  );
}
