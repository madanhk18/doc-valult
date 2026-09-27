import { createClient } from "@/lib/supabase/server";
import { getRecipients } from "@/lib/queries/recipients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipientsForm } from "@/components/settings/recipients-form";

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

  const [recipients, storageUsedBytes] = await Promise.all([
    getRecipients(),
    user ? getStorageUsageBytes(user.id) : Promise.resolve(0),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notification Recipients</CardTitle></CardHeader>
        <CardContent>
          <RecipientsForm recipients={recipients} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Storage</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {formatBytes(storageUsedBytes)} / {formatBytes(DISPLAY_QUOTA_BYTES)} used
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
