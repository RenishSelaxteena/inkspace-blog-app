"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

export function WriteStoryLink({
  children,
  className,
  onNavigate,
  ariaCurrent,
}: {
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
  ariaCurrent?: "page";
}) {
  const router = useRouter();

  const openFreshEditor = (event: MouseEvent<HTMLAnchorElement>) => {
    onNavigate?.();
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    const entry = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    router.push(`/blogs/create?fresh=${entry}`);
  };

  return (
    <Link
      className={className}
      href="/blogs/create"
      aria-current={ariaCurrent}
      onClick={openFreshEditor}
      prefetch={false}
    >
      {children}
    </Link>
  );
}
