import { DATA } from "@/data/resume";
import Link from "next/link";

interface BlogFooterProps {
  slug: string;
  title: string;
}

export function BlogFooter({ slug, title }: BlogFooterProps) {
  return (
    <footer className="mt-12 pt-8 border-t border-border/50">
      <div className="flex flex-col space-y-4 max-w-[650px]">
        <div className="flex flex-col space-y-2">
          <h3 className="text-sm font-medium">Enjoyed this post?</h3>
          <p className="text-sm text-muted-foreground">
            Check out more of my{" "}
            <Link href="/blog" className="underline hover:text-foreground transition-colors">
              musings & amusements
            </Link>
            {" "}or connect with me on{" "}
            <a
              href={DATA.contact.social.GitHub.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            {" "}and{" "}
            <a
              href={DATA.contact.social.LinkedIn.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              LinkedIn
            </a>
            .
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>
            Written by {DATA.name} •{" "}
            <a
              href={`${DATA.url}/blog/${slug}`}
              className="underline hover:text-foreground transition-colors"
            >
              Permalink
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

