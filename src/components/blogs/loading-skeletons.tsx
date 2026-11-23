export function BlogGridSkeleton() {
  return (
    <div aria-label="Loading stories" className="blog-grid" role="status">
      {[0, 1, 2].map((item) => (
        <div aria-hidden="true" className="blog-skeleton" key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
