import { getRelativePortal } from "@/lib/data/queries";
import { PortalGate } from "@/components/relatives/portal-gate";

export const metadata = { title: "ติดตามการฟื้นฟู" };

export default async function RelativePortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Validate the token server-side; the result (incl. phoneLast4) never reaches
  // the client — only a confirmation that the link resolves.
  const exists = (await getRelativePortal(token)) !== null;

  if (!exists) {
    return (
      <main className="mx-auto max-w-sm px-[var(--gutter-page)] py-20 text-center">
        <p className="text-sm text-muted">ลิงก์ไม่ถูกต้องหรือหมดอายุ</p>
      </main>
    );
  }

  return <PortalGate token={token} />;
}
