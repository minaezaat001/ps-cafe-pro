import { getUsers } from "@/app/actions";
import StaffClient from "./StaffClient";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const users = await getUsers();
  return <StaffClient users={users} />;
}
