"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import type { Confidence, Poi, PoiCategory, SourceKind } from "../poi";

const CATEGORY_DOT_CLASS: Record<PoiCategory, string> = {
  landmark: "bg-poi-landmark",
  business: "bg-poi-business",
  activity: "bg-poi-activity",
  transport: "bg-poi-transport",
  nature: "bg-poi-nature",
};

const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  trailer: "Trailer",
  screenshot: "Screenshot",
  "official-site": "Official site",
  "in-game": "In-game",
  community: "Community",
};

const CONFIDENCE_CLASS: Record<Confidence, string> = {
  confirmed: "border-accent-2 text-accent-2",
  likely: "border-poi-business text-poi-business",
  speculative: "border-dashed border-text-dim text-text-dim",
};

type CopyStatus = "idle" | "copied" | "failed";

type Props = {
  poi: Poi;
  /** Deep link to the current view with this POI selected. */
  getShareUrl: () => string;
  onClose: () => void;
};

function formatMeters(value: number): string {
  return `${Math.round(value).toLocaleString("en-US")} m`;
}

/**
 * Details for the selected POI, with its provenance citation and a copy-link
 * button. Non-modal so the map stays usable; Escape or the close button
 * dismisses it. Mount it only while a POI is selected.
 */
export function PoiDetailSheet({ poi, getShareUrl, onClose }: Props) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const { source } = poi;
  const [x, y] = poi.position;
  const sourceHeadingId = `${poi.id}-source`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <Dialog.Root
      open
      modal={false}
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Popup className="hud-popover fixed inset-x-0 bottom-0 z-10 max-h-[50dvh] overflow-y-auto p-4 text-text shadow-2xl sm:inset-x-auto sm:top-20 sm:right-4 sm:bottom-auto sm:max-h-[calc(100dvh-17rem)] sm:w-80 motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:data-[starting-style]:translate-y-1 motion-safe:data-[starting-style]:opacity-0">
          <div className="flex items-start justify-between gap-2 border-b border-line pb-3">
            <div className="min-w-0">
              <p className="hud-label flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${CATEGORY_DOT_CLASS[poi.category]}`}
                />
                {poi.category}
              </p>
              <Dialog.Title className="mt-1 text-lg leading-tight font-semibold break-words">
                {poi.name}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Close details"
              className="hud-button -mt-1 -mr-2 shrink-0 text-base"
            >
              <span aria-hidden="true">×</span>
            </Dialog.Close>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 py-3 text-sm">
            <dt className="hud-label self-center">Confidence</dt>
            <dd>
              <span
                className={`inline-block border px-2 py-0.5 font-mono text-xs tracking-widest uppercase ${CONFIDENCE_CLASS[poi.confidence]}`}
              >
                {poi.confidence}
              </span>
            </dd>
            <dt className="hud-label self-center">Position</dt>
            <dd className="flex flex-wrap gap-x-3 font-mono">
              <span className="whitespace-nowrap">X {formatMeters(x)}</span>
              <span className="whitespace-nowrap">Y {formatMeters(y)}</span>
            </dd>
          </dl>

          <section
            aria-labelledby={sourceHeadingId}
            className="border-t border-line pt-3"
          >
            <h3 id={sourceHeadingId} className="hud-label mb-2">
              Source
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-text-dim">Kind</dt>
              <dd>{SOURCE_KIND_LABEL[source.kind]}</dd>
              <dt className="text-text-dim">Reference</dt>
              <dd className="break-words">{source.ref}</dd>
              {source.url && (
                <>
                  <dt className="text-text-dim">Link</dt>
                  <dd className="break-all">
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent-2 underline"
                    >
                      {source.url}
                    </a>
                  </dd>
                </>
              )}
              {source.license && (
                <>
                  <dt className="text-text-dim">License</dt>
                  <dd>{source.license}</dd>
                </>
              )}
              <dt className="text-text-dim">Added by</dt>
              <dd className="break-words">{source.addedBy}</dd>
            </dl>
          </section>

          <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
            <button
              type="button"
              onClick={copyLink}
              className="hud-button border border-line uppercase"
            >
              Copy link
            </button>
            <p role="status" className="text-xs text-text-dim">
              {copyStatus === "copied" && "Link copied"}
              {copyStatus === "failed" && "Copy failed. Use the address bar."}
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
