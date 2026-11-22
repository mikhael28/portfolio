"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BOOK } from "@/data/resume";
import { cn } from "@/lib/utils";
import type { Book, Contents, Location, NavItem, Rendition } from "epubjs";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight, List, LoaderCircle, X } from "lucide-react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type ReaderTheme = "light" | "dark";
type Status = "loading" | "ready" | "error";
type TocEntry = { label: string; href: string };
type SavedPosition = { cfi: string; edition: string; updatedAt: number };
type CachedLocations = { edition: string; locations: string };
type CurrentLocation = {
  href: string;
  page: number;
  totalPages: number;
  atStart: boolean;
  atEnd: boolean;
  // False for sections outside the reading order, like the cover.
  linear: boolean;
};

const POSITION_KEY = "jtte:position:v1";
const LOCATIONS_KEY = "jtte:locations:v1";
// Characters per "location" when computing whole-book progress. Larger = faster to generate.
const LOCATION_CHARS = 1200;
const SWIPE_MIN_DISTANCE = 40;

// Injected into every chapter iframe. The book's own stylesheet hard-codes black text,
// so colours are forced to follow the reader theme, which is toggled via a data attribute.
// color-scheme must match the parent page, or browsers paint an opaque backdrop behind the iframe.
const READER_CSS = `
:root { color-scheme: light; --reader-fg: hsl(222 47% 11%); }
:root[data-reader-theme="dark"] { color-scheme: dark; --reader-fg: hsl(213 27% 84%); }
html, body { background: transparent !important; color: var(--reader-fg) !important; }
body * { color: inherit !important; }
p { line-height: 1.6 !important; hyphens: auto !important; -webkit-hyphens: auto !important; }
a { text-decoration: underline; text-underline-offset: 2px; }
::selection { background: rgb(127 127 127 / 0.3); }
`;

function readStorage<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked (private mode); reading still works, it just won't resume.
  }
}

const stripFragment = (href: string) => href.split("#")[0].replace(/^\.\//, "");

function flattenToc(items: NavItem[]): TocEntry[] {
  return items.flatMap((item) => [
    { label: item.label.trim(), href: item.href },
    ...flattenToc(item.subitems ?? []),
  ]);
}

export function BookReader() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const locationRef = useRef<CurrentLocation | null>(null);
  const themeRef = useRef<ReaderTheme>("light");
  const tocOpenRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [percentage, setPercentage] = useState<number | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [resumed, setResumed] = useState(false);

  const { resolvedTheme } = useTheme();

  const next = useCallback(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    // epub.js gives non-linear sections (the cover) no "next"; step into the reading order instead.
    if (locationRef.current?.linear === false) void rendition.display();
    else void rendition.next();
  }, []);
  const prev = useCallback(() => void renditionRef.current?.prev(), []);
  const goTo = useCallback((target: string | number) => {
    const rendition = renditionRef.current;
    if (rendition) void (typeof target === "number" ? rendition.display(target) : rendition.display(target));
    setTocOpen(false);
    setResumed(false);
  }, []);

  const swipeStart = useCallback((x: number, y: number) => {
    swipeStartRef.current = { x, y };
  }, []);
  const swipeEnd = useCallback(
    (x: number, y: number) => {
      const start = swipeStartRef.current;
      swipeStartRef.current = null;
      if (!start) return;
      const dx = x - start.x;
      const dy = y - start.y;
      if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) next();
      else prev();
    },
    [next, prev],
  );

  // Load the book once. Everything epub.js touches the DOM, so it is imported client-side only.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let cancelled = false;
    let book: Book | undefined;
    let rendition: Rendition | undefined;
    // epub.js work that must finish before the book can be safely destroyed.
    let busy: Promise<unknown> = Promise.resolve();

    const onKeyDown = (event: KeyboardEvent) => {
      if (tocOpenRef.current || event.altKey || event.metaKey || event.ctrlKey) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") next();
      if (event.key === "ArrowLeft" || event.key === "PageUp") prev();
    };

    (async () => {
      try {
        const { default: ePub } = await import("epubjs");
        if (cancelled) return;

        book = ePub(BOOK.epubUrl, { openAs: "epub" });
        // A failed download only emits this event; the loaded.* promises never settle.
        book.on("openFailed", (error: Error) => {
          if (cancelled) return;
          console.error("Failed to open book", error);
          setStatus("error");
        });
        rendition = book.renderTo(viewer, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "auto",
          minSpreadWidth: 800,
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;
        busy = rendition.started;
        const activeBook = book;

        rendition.hooks.content.register((contents: Contents) => {
          const root = contents.documentElement;
          contents.addStylesheetCss(READER_CSS, "portfolio-reader");
          root.setAttribute("data-reader-theme", themeRef.current);
          // epub.js writes chapters in as HTML, which ignores xml:lang; hyphenation needs a real lang.
          if (!root.getAttribute("lang")) root.setAttribute("lang", root.getAttribute("xml:lang") || "en");
        });

        const metadata = await book.loaded.metadata;
        // Ties the cached position/locations to this edition of the file.
        const edition = `${metadata.identifier}|${metadata.modified_date}`;
        let lastCfi: string | null = null;

        rendition.on("relocated", (loc: Location) => {
          if (cancelled || !loc?.start) return;
          lastCfi = loc.start.cfi;
          const current: CurrentLocation = {
            href: stripFragment(loc.start.href),
            page: loc.start.displayed.page,
            totalPages: loc.start.displayed.total,
            atStart: loc.atStart,
            atEnd: loc.atEnd,
            linear: activeBook.spine.get(loc.start.index)?.linear ?? true,
          };
          locationRef.current = current;
          setLocation(current);
          if (activeBook.locations.length() > 0) {
            setPercentage(activeBook.locations.percentageFromCfi(loc.start.cfi));
          }
          writeStorage(POSITION_KEY, { cfi: loc.start.cfi, edition, updatedAt: Date.now() } satisfies SavedPosition);
        });
        rendition.on("touchstart", (event: TouchEvent) => swipeStart(event.changedTouches[0].screenX, event.changedTouches[0].screenY));
        rendition.on("touchend", (event: TouchEvent) => swipeEnd(event.changedTouches[0].screenX, event.changedTouches[0].screenY));
        rendition.on("keydown", onKeyDown);
        window.addEventListener("keydown", onKeyDown);

        const navigation = await book.loaded.navigation;
        if (cancelled) return;
        setToc(flattenToc(navigation.toc));

        const saved = readStorage<SavedPosition>(POSITION_KEY);
        const activeRendition = rendition;
        // New readers open at the start chapter. If a saved spot or the start chapter can't be
        // found (say, a new edition), fall back to spine index 0, the cover.
        const showStart = () => activeRendition.display(BOOK.startHref).catch(() => activeRendition.display(0));
        busy = saved ? activeRendition.display(saved.cfi).catch(showStart) : showStart();
        await busy;
        if (cancelled) return;
        setStatus("ready");
        if (saved) setResumed(true);

        // Whole-book percentages need every chapter measured once; cache the result per edition.
        const cached = readStorage<CachedLocations>(LOCATIONS_KEY);
        if (cached?.edition === edition) {
          book.locations.load(cached.locations);
        } else {
          await book.locations.generate(LOCATION_CHARS);
          if (cancelled) return;
          writeStorage(LOCATIONS_KEY, { edition, locations: book.locations.save() } satisfies CachedLocations);
        }
        if (lastCfi) setPercentage(book.locations.percentageFromCfi(lastCfi));
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to open book", error);
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown);
      renditionRef.current = null;
      viewer.innerHTML = "";
      // Destroying mid-open or mid-render makes epub.js throw from its own queued work, so tear
      // down once that settles (immediately, if it already has). If opening failed, it never
      // settles and there is nothing rendered to tear down.
      const doomedBook = book;
      const doomedRendition = rendition;
      busy
        .catch(() => undefined)
        .finally(() => {
          doomedRendition?.destroy();
          doomedBook?.destroy();
        });
    };
  }, [next, prev, swipeStart, swipeEnd]);

  // Keep the iframe content in step with the site's light/dark toggle.
  useEffect(() => {
    const theme: ReaderTheme = resolvedTheme === "dark" ? "dark" : "light";
    themeRef.current = theme;
    const contents = (renditionRef.current?.getContents() ?? []) as unknown as Contents[];
    contents.forEach((content) => content.documentElement.setAttribute("data-reader-theme", theme));
  }, [resolvedTheme, status]);

  // The reader is a full-viewport overlay; stop the page underneath from scrolling or rubber-banding.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    tocOpenRef.current = tocOpen;
    if (!tocOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setTocOpen(false);
    window.addEventListener("keydown", onKeyDown);
    document.querySelector<HTMLElement>("[data-toc-active='true']")?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tocOpen]);

  useEffect(() => {
    if (!resumed) return;
    const timeout = setTimeout(() => setResumed(false), 6000);
    return () => clearTimeout(timeout);
  }, [resumed]);

  const currentEntry = location ? toc.find((entry) => stripFragment(entry.href) === location.href) : undefined;
  const chapterLabel = currentEntry?.label ?? (location ? (location.linear ? "Front matter" : "Cover") : "");
  const atStart = !location || location.atStart || !location.linear;
  const percent = percentage === null ? null : Math.round(percentage * 100);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border/60 px-2 sm:px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href="/" aria-label="Back to portfolio" className={buttonVariants({ variant: "ghost", size: "icon" })}>
              <ArrowLeft className="size-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Back to portfolio</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Table of contents"
              aria-expanded={tocOpen}
              disabled={toc.length === 0}
              onClick={() => setTocOpen(true)}
            >
              <List className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Contents</TooltipContent>
        </Tooltip>

        <div className="min-w-0 flex-1 px-2 text-center">
          <h1 className="sr-only text-sm font-semibold tracking-tight sm:not-sr-only sm:block sm:truncate">{BOOK.shortTitle}</h1>
          <p className="truncate text-sm font-medium sm:text-xs sm:font-normal sm:text-muted-foreground">{chapterLabel || " "}</p>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <ModeToggle />
          </TooltipTrigger>
          <TooltipContent>Theme</TooltipContent>
        </Tooltip>
        <a
          href={BOOK.kindleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: "sm" }), "ml-1 h-8 gap-1.5 rounded-full px-3")}
        >
          <BookOpen className="size-3.5" />
          <span className="sm:hidden">Kindle</span>
          <span className="hidden sm:inline">Read on Kindle</span>
        </a>
      </header>

      <main
        className="relative min-h-0 flex-1"
        onTouchStart={(event) => swipeStart(event.changedTouches[0].screenX, event.changedTouches[0].screenY)}
        onTouchEnd={(event) => swipeEnd(event.changedTouches[0].screenX, event.changedTouches[0].screenY)}
      >
        <div
          ref={viewerRef}
          className={cn(
            "absolute inset-x-4 inset-y-4 mx-auto max-w-[680px] transition-opacity duration-300 md:inset-x-16 lg:max-w-[1100px] sm:inset-y-6",
            status === "ready" ? "opacity-100" : "opacity-0",
          )}
        />

        {status === "ready" && (
          <>
            <PageButton side="left" hidden={atStart} onClick={prev} />
            <PageButton side="right" hidden={location?.atEnd} onClick={next} />
          </>
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
            <Image
              src={BOOK.coverUrl}
              alt={`Cover of ${BOOK.title}`}
              width={1180}
              height={1876}
              priority
              className="h-auto w-36 rounded-md shadow-[var(--shadow-xl)] sm:w-44"
            />
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Opening the book…
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="font-medium">The book couldn&apos;t be loaded.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Check your connection and refresh, or read it on Kindle instead.
            </p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        )}

        {resumed && (
          <div
            role="status"
            className="absolute inset-x-0 bottom-4 z-10 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-background/95 py-1.5 pl-4 pr-1.5 text-xs shadow-[var(--shadow-lg)] backdrop-blur animate-in fade-in slide-in-from-bottom-2 sm:gap-3 sm:text-sm"
          >
            <span>Picked up where you left off</span>
            <Button variant="ghost" size="sm" className="h-7 rounded-full" onClick={() => goTo(BOOK.startHref)}>
              Start over
            </Button>
          </div>
        )}

        {tocOpen && (
          <div className="absolute inset-0 z-20 flex" role="dialog" aria-modal="true" aria-label="Table of contents">
            <button
              type="button"
              aria-label="Close table of contents"
              className="absolute inset-0 bg-black/30 animate-in fade-in"
              onClick={() => setTocOpen(false)}
            />
            <nav className="relative flex h-full w-[min(22rem,85vw)] flex-col border-r border-border/60 bg-background shadow-[var(--shadow-xl)] animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between border-b border-border/60 py-2 pl-4 pr-2">
                <h2 className="text-sm font-semibold">Contents</h2>
                <Button variant="ghost" size="icon" aria-label="Close table of contents" onClick={() => setTocOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <ol className="flex-1 overflow-y-auto overscroll-contain p-2">
                {toc.map((entry) => {
                  const active = entry === currentEntry;
                  return (
                    <li key={entry.href}>
                      <button
                        type="button"
                        data-toc-active={active}
                        aria-current={active ? "location" : undefined}
                        onClick={() => goTo(entry.href)}
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                          active ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {entry.label}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        )}
      </main>

      <footer className="relative flex h-12 shrink-0 items-center gap-2 border-t border-border/60 px-2 sm:px-4">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-border/40" aria-hidden>
          <div className="h-full bg-foreground/60 transition-[width] duration-300" style={{ width: `${percent ?? 0}%` }} />
        </div>
        <Button variant="ghost" size="icon" aria-label="Previous page" className="md:hidden" disabled={status !== "ready" || atStart} onClick={prev}>
          <ChevronLeft className="size-4" />
        </Button>
        <p className="flex-1 truncate text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {location && location.totalPages > 0 && (
            <span>
              Page {location.page} of {location.totalPages} in chapter
            </span>
          )}
          {percent !== null && <span> · {percent}% read</span>}
        </p>
        <Button variant="ghost" size="icon" aria-label="Next page" className="md:hidden" disabled={status !== "ready" || location?.atEnd} onClick={next}>
          <ChevronRight className="size-4" />
        </Button>
      </footer>
    </div>
  );
}

function PageButton({ side, hidden, onClick }: { side: "left" | "right"; hidden?: boolean; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={side === "left" ? "Previous page" : "Next page"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 hidden size-10 -translate-y-1/2 text-muted-foreground hover:text-foreground md:inline-flex",
        side === "left" ? "left-3" : "right-3",
        hidden && "invisible",
      )}
    >
      <Icon className="size-5" />
    </Button>
  );
}
