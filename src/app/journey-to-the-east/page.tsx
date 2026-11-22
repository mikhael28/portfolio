import { BookReader } from "@/components/book-reader";
import { BOOK, DATA } from "@/data/resume";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: BOOK.shortTitle,
  description: BOOK.description,
  openGraph: {
    title: `${BOOK.title} | ${DATA.name}`,
    description: BOOK.description,
    url: `${DATA.url}${BOOK.href}`,
    siteName: DATA.name,
    type: "book",
    authors: [DATA.name],
    locale: "en_US",
    images: [{ url: BOOK.coverUrl, width: 1180, height: 1876, alt: `Cover of ${BOOK.title}` }],
  },
  twitter: {
    card: "summary_large_image",
    title: BOOK.title,
    description: BOOK.description,
    images: [BOOK.coverUrl],
  },
  alternates: {
    canonical: `${DATA.url}${BOOK.href}`,
  },
};

export default function JourneyToTheEastPage() {
  return <BookReader />;
}
