import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  return <LoginForm defaultFrom={searchParams.from} />;
}
