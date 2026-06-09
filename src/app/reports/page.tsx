import { getReportData, getAdvancedPerformanceMetrics, getCurrentUser } from "../actions";
import ReportsClient from "./ReportsClient";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { redirect } from "next/navigation";
import { serializeReportData } from "@/lib/dashboard-serialize";

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

  let data, performance, serializedData, serializedPerformance;
  try {
    data = await getReportData(startDate, endDate);
    performance = await getAdvancedPerformanceMetrics();
    serializedData = serializeReportData(data);
    serializedPerformance = performance;
  } catch (e) {
    console.error("Reports page error:", e);
    throw e;
  }

  return <ReportsClient data={serializedData} performance={serializedPerformance} />;
}
