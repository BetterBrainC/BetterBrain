import { SettingsForm } from "@/components/staff/settings-form";
import { Card, CardTitle } from "@/components/ui/card";
import { PushToggle } from "@/components/shell/push-toggle";
import { getSettings } from "@/lib/data/queries";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="space-y-5">
      <SettingsForm initial={settings} />
      <Card className="max-w-2xl space-y-2">
        <CardTitle className="text-base">การแจ้งเตือนของฉัน (Web Push)</CardTitle>
        <p className="text-xs text-muted">เปิดรับแจ้งเตือนบนอุปกรณ์นี้ (ผูกกับบัญชีคุณเท่านั้น)</p>
        <PushToggle />
      </Card>
    </div>
  );
}
