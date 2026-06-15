import { RegisterLinkModal } from "@/components/staff/register-link-modal";
import { NewBookingModal } from "@/components/staff/new-booking-modal";
import { BookingsTable } from "@/components/staff/bookings-table";
import { getBookings } from "@/lib/data/queries";

export default async function BookingsPage() {
  const bookings = await getBookings();
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">การจอง</h1>
          <p className="text-sm text-muted">คำขอจองจากฟอร์มสาธารณะ + Admin ลงเอง</p>
        </div>
        <div className="flex gap-2">
          <RegisterLinkModal />
          <NewBookingModal />
        </div>
      </header>

      <BookingsTable bookings={bookings} />
    </div>
  );
}
