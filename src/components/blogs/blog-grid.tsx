import type { Blog } from "@/lib/blogs/types";
import { BlogCard } from "@/components/blogs/blog-card";

export function BlogGrid({ blogs }: { blogs: Blog[] }) {
  return (
    <div className="blog-grid">
      {blogs.map((blog, index) => (
        <BlogCard
          blog={blog}
          featured={index === 0}
          index={index}
          key={blog.id}
        />
      ))}
    </div>
  );
}
