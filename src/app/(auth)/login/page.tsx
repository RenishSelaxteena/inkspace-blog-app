import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ registered?: string; callbackUrl?: string }>;
};

export const metadata: Metadata = { title: "Sign in" };
export const instant = false;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered, callbackUrl } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <p className="eyebrow">A quiet place to begin again</p>
        <blockquote>
          “The first sentence is a door.”
        </blockquote>
        <span className="auth-aside-credit">THE INKSPACE JOURNAL</span>
      </section>
      <section aria-labelledby="login-title" className="auth-panel">
        <p className="eyebrow">Your writing room</p>
        <h1 id="login-title">Welcome back.</h1>
        <p className="auth-description">
          Sign in to pick up where your thoughts left off.
        </p>
        {registered === "1" ? (
          <p className="form-success" role="status">
            Your account is ready. Sign in to start writing.
          </p>
        ) : null}
        <LoginForm callbackUrl={callbackUrl} />
        <p className="auth-switch">
          New to InkSpace?{" "}
          <Link href="/register">Make a space for your words</Link>
        </p>
      </section>
    </main>
  );
}
