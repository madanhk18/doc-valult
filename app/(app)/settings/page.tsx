import { BellRing, HardDrive, Mail, Palette, UserRound, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRecipients } from "@/lib/queries/recipients";
import { getReminderSettings } from "@/lib/queries/reminders";
import { getEmailSetupChecks } from "@/lib/email-setup";
import { RecipientsForm } from "@/components/settings/recipients-form";
import { ReminderDaysForm } from "@/components/settings/reminder-days-form";
import { EmailSetupCard } from "@/components/settings/email-setup-card";
import { SettingsSection } from "@/components/settings/settings-section";
import { ThemePicker } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import { PageTitle } from "@/components/shared/page-title";

// Fixed display quota per the spec — not a real Supabase Storage quota check.
const DISPLAY_QUOTA_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

async function getStorageUsageBytes(userId: string): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("documents").list(userId, { limit: 1000 });
  if (error || !data) return 0;
  return data.reduce((sum, file) => sum + (file.metadata?.size ?? 0), 0);
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recipients, reminders, storageUsedBytes] = await Promise.all([
    getRecipients(),
    getReminderSettings(),
    user ? getStorageUsageBytes(user.id) : Promise.resolve(0),
  ]);
  const email = user?.email ?? "";
  const storagePercent = Math.min(100, (storageUsedBytes / DISPLAY_QUOTA_BYTES) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle title="Settings" />

      <SettingsSection
        id="reminders"
        icon={BellRing}
        color="var(--warning)"
        title="When to remind me"
        description="Pick the days before expiry you want an email."
      >
        <ReminderDaysForm initialDays={reminders.days} migrated={reminders.migrated} />
      </SettingsSection>

      <SettingsSection
        id="email"
        icon={Mail}
        color="var(--info)"
        title="Email reminders"
        description="Everything email needs, and a way to test it right now."
      >
        <EmailSetupCard checks={getEmailSetupChecks()} email={email} />
      </SettingsSection>

      <SettingsSection
        icon={Users}
        color="var(--success)"
        title="Who gets reminders"
        description="Add family members so they're reminded too."
      >
        <RecipientsForm recipients={recipients} accountEmail={email} />
      </SettingsSection>

      <SettingsSection icon={Palette} color="var(--muted-foreground)" title="Appearance">
        <ThemePicker />
      </SettingsSection>

      <SettingsSection icon={HardDrive} color="var(--info)" title="Storage">
        <div className="space-y-2">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(storagePercent, 1)}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatBytes(storageUsedBytes)} of {formatBytes(DISPLAY_QUOTA_BYTES)} used
          </p>
        </div>
      </SettingsSection>

      <SettingsSection icon={UserRound} color="var(--primary)" title="Account" description={`Signed in as ${email}`}>
        <LogoutButton className="bg-destructive/10 text-destructive" />
      </SettingsSection>
    </div>
  );
}
