import { getCurrentUser } from "@/app/actions";
import SettingsClient from "./SettingsClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  let perms: string[] = [];
  try { if (user?.permissions) perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions; } catch (e) {}
  
  if (!user || (user.role !== 'ADMIN' && !perms.includes('settings.manage'))) {
    redirect("/");
  }

  return <SettingsClient />;
}
