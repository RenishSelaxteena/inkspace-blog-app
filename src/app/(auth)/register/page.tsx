import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-aside auth-aside-register">
        <p className="eyebrow">An invitation to write</p>
        <blockquote>
          Make room for a thought.
          <br />
          See where it takes you.
        </blockquote>
        <span className="auth-aside-credit">INKSPACE · VOL. 01</span>
      </section>
      <section aria-labelledby="register-title" className="auth-panel">
        <p className="eyebrow">Join the journal</p>
        <h1 id="register-title">Make yourself at home.</h1>
        <p className="auth-description">
          Your corner of InkSpace is only a few details away.
        </p>
        <RegisterForm />
        <p className="auth-switch">
          Already have a space? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
