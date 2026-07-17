import { PortalReportView } from "@/components/relatives/portal-report-view";

export const metadata = { title: "รายงาน (PDF)" };

/**
 * Relatives-facing report/PDF view. Authorization happens in the Server Action
 * the view calls (share token + phone last-4 + the report belonging to that
 * recipient), so this route only wires the params through.
 */
export default async function RelativeReportPage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  return <PortalReportView token={token} reportId={id} />;
}
