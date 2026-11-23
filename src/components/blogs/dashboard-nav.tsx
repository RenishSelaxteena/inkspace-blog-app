import Link from "next/link";
import { WriteStoryLink } from "@/components/blogs/write-story-link";

export function DashboardNav({ active = "stories" }: { active?: string }) {
  return (
    <nav aria-label="Writing navigation" className="dashboard-nav">
      <Link aria-current={active === "stories" ? "page" : undefined} href="/dashboard">
        Your stories
      </Link>
      <WriteStoryLink ariaCurrent={active === "new" ? "page" : undefined}>
        New story <span aria-hidden="true">↗</span>
      </WriteStoryLink>
    </nav>
  );
}
