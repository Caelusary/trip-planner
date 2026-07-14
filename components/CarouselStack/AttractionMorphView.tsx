"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CarouselItem } from "./types";

// Full-screen detail view opened by the "i" info icon on any card. Instead
// of a modal that pops/fades in over the page, this panel is laid out at
// full-viewport size from the start and MORPHS into view: a CSS transform
// (FLIP technique) makes it visually start out scaled/positioned to exactly
// overlay the source card, then animates that transform back to identity —
// so it genuinely reads as the card itself growing into the fullscreen
// surface, not a separate dialog appearing on top of it. Closing reverses
// the same transform, shrinking the surface back down onto the card it
// came from before unmounting.
export function AttractionMorphView({
  item,
  sourceRect,
  triggerEl,
  onClose,
}: {
  item: CarouselItem;
  sourceRect: DOMRect;
  /** The element that opened this dialog — focus returns here on close. */
  triggerEl: HTMLElement | null;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleClose() {
    setExpanded(false);
    window.setTimeout(onClose, 440);
  }

  // This is declared aria-modal, so it must behave like one for keyboard
  // and screen-reader users: move focus in on open, keep it inside the
  // dialog while open (Tab/Shift+Tab wrap instead of escaping to the page
  // behind the overlay), and hand it back to whatever opened the dialog
  // once it unmounts.
  useEffect(() => {
    closeButtonRef.current?.focus();
    return () => {
      triggerEl?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collapsedTransform = `translate(${sourceRect.left}px, ${sourceRect.top}px) scale(${
    sourceRect.width / window.innerWidth
  }, ${sourceRect.height / window.innerHeight})`;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm transition-opacity"
        style={{ opacity: expanded ? 1 : 0, transitionDuration: "460ms" }}
        onClick={handleClose}
        aria-hidden="true"
      />
      {/*
        transform-origin pinned to the top-left so the translate/scale
        values above map directly onto viewport coordinates — no centering
        math needed, the collapsed transform just IS the source card's box.
      */}
      <div
        ref={dialogRef}
        className="absolute inset-0 flex flex-col overflow-y-auto bg-ink-900 shadow-2xl"
        style={{
          transformOrigin: "0 0",
          transform: expanded ? "translate(0px, 0px) scale(1, 1)" : collapsedTransform,
          borderRadius: expanded ? "0px" : "20px",
          transition:
            "transform 460ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 460ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} highlights`}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          ref={closeButtonRef}
          className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink-950/70 text-white shadow-lg backdrop-blur transition hover:bg-ink-800"
          style={{
            opacity: expanded ? 1 : 0,
            transition: expanded ? "opacity 200ms ease 220ms" : "opacity 120ms ease",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="relative h-64 w-full shrink-0 overflow-hidden sm:h-80">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="100vw"
            loading="eager"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 to-transparent" />
          <div className="absolute right-6 bottom-4 left-6">
            <p className="font-display text-2xl font-semibold text-white sm:text-3xl">{item.name}</p>
            <p className="text-accent-400/90 text-sm font-medium">
              @{item.city}, {item.country}
            </p>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-6">
          <p className="text-accent-400 text-xs font-semibold tracking-wide uppercase">
            Best time to visit · {item.bestTime}
          </p>

          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-white/60 uppercase">
              Must-see activities
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {item.activities.map((activity) => (
                <div key={activity.name} className="overflow-hidden rounded-xl bg-white/5">
                  <div className="relative h-28 w-full overflow-hidden sm:h-32">
                    <Image
                      src={activity.image}
                      alt={activity.name}
                      fill
                      sizes="(max-width: 640px) 45vw, 200px"
                      // Eager, not lazy: same fix as CarouselStack's peek
                      // cards — `loading="lazy"` never actually triggered
                      // here either (verified live, stuck at
                      // `complete: false` indefinitely). At most 3-5
                      // activities ever render per attraction, so eagerly
                      // loading all of them is cheap.
                      loading="eager"
                      className="object-cover"
                    />
                  </div>
                  <p className="px-2.5 py-2 text-xs leading-snug text-white/90">{activity.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-4">
            <p className="mb-1 text-xs font-semibold tracking-wide text-white/60 uppercase">
              Fun fact
            </p>
            <p className="text-sm text-white/70 italic">{item.funFact}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
