import BlurFade from "@/components/magicui/blur-fade";
import { getBlogPosts } from "@/data/blog";
import { DATA } from "@/data/resume";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog",
  description: "Musings and amusements from Michael Litchev - thoughts on software engineering, technology, and life.",
  openGraph: {
    title: "Blog | Michael Litchev",
    description: "Musings and amusements from Michael Litchev - thoughts on software engineering, technology, and life.",
    url: `${DATA.url}/blog`,
    siteName: DATA.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Blog | Michael Litchev",
    description: "Musings and amusements from Michael Litchev - thoughts on software engineering, technology, and life.",
  },
  alternates: {
    canonical: `${DATA.url}/blog`,
  },
};

const BLUR_FADE_DELAY = 0.04;

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <section>
      <BlurFade delay={BLUR_FADE_DELAY}>
        <h1 className="font-medium text-2xl mb-8 tracking-tighter">Musings & Amusements</h1>
      </BlurFade>
      {posts
        .sort((a, b) => {
          if (new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)) {
            return -1;
          }
          return 1;
        })
        .map((post, id) => (
          <BlurFade delay={BLUR_FADE_DELAY * 2 + id * 0.05} key={post.slug}>
            <Link className="flex flex-col space-y-1 mb-4" href={`/blog/${post.slug}`}>
              <div className="w-full flex flex-col">
                <p className="tracking-tight">{post.metadata.title}</p>
                <p className="h-6 text-xs text-muted-foreground">{post.metadata.publishedAt}</p>
              </div>
            </Link>
          </BlurFade>
        ))}
    </section>
  );
}
