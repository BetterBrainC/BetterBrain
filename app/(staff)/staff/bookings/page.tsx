import Link from "next/link";
import { RegisterLinkModal } from "@/components/staff/register-link-modal";
import { BookingsTable } from "@/components/staff/bookings-table";
import { Button } from "@/components/ui/button";
import { getBookings, getEmployees } from "@/lib/data/queries";

export default async function BookingsPage() {
  const [bookings, employees] = await Promise.all([getBookings(), getEmployees()]);
  const empOpts = employees.map((e) => ({ id: e.id, name: e.full_name, code: e.employee_code }));

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">การทำนัด</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <RegisterLinkModal />
          <Link href="/staff/patients/new">
            <Button>+ เพิ่มผู้รับบริการ</Button>
          </Link>
        </div>
      </header>

      <BookingsTable bookings={bookings} employees={empOpts} />
    </div>
  );
}
