"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiDelete, apiRequest, ApiRequestError, getErrorMessage } from "@/lib/api-client";
import type { Blog } from "@/lib/blogs/types";
import { formatDate } from "@/lib/blogs/types";
import { BlogContent } from "@/components/blogs/blog-content";
import { DeleteConfirmationDialog } from "@/components/blogs/delete-confirmation-dialog";
import { EmptyState } from "@/components/blogs/empty-state";
import { useToast } from "@/components/providers/toast-provider";

export function BlogDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [owner, setOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ blog: Blog }>(
      `/api/blogs/${encodeURIComponent(slug)}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async ({ blog: loadedBlog }) => {
        setBlog(loadedBlog);
        try {
          const ownBlogs = await apiRequest<{ blogs: Blog[] }>(
            "/api/users/me/blogs",
            { cache: "no-store", signal: controller.signal },
          );
          setOwner(ownBlogs.blogs.some((item) => item.id === loadedBlog.id));
        } catch (error) {
          if (error instanceof ApiRequestError && error.status === 401) {
            setOwner(false);
            return;
          }
          if (!(error instanceof Error && error.name === "AbortError")) {
            setOwner(false);
          }
        }
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        if (error instanceof ApiRequestError && error.status === 404) {
          setUnavailable(true);
        } else {
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [slug]);

  const deleteBlog = async () => {
    if (!blog) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/blogs/${encodeURIComponent(blog.id)}`);
      notify("Story deleted.", "success");
      router.push("/dashboard");
    } catch (error) {
      notify(getErrorMessage(error, "Unable to delete this story."), "error");
      setDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="reading-page">
        <div aria-label="Loading story" className="article-skeleton" role="status">
          <span />
          <span />
          <span />
        </div>
      </main>
    );
  }

  if (unavailable || !blog) {
    return (
      <main className="reading-page">
        <EmptyState
          action="Return to the journal"
          href="/"
          message="This story may have moved, or it may not be available to you."
          title="Story not found"
        />
      </main>
    );
  }

  return (
    <main className="reading-page">
      <div className="reading-kicker">
        <Link href="/">The InkSpace Journal</Link>
        <span aria-hidden="true">/</span>
        <span>{blog.status === "DRAFT" ? "Private draft" : "A story"}</span>
      </div>
      <article className="reading-article">
        <header className="article-header">
          {blog.status === "DRAFT" ? (
            <p className="draft-label">Draft · only you can see this</p>
          ) : null}
          <h1>{blog.title}</h1>
          {blog.excerpt ? <p className="article-deck">{blog.excerpt}</p> : null}
          <div className="article-byline">
            <span className="author-mark" aria-hidden="true">
              {blog.author.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <p>{blog.author.name}</p>
              <time dateTime={blog.publishedAt ?? blog.createdAt}>
                {formatDate(blog.publishedAt)}
              </time>
            </div>
          </div>
          {owner ? (
            <div className="article-owner-actions">
              <Link className="text-button" href={`/blogs/${blog.id}/edit`}>
                Edit story <span aria-hidden="true">↗</span>
              </Link>
              <button
                className="text-button delete-link"
                onClick={() => setDialogOpen(true)}
                type="button"
              >
                Delete story
              </button>
            </div>
          ) : null}
        </header>
        <div aria-hidden="true" className="article-rule" />
        <BlogContent content={blog.content ?? ""} />
        <footer className="article-end">
          <span aria-hidden="true">✳</span>
          <p>Thank you for reading.</p>
        </footer>
      </article>
      <DeleteConfirmationDialog
        onCancel={() => setDialogOpen(false)}
        onConfirm={() => void deleteBlog()}
        open={dialogOpen}
        pending={deleting}
      />
    </main>
  );
}
