import { redirect } from "next/navigation";
import { CorrectionForm } from "@/components/employee/correction-form";
import { CorrectionHistory } from "@/components/employee/correction-history";
import { getMyRecentSessions, getMyCorrections, getSettings } from "@/lib/data/queries";

export default async function CorrectionsPage() {
  // Director switch — closed means the page is off, not just hidden from the menu.
  const settings = await getSettings();
  if (!settings.correctionsEnabled) redirect("/app/account");
  const [sessions, history] = await Promise.all([getMyRecentSessions(), getMyCorrections()]);
  return (
    <>
      <CorrectionForm sessions={sessions} />
      <CorrectionHistory items={history} />
    </>
  );
}
