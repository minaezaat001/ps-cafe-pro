import { getInventory } from "@/app/actions";
import InventoryClient from "./InventoryClient";
import { decToNumber } from "@/lib/decimals";

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const inventory = await getInventory();
  const plain = inventory.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    price: decToNumber(i.price),
    stock: i.stock,
  }));
  return <InventoryClient initialItems={plain} />;
}
