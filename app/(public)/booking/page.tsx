import { CardDescription } from "@/components/ui/card";
import { BookingForm } from "@/components/public/booking-form";
import { APP } from "@/lib/i18n/th";

export const metadata = { title: "จองคิวประเมิน" };

/** Public booking form (unauthenticated) → submits via service-role server action. */
export default function BookingPage() {
  return (
    <main className="mx-auto max-w-lg space-y-6 px-[var(--gutter-page)] py-12">
      <header className="space-y-1 text-center">
        <p className="text-sm font-medium text-primary">{APP.org}</p>
        <h1 className="font-display text-2xl font-bold text-navy">จองคิวเข้าประเมิน</h1>
        <CardDescription>
          กรอกข้อมูลเพื่อให้ทีมงานติดต่อกลับและนัดหมายเข้าประเมิน
        </CardDescription>
      </header>
      <BookingForm />
    </main>
  );
}
