import { createClient } from "@/lib/supabase/server";
import { getRecipients } from "@/lib/queries/recipients";
import { getDocuments } from "@/lib/queries/documents";
import { RecipientsForm } from "@/components/settings/recipients-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [recipients, documents] = await Promise.all([getRecipients(), getDocuments()]);

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
          <p className="text-sm text-muted-foreground">{documents.length} documents stored</p>
        </CardContent>
      </Card>
    </div>
  );
}
