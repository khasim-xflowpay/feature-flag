"use client";

import { useId, useState } from "react";
import { featureFlagsMessages as msg } from "../messages";

const PREVIEW_LIMIT = msg.table.ownerIdsPreviewLimit;

type Props = {
	ids: string[];
};

export function OwnerIdsCell({ ids }: Props) {
	const [expanded, setExpanded] = useState(false);
	const listId = useId();

	if (ids.length === 0) {
		return <span className="text-xs text-white/20">{msg.table.missingValue}</span>;
	}

	const hasMore = ids.length > PREVIEW_LIMIT;
	const visibleIds = expanded ? ids : ids.slice(0, PREVIEW_LIMIT);
	const hiddenCount = ids.length - PREVIEW_LIMIT;

	return (
		<div className="w-full min-w-0">
			<div className="mb-1.5 flex items-center gap-2">
				<span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)]">
					{msg.table.ownerIdsCount(ids.length)}
				</span>
			</div>

			<ul
				id={listId}
				className="space-y-1"
				aria-label={`${ids.length} allowed account owner IDs`}
			>
				{visibleIds.map((id, index) => (
					<li key={`${id}-${index}`} className="w-full">
						<OwnerIdChip id={id} />
					</li>
				))}
			</ul>

			{hasMore ? (
				<button
					type="button"
					onClick={() => setExpanded((prev) => !prev)}
					aria-expanded={expanded}
					aria-controls={listId}
					className="mt-2 inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
				>
					<ChevronIcon expanded={expanded} />
					{expanded
						? msg.table.ownerIdsShowLess
						: msg.table.ownerIdsShowMore(hiddenCount)}
				</button>
			) : null}
		</div>
	);
}

function OwnerIdChip({ id }: { id: string }) {
	return (
		<span className="block w-full rounded-md border border-white/[0.06] bg-black/20 px-2 py-1 font-mono text-[11px] leading-4 break-all text-[var(--muted)]">
			{id}
		</span>
	);
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
	return (
		<svg
			className={`h-3 w-3 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d="M4 6l4 4 4-4" />
		</svg>
	);
}
