import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <Link className="footer-wordmark" href="/">
          inkspace.
        </Link>
        <p>A little room for the things worth saying.</p>
        <span className="footer-note">For the curious · Vol. 01</span>
      </div>
    </footer>
  );
}
