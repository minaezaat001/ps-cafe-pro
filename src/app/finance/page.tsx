import { getCurrentUser, getFinancialTransactions } from "@/app/actions";
import { redirect } from "next/navigation";
import FinanceClient from "./FinanceClient";
import { serializeFinancialTransaction } from "@/lib/dashboard-serialize";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const transactions = await getFinancialTransactions();
  const serializedTransactions = transactions.map(serializeFinancialTransaction);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <FinanceClient initialTransactions={serializedTransactions} user={user} />
    </div>
  );
}
