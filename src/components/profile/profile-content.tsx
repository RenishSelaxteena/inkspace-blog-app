"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { apiRequest, ApiRequestError, getErrorMessage } from "@/lib/api-client";
import type { Blog } from "@/lib/blogs/types";
import { formatDate } from "@/lib/blogs/types";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validation/profile";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { useToast } from "@/components/providers/toast-provider";
import { WriteStoryLink } from "@/components/blogs/write-story-link";

type Profile = {
  id: string;
  name: string;
  email: string;
  storyCounts: { total: number; published: number; drafts: number };
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
}

function ProfileNameEditor({
  name,
  onUpdated,
}: {
  name: string;
  onUpdated: (name: string) => void;
}) {
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name },
  });

  const save = handleSubmit(async (values) => {
    try {
      const { user } = await apiRequest<{ user: { name: string } }>(
        "/api/users/me",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      onUpdated(user.name);
      reset({ name: user.name });
      setEditing(false);
      notify("Display name updated.", "success");
    } catch (error) {
      notify(getErrorMessage(error, "Unable to update your display name."), "error");
    }
  });

  if (!editing) {
    return (
      <button
        className="button button-outline profile-edit-name"
        onClick={() => setEditing(true)}
        type="button"
      >
        Edit profile
      </button>
    );
  }

  return (
    <form className="profile-name-form" onSubmit={save} noValidate>
      <p className="eyebrow">Edit your profile</p>
      <label htmlFor="profile-name">Display name</label>
      <input
        {...register("name")}
        aria-describedby={errors.name ? "profile-name-error" : undefined}
        aria-invalid={Boolean(errors.name)}
        autoComplete="name"
        id="profile-name"
        maxLength={80}
      />
      {errors.name ? (
        <p className="field-error" id="profile-name-error">
          {errors.name.message}
        </p>
      ) : null}
      <div className="profile-form-actions">
        <button className="button button-outline" disabled={isSubmitting} type="button"
          onClick={() => {
            reset({ name });
            setEditing(false);
          }}
        >
          Cancel
        </button>
        <button className="button button-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving…" : "Save name"}
        </button>
      </div>
    </form>
  );
}

function ProfileStoryRow({ blog }: { blog: Blog }) {
  const isDraft = blog.status === "DRAFT";
  const excerpt = blog.excerpt?.trim() || blog.content?.trim() || "";
  return (
    <article className="profile-story-row">
      <div className="profile-story-main">
        <div className="profile-story-title-line">
          <h3>{blog.title}</h3>
          <span className={`status-pill status-${blog.status.toLowerCase()}`}>
            {isDraft ? "Draft" : "Published"}
          </span>
        </div>
        <p className="profile-story-excerpt">
          {excerpt
            ? `${excerpt.slice(0, 170)}${excerpt.length > 170 ? "…" : ""}`
            : "A story still finding its words."}
        </p>
        <p className="profile-story-date">
          <span>{isDraft ? "Last tended" : "Published"}</span>
          {formatDate(isDraft ? blog.updatedAt : blog.publishedAt)}
        </p>
      </div>
      <div className="profile-story-actions">
        <Link
          className="text-button"
          href={`/blogs/${encodeURIComponent(blog.slug)}`}
        >
          {isDraft ? "View draft" : "Read story"} <span aria-hidden="true">↗</span>
        </Link>
        <Link
          aria-label={`Edit ${blog.title}`}
          className="text-button"
          href={`/blogs/${encodeURIComponent(blog.id)}/edit`}
        >
          Edit
        </Link>
      </div>
    </article>
  );
}

function StorySection({
  title,
  blogs,
  emptyMessage,
}: {
  title: string;
  blogs: Blog[];
  emptyMessage: string;
}) {
  return (
    <section aria-label={title} className="profile-story-section">
      <div className="profile-section-heading">
        <h2>{title}</h2>
        <span>{blogs.length}</span>
      </div>
      {blogs.length ? (
        <div className="profile-story-list">
          {blogs.map((blog) => <ProfileStoryRow blog={blog} key={blog.id} />)}
        </div>
      ) : (
        <p className="profile-empty">{emptyMessage}</p>
      )}
    </section>
  );
}

export function ProfileContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      apiRequest<{ profile: Profile }>("/api/users/me", {
        cache: "no-store",
        signal: controller.signal,
      }),
      apiRequest<{ blogs: Blog[] }>("/api/users/me/blogs", {
        cache: "no-store",
        signal: controller.signal,
      }),
    ])
      .then(([profileData, blogData]) => {
        setProfile(profileData.profile);
        setBlogs(blogData.blogs);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setError("Your session has ended. Sign in again to view your profile.");
        } else {
          setError(getErrorMessage(reason, "Unable to load your profile."));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <main className="profile-page">
        <div aria-label="Loading profile" className="profile-skeleton" role="status">
          <span />
          <span />
          <span />
        </div>
      </main>
    );
  }

  if (!profile || error) {
    return (
      <main className="profile-page">
        <section className="profile-error">
          <p className="eyebrow">Your writing room</p>
          <h1>Profile unavailable.</h1>
          <p className="form-alert" role="alert">
            {error ?? "Unable to load your profile."}
          </p>
          <Link className="button button-outline" href="/login?callbackUrl=%2Fprofile">
            Sign in again
          </Link>
        </section>
      </main>
    );
  }

  const drafts = blogs.filter((blog) => blog.status === "DRAFT");
  const published = blogs.filter((blog) => blog.status === "PUBLISHED");

  return (
    <main className="profile-page">
      <header className="profile-hero">
        <div className="profile-portrait">
          <p>INKSPACE<br />CONTRIBUTOR</p>
          <div className="profile-avatar" role="img" aria-label={`Profile initials ${initials(profile.name)}`}>
            {initials(profile.name)}
          </div>
          <span>ISSUE NO. 01</span>
        </div>
        <div className="profile-identity">
          <p className="eyebrow">A life in words · InkSpace journal</p>
          <h1>{profile.name}</h1>
          <p className="profile-email">{profile.email}</p>
          <p className="profile-introduction">Your corner of the journal.</p>
          <p className="profile-introduction-note">
            Gather the pieces you have written, keep a thought for later, and
            return whenever a new story finds you.
          </p>
        </div>
        <div className="profile-hero-actions">
          <ProfileNameEditor
            key={profile.name}
            name={profile.name}
            onUpdated={(name) => setProfile((current) => current ? { ...current, name } : current)}
          />
          <div className="profile-signout">
            <SignOutButton />
          </div>
        </div>
      </header>

      <section aria-label="Story counts" className="profile-counts">
        <div>
          <span className="profile-count-index">01 / COLLECTION</span>
          <strong>{profile.storyCounts.total}</strong>
          <span>Total stories</span>
        </div>
        <div>
          <span className="profile-count-index">02 / SHARED</span>
          <strong>{profile.storyCounts.published}</strong>
          <span>Published</span>
        </div>
        <div>
          <span className="profile-count-index">03 / IN PROGRESS</span>
          <strong>{profile.storyCounts.drafts}</strong>
          <span>Drafts</span>
        </div>
      </section>

      <div className="profile-stories">
        <div className="profile-stories-title">
          <div>
            <p className="eyebrow">The collected edition</p>
            <h2>Your stories</h2>
          </div>
          <WriteStoryLink className="button button-primary">
            Write a story <span aria-hidden="true">↗</span>
          </WriteStoryLink>
        </div>
        <div className="profile-story-sections">
          <StorySection
            blogs={drafts}
            emptyMessage="No drafts on your desk."
            title="Drafts"
          />
          <StorySection
            blogs={published}
            emptyMessage="Your published stories will appear here."
            title="Published"
          />
        </div>
      </div>
    </main>
  );
}
