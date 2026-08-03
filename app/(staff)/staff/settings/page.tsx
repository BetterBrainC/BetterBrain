import { SettingsForm } from "@/components/staff/settings-form";
import { Card, CardTitle } from "@/components/ui/card";
import { PushToggle } from "@/components/shell/push-toggle";
import { getSettings } from "@/lib/data/queries";
import { requireDirector } from "@/lib/auth";

export default async function SettingsPage() {
  // ตั้งค่าระบบเข้าได้เฉพาะ Director (เอาสิทธิ Admin ออก — client 18/6/2569)
  await requireDirector();
  const settings = await getSettings();
  return (
    <div className="space-y-5">
      <SettingsForm initial={settings} />
      <Card className="max-w-2xl space-y-2">
        <CardTitle className="text-base">การแจ้งเตือนของฉัน (Web Push)</CardTitle>
        <PushToggle />
      </Card>
    </div>
  );
}
