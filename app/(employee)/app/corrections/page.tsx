import { CorrectionForm } from "@/components/employee/correction-form";
import { CorrectionHistory } from "@/components/employee/correction-history";
import { getMyRecentSessions, getMyCorrections } from "@/lib/data/queries";

export default async function CorrectionsPage() {
  const [sessions, history] = await Promise.all([getMyRecentSessions(), getMyCorrections()]);
  return (
    <>
      <CorrectionForm sessions={sessions} />
      <CorrectionHistory items={history} />
    </>
  );
}
