import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { guard } from "@/lib/auth/guard";
import { todayBoard } from "@/lib/data/records";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await guard("/");
  const board = await todayBoard();
  return <DashboardHome {...board} />;
}
