import { redirect } from "next/navigation";
import AdminDashboard from "@/components/AdminDashboard";
import { getCurrentAdmin } from "@/lib/auth";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return <AdminDashboard email={admin.email} />;
}
