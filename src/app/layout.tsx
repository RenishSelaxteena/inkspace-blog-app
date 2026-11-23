import type { Metadata } from "next";
import { Suspense } from "react";
import { ToastProvider } from "@/components/providers/toast-provider";
import { SiteHeader } from "@/components/site/site-header";
import { SessionHeader } from "@/components/site/session-header";
import { SiteFooter } from "@/components/site/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "InkSpace — A journal for the curious",
    template: "%s — InkSpace",
  },
  description:
    "An independent journal for thoughtful ideas, lived experiences, and the words we want to pass along.",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <ToastProvider>
          <Suspense fallback={<SiteHeader authenticated={null} />}>
            <SessionHeader />
          </Suspense>
          <div className="site-content">{children}</div>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
