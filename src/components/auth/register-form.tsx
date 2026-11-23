"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  registrationSchema,
  type RegistrationInput,
} from "@/lib/validation/auth";

type RegistrationResponse =
  | { data: { user: { id: string; name: string; email: string } } }
  | { error: { message: string } };

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as RegistrationResponse;

      if (!response.ok || !("data" in result)) {
        setFormError(
          "error" in result
            ? result.error.message
            : "Unable to complete registration.",
        );
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setFormError("Unable to complete registration. Please try again.");
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
        <label htmlFor="name">
          Name
        </label>
        <input
          {...register("name")}
          aria-describedby={errors.name ? "register-name-error" : undefined}
          aria-invalid={Boolean(errors.name)}
          autoComplete="name"
          className="form-input"
          id="name"
        />
        {errors.name && (
          <p className="field-error" id="register-name-error">{errors.name.message}</p>
        )}
      </div>
      <div className="field-group">
        <label htmlFor="email">
          Email
        </label>
        <input
          {...register("email")}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          className="form-input"
          id="email"
          type="email"
        />
        {errors.email && (
          <p className="field-error" id="register-email-error">{errors.email.message}</p>
        )}
      </div>
      <div className="field-group">
        <label htmlFor="password">
          Password
        </label>
        <input
          {...register("password")}
          aria-describedby={errors.password ? "register-password-error" : undefined}
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          className="form-input"
          id="password"
          type="password"
        />
        {errors.password && (
          <p className="field-error" id="register-password-error">{errors.password.message}</p>
        )}
      </div>
      <div className="field-group">
        <label htmlFor="confirmPassword">
          Confirm password
        </label>
        <input
          {...register("confirmPassword")}
          aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined}
          aria-invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
          className="form-input"
          id="confirmPassword"
          type="password"
        />
        {errors.confirmPassword && (
          <p className="field-error" id="register-confirm-error">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      <button
        className="button button-primary auth-submit"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Making your space…" : "Create account"}
      </button>
    </form>
  );
}
