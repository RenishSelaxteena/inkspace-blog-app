"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, ApiRequestError } from "@/lib/api-client";
import type { Blog } from "@/lib/blogs/types";
import { BlogForm } from "@/components/blogs/blog-form";
import { DashboardNav } from "@/components/blogs/dashboard-nav";

export function EditBlogPage({ id }: { id: string }) {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ blogs: Blog[] }>("/api/users/me/blogs", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(({ blogs }) => {
        const found = blogs.find((item) => item.id === id);
        if (found) setBlog(found);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setError("Your session has ended. Sign in again to continue editing.");
        } else {
          setError("This story is not available in your writing room.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  return (
    <main className="editor-page">
      <div className="editor-topline">
        <Link href="/dashboard">← Back to your stories</Link>
      </div>
      <header className="editor-heading">
        <p className="eyebrow">The writing room</p>
        <h1>Edit your story</h1>
        <p>Take your time. You can save a draft or publish when it feels ready.</p>
      </header>
      <DashboardNav />
      {loading ? (
        <div aria-label="Loading story" className="form-skeleton" role="status">
          <span />
          <span />
          <span />
        </div>
      ) : blog ? (
        <BlogForm blog={blog} />
      ) : (
        <section className="editor-unavailable">
          <p className="form-alert" role="alert">
            {error ?? "This story is not available in your writing room."}
          </p>
          <Link className="button button-outline" href={error ? "/login" : "/dashboard"}>
            {error ? "Sign in" : "Return to your stories"}
          </Link>
        </section>
      )}
    </main>
  );
}
