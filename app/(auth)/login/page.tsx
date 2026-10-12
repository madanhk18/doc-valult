import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see your documents.">
      {params.registered && (
        <p className="mb-4 rounded-2xl bg-success/12 p-3 text-sm font-medium text-success">
          Account created. Check your email to confirm, then sign in.
        </p>
      )}
      <AuthForm action={login} submitLabel="Sign in" />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
