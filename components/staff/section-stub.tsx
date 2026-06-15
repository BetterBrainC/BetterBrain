import { Card, CardDescription, CardTitle } from "@/components/ui/card";

/** Lightweight placeholder for staff sections not yet built (keeps nav from 404). */
export function SectionStub({
  title,
  summary,
  phase,
}: {
  title: string;
  summary: string;
  phase: string;
}) {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-navy">{title}</h1>
      <Card tinted>
        <CardTitle className="text-base">{summary}</CardTitle>
        <CardDescription>{phase}</CardDescription>
      </Card>
    </div>
  );
}
