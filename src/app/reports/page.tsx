import { getReportData, getAdvancedPerformanceMetrics, getCurrentUser } from "../actions";
import ReportsClient from "./ReportsClient";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { redirect } from "next/navigation";
import { serializeReportData, serializeFinancialTransaction } from "@/lib/dashboard-serialize";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ start?: string, end?: string }> 
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  
  // Default to TODAY only if no params provided
  const startDate = params.start ? startOfDay(new Date(params.start + 'T00:00:00')) : startOfDay(new Date());
  const endDate = params.end ? endOfDay(new Date(params.end + 'T23:59:59')) : endOfDay(new Date());

  const data = await getReportData(startDate, endDate);
  const performance = await getAdvancedPerformanceMetrics();

  const serializedData = serializeReportData(data);
  const serializedPerformance = performance ? {
    ...performance,
    transactions: performance.transactions.map(serializeFinancialTransaction)
  } : null;

  return <ReportsClient data={serializedData} performance={serializedPerformance} />;
}
