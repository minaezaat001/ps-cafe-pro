import { getInventoryForCafeteria, getActiveShift, getCurrentUser } from "../actions";
import CafetriaClient from "./CafetriaClient";
import { decToNumber } from "@/lib/decimals";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function CafetriaPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [inventory, activeShift] = await Promise.all([
    getInventoryForCafeteria(),
    getActiveShift(),
  ]);

  const plainInventory = inventory.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    price: decToNumber(i.price),
    stock: i.stock,
  }));

  return <CafetriaClient inventory={plainInventory} activeShift={activeShift} />;
}
