import Link from "next/link";
import { WriteStoryLink } from "@/components/blogs/write-story-link";

export function EmptyState({
  eyebrow = "A quiet page",
  title,
  message,
  action,
  href,
}: {
  eyebrow?: string;
  title: string;
  message: string;
  action?: string;
  href?: string;
}) {
  return (
    <section className="empty-state">
      <span aria-hidden="true" className="empty-mark">
        ✳
      </span>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="empty-message">{message}</p>
      {action && href === "/blogs/create" ? (
        <WriteStoryLink className="button button-outline">
          {action} <span aria-hidden="true">↗</span>
        </WriteStoryLink>
      ) : action && href ? (
        <Link className="button button-outline" href={href}>
          {action} <span aria-hidden="true">↗</span>
        </Link>
      ) : null}
    </section>
  );
}
