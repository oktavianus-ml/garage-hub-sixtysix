import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { accessFor } from "@/lib/auth/access";
import { guard } from "@/lib/auth/guard";
import { todayBoard } from "@/lib/data/records";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await guard("/");
  const board = await todayBoard();
  return <DashboardHome {...board} canSeeSplit={accessFor(user.role, "/bagi-hasil") !== "none"} />;
}
