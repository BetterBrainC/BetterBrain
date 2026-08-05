import { notFound } from "next/navigation";
import { getSessionDetail } from "@/lib/data/queries";
import { loadReportDraft, type DraftReportType } from "@/actions/report-drafts";
import {
  SwallowingForm,
  HandForm,
  SummaryReportForm,
  AssessmentReportForm,
} from "@/components/reports/clinical-forms";

// Assessment (swallowing/hand) · รายงานประเมินแรกรับ (the Thai letterhead report
// for the family) · Summary report (monthly progress). Follow up (daily) is
// captured via the check-out sheet.
const TYPES = ["swallowing", "hand", "assessment-report", "summary"] as const;
type ReportType = (typeof TYPES)[number];

const DB_TYPE: Record<ReportType, DraftReportType> = {
  swallowing: "assessment_swallow",
  hand: "assessment_hand",
  "assessment-report": "assessment_report",
  summary: "summary",
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string; type: string }>;
}) {
  const { id, type } = await params;
  const session = await getSessionDetail(id);
  if (!session || !TYPES.includes(type as ReportType)) notFound();

  // Pick up where the employee left off, if they saved a draft of this report.
  const draft = await loadReportDraft(id, DB_TYPE[type as ReportType]);

  const props = {
    patientName: session.patientName,
    backHref: `/app/session/${id}`,
    sessionId: id,
    draft,
  };

  switch (type as ReportType) {
    case "swallowing":
      return <SwallowingForm {...props} />;
    case "hand":
      return <HandForm {...props} />;
    case "assessment-report":
      return <AssessmentReportForm {...props} />;
    case "summary":
      return <SummaryReportForm {...props} />;
  }
}
