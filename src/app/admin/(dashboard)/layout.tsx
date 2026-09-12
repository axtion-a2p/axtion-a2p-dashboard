import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdminAuthed();
  if (!authed) redirect("/admin/login");
  return <>{children}</>;
}
