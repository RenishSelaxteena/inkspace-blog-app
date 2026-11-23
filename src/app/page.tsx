import Link from "next/link";
import { BlogFeed } from "@/components/blogs/blog-feed";
import { WriteStoryLink } from "@/components/blogs/write-story-link";

export default function HomePage() {
  return (
    <main>
      <section className="editorial-hero">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            Independent words · Open minds · Issue No. 01
          </p>
          <h1>
            A place for
            <br />
            <em>the things</em>
            <br />
            that stay with you.
          </h1>
          <p className="hero-intro">
            InkSpace is an independent journal for thoughtful ideas, lived
            experiences, and the words we want to pass along.
          </p>
          <Link className="hero-cta" href="#journal">
            Find your next read <span aria-hidden="true">↓</span>
          </Link>
        </div>
        <div aria-label="InkSpace journal cover artwork" className="hero-art" role="img">
          <div className="hero-art-topline">
            <span>INKSPACE</span>
            <span>VOL. 01 — THE OPENING</span>
          </div>
          <div className="hero-art-shape">
            <span>words</span>
          </div>
          <p className="hero-art-caption">A journal for the curious.</p>
          <span aria-hidden="true" className="hero-art-number">01</span>
        </div>
        <div className="hero-side-note">
          <span className="side-note-rule" />
          <span>READ SLOWLY</span>
        </div>
      </section>

      <section className="journal-section" id="journal">
        <div className="journal-intro">
          <p className="eyebrow">A living collection</p>
          <p>
            Notes from different lives, gathered in one place. Written by
            people who believe a good story can make the world feel a little
            larger.
          </p>
        </div>
        <BlogFeed />
      </section>

      <section className="invitation-band">
        <p className="eyebrow">Have something on your mind?</p>
        <h2>Make a little room for it.</h2>
        <WriteStoryLink className="button button-light">
          Start writing <span aria-hidden="true">↗</span>
        </WriteStoryLink>
      </section>
    </main>
  );
}
