"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { apiDelete, apiRequest, getErrorMessage } from "@/lib/api-client";
import { updateBlogSchema, type BlogUpdateInput } from "@/lib/validation/blog";
import type { Blog } from "@/lib/blogs/types";
import { useToast } from "@/components/providers/toast-provider";
import { DeleteConfirmationDialog } from "@/components/blogs/delete-confirmation-dialog";

const EMPTY_BLOG_VALUES: BlogUpdateInput = {
  title: "",
  content: "",
  excerpt: "",
  status: "DRAFT",
};

function BlogEditorFields({
  errors,
  register,
  titleLength,
}: {
  errors: ReturnType<
    typeof useForm<BlogUpdateInput>
  >["formState"]["errors"];
  register: ReturnType<typeof useForm<BlogUpdateInput>>["register"];
  titleLength: number;
}) {
  return (
    <>
      <div className="field-group">
        <div className="field-label-row">
          <label htmlFor="title">Title</label>
          <span className="field-counter">{titleLength}/120</span>
        </div>
        <input
          {...register("title")}
          aria-describedby={errors.title ? "title-error" : undefined}
          aria-invalid={Boolean(errors.title)}
          autoComplete="off"
          id="title"
          maxLength={120}
          placeholder="A title worth remembering"
        />
        {errors.title ? (
          <p className="field-error" id="title-error">
            {errors.title.message}
          </p>
        ) : null}
      </div>
      <div className="field-group">
        <div className="field-label-row">
          <label htmlFor="excerpt">A short introduction</label>
          <span className="field-counter">Optional · 280 characters</span>
        </div>
        <textarea
          {...register("excerpt")}
          aria-describedby={errors.excerpt ? "excerpt-error" : undefined}
          aria-invalid={Boolean(errors.excerpt)}
          className="excerpt-input"
          id="excerpt"
          maxLength={280}
          placeholder="A few lines to invite readers in."
          rows={3}
        />
        {errors.excerpt ? (
          <p className="field-error" id="excerpt-error">
            {errors.excerpt.message}
          </p>
        ) : null}
      </div>
      <div className="field-group">
        <label htmlFor="content">Your story</label>
        <textarea
          {...register("content")}
          aria-describedby={errors.content ? "content-error" : "content-hint"}
          aria-invalid={Boolean(errors.content)}
          className="content-input"
          id="content"
          placeholder="Begin wherever the story begins…"
          rows={18}
        />
        <p className="field-hint" id="content-hint">
          Plain text, with blank lines between paragraphs.
        </p>
        {errors.content ? (
          <p className="field-error" id="content-error">
            {errors.content.message}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function BlogForm({
  blog,
  instanceKey,
}: {
  blog?: Blog;
  instanceKey?: string;
}) {
  return (
    <BlogFormInstance
      blog={blog}
      key={blog ? `edit:${blog.id}` : `create:${instanceKey ?? "direct"}`}
    />
  );
}

function BlogFormInstance({ blog }: { blog?: Blog }) {
  const router = useRouter();
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const { notify } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BlogUpdateInput>({
    resolver: zodResolver(updateBlogSchema),
    defaultValues: {
      title: blog?.title ?? EMPTY_BLOG_VALUES.title,
      content: blog?.content ?? EMPTY_BLOG_VALUES.content,
      excerpt: blog?.excerpt ?? EMPTY_BLOG_VALUES.excerpt,
      status: blog?.status ?? EMPTY_BLOG_VALUES.status,
    },
  });

  const titleLength = useWatch({ control, name: "title" })?.length ?? 0;
  const currentStatus = useWatch({ control, name: "status" });

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (pathname === "/blogs/create") reset(EMPTY_BLOG_VALUES);
  }, [pathname, reset]);

  const save = async (values: BlogUpdateInput, status: BlogUpdateInput["status"]) => {
    setFormError(null);
    try {
      const data = await apiRequest<{ blog: Blog }>(
        blog ? `/api/blogs/${encodeURIComponent(blog.id)}` : "/api/blogs",
        {
          method: blog ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, status }),
        },
      );
      reset({
        title: data.blog.title,
        content: data.blog.content ?? "",
        excerpt: data.blog.excerpt ?? "",
        status: data.blog.status,
      });
      notify(status === "PUBLISHED" ? "Your story is published." : "Draft saved.", "success");
      router.push(
        data.blog.status === "PUBLISHED"
          ? `/blogs/${encodeURIComponent(data.blog.slug)}`
          : "/dashboard",
      );
    } catch (error) {
      const message = getErrorMessage(error, "Unable to save this story.");
      setFormError(message);
      notify(message, "error");
    }
  };

  const submitAs = (status: BlogUpdateInput["status"]) => {
    setValue("status", status, { shouldValidate: true });
    void handleSubmit((values) => save(values, status))();
  };

  const confirmDelete = async () => {
    if (!blog) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/blogs/${encodeURIComponent(blog.id)}`);
      notify("Story deleted.", "success");
      router.push("/dashboard");
    } catch (error) {
      const message = getErrorMessage(error, "Unable to delete this story.");
      notify(message, "error");
      setDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <form
        className="blog-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitAs(currentStatus);
        }}
        noValidate
      >
        {formError ? (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        ) : null}
        <BlogEditorFields
          errors={errors}
          register={register}
          titleLength={titleLength}
        />
        <div className="form-footer">
          <Link className="text-button" href="/dashboard">
            Leave editor
          </Link>
          <div className="form-actions">
            {blog ? (
              <button
                className="text-button delete-link"
                disabled={isSubmitting || deleting}
                onClick={() => setDialogOpen(true)}
                type="button"
              >
                Delete
              </button>
            ) : null}
            <button
              className="button button-outline"
              disabled={isSubmitting || deleting}
              onClick={() => submitAs("DRAFT")}
              type="button"
            >
              Save as draft
            </button>
            <button
              className="button button-primary"
              disabled={isSubmitting || deleting}
              onClick={() => submitAs("PUBLISHED")}
              type="button"
            >
              {isSubmitting
                ? "Saving…"
                : blog?.status === "PUBLISHED"
                  ? "Publish changes"
                  : "Publish story"}
            </button>
          </div>
        </div>
        <p className="form-footnote">
          Published stories are visible to everyone. Drafts are visible only to you.
        </p>
      </form>
      <DeleteConfirmationDialog
        onCancel={() => setDialogOpen(false)}
        onConfirm={() => void confirmDelete()}
        open={dialogOpen}
        pending={deleting}
      />
    </>
  );
}
