import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Free, private, and takes a few seconds.">
      <AuthForm action={register} submitLabel="Create account" passwordMinLength={8} />
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
