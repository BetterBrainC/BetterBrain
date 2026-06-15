import { redirect } from "next/navigation";
import { getCurrentUser, homePathForRole } from "@/lib/auth";

/** Route by role: signed-out → /login, employee → /app, admin/director → /staff. */
export default async function HomePage() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  redirect(homePathForRole(u.profile?.role));
}
