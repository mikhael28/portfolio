import { getPost } from "@/data/blog";
import { DATA } from "@/data/resume";
import { formatDate } from "@/lib/utils";
import { addImageCaptions } from "@/lib/blog-utils";
import { BlogFooter } from "@/components/blog-footer";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: {
    slug: string;
  };
}): Promise<Metadata | undefined> {
  let post = await getPost(params.slug);

  let {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
    tags,
  } = post.metadata;
  let ogImage = image ? `${DATA.url}${image}` : `${DATA.url}/og?title=${title}`;

  return {
    title,
    description,
    authors: [{ name: DATA.name, url: DATA.url }],
    keywords: tags,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime,
      modifiedTime: post.metadata.updatedAt || publishedTime,
      url: `${DATA.url}/blog/${post.slug}`,
      siteName: DATA.name,
      locale: "en_US",
      authors: [DATA.name],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: "@mikhael28",
    },
    alternates: {
      canonical: `${DATA.url}/blog/${post.slug}`,
    },
  };
}

export default async function Blog({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  let post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <section id="blog">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            image: post.metadata.image ? `${DATA.url}${post.metadata.image}` : `${DATA.url}/og?title=${post.metadata.title}`,
            url: `${DATA.url}/blog/${post.slug}`,
            author: {
              "@type": "Person",
              name: DATA.name,
            },
          }),
        }}
      />
      <h1 className="title font-medium text-2xl tracking-tighter max-w-[650px]">{post.metadata.title}</h1>
      {post.metadata.subtitle && (
        <p className="text-lg text-neutral-600 dark:text-neutral-400 mt-2 mb-4 max-w-[650px]">
          {post.metadata.subtitle}
        </p>
      )}
      <div className="flex justify-between items-center mt-2 mb-4 text-sm max-w-[650px]">
        <Suspense fallback={<p className="h-5" />}>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{formatDate(post.metadata.publishedAt)}</p>
        </Suspense>
      </div>
      {post.metadata.summary && (
        <p className="text-base text-neutral-700 dark:text-neutral-300 mb-8 max-w-[650px] italic">
          {post.metadata.summary}
        </p>
      )}
      <article className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: addImageCaptions(post.source) }}></article>
      <BlogFooter slug={post.slug} title={post.metadata.title} />
    </section>
  );
}
