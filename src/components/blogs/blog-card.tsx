import Link from "next/link";
import type { Blog } from "@/lib/blogs/types";
import { formatDate } from "@/lib/blogs/types";

export function BlogCard({
  blog,
  featured = false,
  index = 0,
}: {
  blog: Blog;
  featured?: boolean;
  index?: number;
}) {
  const palette = ["pistachio", "sand", "cherry"] as const;
  const illustrationTone = palette[index % palette.length];

  return (
    <article className={`blog-card${featured ? " blog-card-featured" : ""}`}>
      <div
        aria-hidden="true"
        className={`card-illustration illustration-${illustrationTone}`}
      >
        <span className="illustration-index">INKSPACE · {String(index + 1).padStart(2, "0")}</span>
        <span aria-hidden="true" className="illustration-letter">
          {blog.title.trim().charAt(0).toUpperCase()}
        </span>
        <span aria-hidden="true" className="illustration-orbit" />
      </div>
      <div className="card-copy">
        <div className="card-meta">
          <span>{blog.author.name}</span>
          <span aria-hidden="true" className="meta-dot">·</span>
          <time dateTime={blog.publishedAt ?? blog.createdAt}>
            {formatDate(blog.publishedAt)}
          </time>
        </div>
        <h3>
          <Link href={`/blogs/${encodeURIComponent(blog.slug)}`}>{blog.title}</Link>
        </h3>
        {blog.excerpt ? <p className="card-excerpt">{blog.excerpt}</p> : null}
        <Link
          aria-label={`Continue reading ${blog.title}`}
          className="read-link"
          href={`/blogs/${encodeURIComponent(blog.slug)}`}
        >
          Continue reading <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
