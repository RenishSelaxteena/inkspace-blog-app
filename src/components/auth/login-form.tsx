"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  credentialsSchema,
  type CredentialsInput,
} from "@/lib/validation/auth";

function safeCallbackUrl(value: string | undefined): string {
  if (!value) return "/dashboard";

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CredentialsInput>({
    resolver: zodResolver(credentialsSchema),
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    const destination = safeCallbackUrl(callbackUrl);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: destination,
        redirect: false,
      });

      if (!result || result.error) {
        setFormError("Invalid email or password.");
        return;
      }

      window.location.assign(safeCallbackUrl(result.url ?? destination));
    } catch {
      setFormError("Unable to sign in right now. Please try again.");
    }
  });

  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      {formError && (
        <p className="form-alert" role="alert">
          {formError}
        </p>
      )}
      <div className="field-group">
        <label htmlFor="email">Email address</label>
        <input
          {...register("email")}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className="form-input"
          id="email"
          type="email"
        />
        {errors.email && (
          <p className="field-error" id="login-email-error">{errors.email.message}</p>
        )}
      </div>
      <div className="field-group">
        <label htmlFor="password">
          Password
        </label>
        <input
          {...register("password")}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          aria-invalid={Boolean(errors.password)}
          autoComplete="current-password"
          className="form-input"
          id="password"
          type="password"
        />
        {errors.password && (
          <p className="field-error" id="login-password-error">{errors.password.message}</p>
        )}
      </div>
      <button
        className="button button-primary auth-submit"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Opening your space…" : "Sign in"}
      </button>
    </form>
  );
}
