import { SettingsForm } from "@/components/staff/settings-form";
import { getSettings } from "@/lib/data/queries";

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsForm initial={settings} />;
}
