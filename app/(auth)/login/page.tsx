import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to Document Vault</CardTitle>
        </CardHeader>
        <CardContent>
          {params.registered && (
            <p className="mb-4 text-sm text-success">Account created. Check your email to confirm, then sign in.</p>
          )}
          <AuthForm action={login} submitLabel="Sign in" />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/register" className="text-primary underline">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
