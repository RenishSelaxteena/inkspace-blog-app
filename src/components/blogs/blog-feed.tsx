"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import type { Blog, BlogPagination } from "@/lib/blogs/types";
import { BlogGrid } from "@/components/blogs/blog-grid";
import { EmptyState } from "@/components/blogs/empty-state";
import { BlogGridSkeleton } from "@/components/blogs/loading-skeletons";
import { Pagination } from "@/components/blogs/pagination";
import { SearchBar } from "@/components/blogs/search-bar";

type BlogListData = { blogs: Blog[]; pagination: BlogPagination };

export function BlogFeed() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BlogListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), limit: "9" });
    if (query) params.set("q", query);

    void apiRequest<BlogListData>(`/api/blogs?${params}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") return;
        setError("The journal could not be loaded. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, query, retry]);

  return (
    <>
      <div className="journal-tools">
        <div>
          <p className="eyebrow">From the journal</p>
          <h2 className="section-title">Recent stories</h2>
        </div>
        <SearchBar
          onSearch={(value) => {
            setLoading(true);
            setError(null);
            setPage(1);
            if (value === query) setRetry((retryCount) => retryCount + 1);
            else setQuery(value);
          }}
        />
      </div>
      {loading ? (
        <BlogGridSkeleton />
      ) : error ? (
        <div className="inline-error" role="alert">
          <p>{error}</p>
          <button
            className="text-button"
            onClick={() => {
              setLoading(true);
              setError(null);
              setRetry((value) => value + 1);
            }}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : data?.blogs.length ? (
        <>
          <BlogGrid blogs={data.blogs} />
          <Pagination
            onChange={(value) => {
              setLoading(true);
              setError(null);
              setPage(value);
            }}
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
          />
        </>
      ) : (
        <EmptyState
          eyebrow={query ? "No matches this time" : "The first page is still blank"}
          href={query ? undefined : "/blogs/create"}
          message={
            query
              ? "Try another title or a shorter search."
              : "Good journals begin with a first story. Add yours to the conversation."
          }
          action={query ? undefined : "Write the first story"}
          title={query ? "Nothing found" : "A story is waiting to begin"}
        />
      )}
    </>
  );
}
