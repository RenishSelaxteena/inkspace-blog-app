"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiDelete, apiRequest, getErrorMessage } from "@/lib/api-client";
import type { Blog } from "@/lib/blogs/types";
import { formatDate } from "@/lib/blogs/types";
import { EmptyState } from "@/components/blogs/empty-state";
import { DeleteConfirmationDialog } from "@/components/blogs/delete-confirmation-dialog";
import { useToast } from "@/components/providers/toast-provider";
import { WriteStoryLink } from "@/components/blogs/write-story-link";

function StoryRow({
  blog,
  onDelete,
}: {
  blog: Blog;
  onDelete: (blog: Blog) => void;
}) {
  return (
    <article className="story-row">
      <div className="story-row-main">
        <div className="story-row-heading">
          <h3>{blog.title}</h3>
          <span className={`status-pill status-${blog.status.toLowerCase()}`}>
            {blog.status === "DRAFT" ? "Draft" : "Published"}
          </span>
        </div>
        <p>
          {blog.status === "PUBLISHED" ? "Published" : "Last edited"}{" "}
          {formatDate(blog.status === "PUBLISHED" ? blog.publishedAt : blog.updatedAt)}
        </p>
      </div>
      <div className="story-row-actions">
        <Link
          className="text-button"
          href={
            blog.status === "PUBLISHED"
              ? `/blogs/${encodeURIComponent(blog.slug)}`
              : `/blogs/${encodeURIComponent(blog.id)}/edit`
          }
        >
          {blog.status === "PUBLISHED" ? "Read" : "Continue"} <span aria-hidden="true">↗</span>
        </Link>
        <Link
          aria-label={`Edit ${blog.title}`}
          className="text-button"
          href={`/blogs/${encodeURIComponent(blog.id)}/edit`}
        >
          Edit
        </Link>
        <button
          aria-label={`Delete ${blog.title}`}
          className="text-button delete-link"
          onClick={() => onDelete(blog)}
          type="button"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export function DashboardContent({ name }: { name: string }) {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Blog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ blogs: Blog[] }>("/api/users/me/blogs", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(({ blogs: ownBlogs }) => setBlogs(ownBlogs))
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError(getErrorMessage(reason, "Your stories could not be loaded."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/blogs/${encodeURIComponent(deleteTarget.id)}`);
      setBlogs((current) => current.filter((blog) => blog.id !== deleteTarget.id));
      notify("Story deleted.", "success");
      setDeleteTarget(null);
    } catch (reason) {
      notify(getErrorMessage(reason, "Unable to delete this story."), "error");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const drafts = blogs.filter((blog) => blog.status === "DRAFT");
  const published = blogs.filter((blog) => blog.status === "PUBLISHED");

  return (
    <>
      <main className="dashboard-page">
        <section className="dashboard-hero">
          <p className="eyebrow">Your writing room</p>
          <h1>Good to see you, {name}.</h1>
          <p>Every story starts somewhere. This is where yours take shape.</p>
          <WriteStoryLink className="button button-primary">
            Begin a new story <span aria-hidden="true">↗</span>
          </WriteStoryLink>
        </section>
        <section aria-label="Your stories" className="dashboard-stories">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">The work in progress</p>
              <h2>Your stories</h2>
            </div>
            {!loading ? (
              <p className="story-count">
                {blogs.length} {blogs.length === 1 ? "story" : "stories"}
              </p>
            ) : null}
          </div>
          {loading ? (
            <div aria-label="Loading stories" className="dashboard-skeleton" role="status">
              <span />
              <span />
              <span />
            </div>
          ) : error ? (
            <p className="form-alert" role="alert">{error}</p>
          ) : blogs.length === 0 ? (
            <EmptyState
              action="Write your first story"
              href="/blogs/create"
              message="Your drafts and published posts will find a home here."
              title="Your page is still unwritten"
            />
          ) : (
            <div className="dashboard-lists">
              <section aria-labelledby="drafts-title">
                <div className="list-heading">
                  <h3 id="drafts-title">Drafts</h3>
                  <span>{drafts.length}</span>
                </div>
                {drafts.length ? (
                  <div className="story-list">
                    {drafts.map((blog) => (
                      <StoryRow blog={blog} key={blog.id} onDelete={setDeleteTarget} />
                    ))}
                  </div>
                ) : (
                  <p className="list-empty">No drafts on your desk.</p>
                )}
              </section>
              <section aria-labelledby="published-title">
                <div className="list-heading">
                  <h3 id="published-title">Published</h3>
                  <span>{published.length}</span>
                </div>
                {published.length ? (
                  <div className="story-list">
                    {published.map((blog) => (
                      <StoryRow blog={blog} key={blog.id} onDelete={setDeleteTarget} />
                    ))}
                  </div>
                ) : (
                  <p className="list-empty">Nothing published just yet.</p>
                )}
              </section>
            </div>
          )}
        </section>
      </main>
      <DeleteConfirmationDialog
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        open={Boolean(deleteTarget)}
        pending={deleting}
      />
    </>
  );
}
