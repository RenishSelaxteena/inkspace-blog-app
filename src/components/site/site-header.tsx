"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { WriteStoryLink } from "@/components/blogs/write-story-link";

export function SiteHeader({
  authenticated,
}: {
  authenticated: boolean | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          aria-label="InkSpace home"
          className="wordmark"
          href="/"
          onClick={closeMenu}
        >
          inkspace<span className="wordmark-period">.</span>
        </Link>
        <button
          aria-busy={authenticated === null}
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          className="menu-toggle"
          disabled={authenticated === null}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span />
          <span />
        </button>
        <nav
          aria-label="Main navigation"
          className={`primary-navigation${menuOpen ? " is-open" : ""}`}
          id="primary-navigation"
        >
          <Link href="/" onClick={closeMenu}>
            Journal
          </Link>
          {authenticated ? (
            <>
              <Link href="/profile" onClick={closeMenu}>
                Profile
              </Link>
              <button
                className="nav-signout"
                onClick={() => {
                  closeMenu();
                  void signOut({ callbackUrl: "/" });
                }}
                type="button"
              >
                Sign out
              </button>
            </>
          ) : (
            authenticated === false ? (
              <Link href="/login" onClick={closeMenu}>
                Sign in
              </Link>
            ) : null
          )}
          <WriteStoryLink className="nav-write-link" onNavigate={closeMenu}>
            Write a story <span aria-hidden="true">↗</span>
          </WriteStoryLink>
        </nav>
      </div>
    </header>
  );
}
