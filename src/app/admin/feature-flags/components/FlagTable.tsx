"use client";

import type { FeatureFlagDefinition } from "@/types/featureFlags";
import { useState, useRef, useEffect, useCallback } from "react";
import { featureFlagsMessages as msg } from "../messages";
import { formatUnixSecondsDate } from "../utils/dateUtils";
import { OwnerIdsCell } from "./OwnerIdsCell";

type Props = {
	rows: [string, FeatureFlagDefinition][];
	saving: boolean;
	pendingKeys: ReadonlySet<string>;
	onEdit: (key: string, def: FeatureFlagDefinition) => void;
	onDelete: (key: string) => void;
};

export function FlagTable({
	rows,
	saving,
	pendingKeys,
	onEdit,
	onDelete,
}: Props) {
	if (rows.length === 0) {
		return (
			<div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(16,29,50,0.88),rgba(10,20,38,0.80))] backdrop-blur-xl">
				<EmptyState />
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(16,29,50,0.88),rgba(10,20,38,0.80))] shadow-[0_1px_3px_rgba(0,0,0,0.3),0_24px_60px_rgba(1,10,24,0.35)] backdrop-blur-xl">
			<TableHeader />
			<div className="overflow-x-auto">
				<table
					className="w-full min-w-[1040px] text-left text-sm"
					role="table"
					aria-label="Feature flags"
				>
					<thead>
						<tr className="border-b border-[var(--border)] bg-white/[0.03]">
							<th scope="col" className="w-[220px] min-w-[180px] py-2.5 pl-5 pr-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
								Flag
							</th>
							<th scope="col" className="w-[96px] px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
								Status
							</th>
							<th scope="col" className="w-[52px] px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
								Ver
							</th>
							<th scope="col" className="w-[88px] px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
								Created
							</th>
							<th scope="col" className="w-[88px] px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
								Updated
							</th>
							<th scope="col" className="w-[88px] px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
								Expires
							</th>
							<th scope="col" className="w-[260px] min-w-[240px] px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
								Owner IDs
							</th>
							<th scope="col" className="w-[96px] px-3 py-2.5 text-right pr-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--muted)]">
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/[0.06]">
						{rows.map(([key, def]) => (
							<FlagRow
								key={key}
								flagKey={key}
								def={def}
								isPending={pendingKeys.has(key)}
								saving={saving}
								onEdit={onEdit}
								onDelete={onDelete}
							/>
						))}
					</tbody>
				</table>
			</div>
			<TableFooter count={rows.length} />
		</div>
	);
}

function TableHeader() {
	return (
		<div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
			<div className="flex items-center gap-3">
				<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
					<FlagIcon />
				</div>
				<h3 className="text-sm font-semibold text-foreground">
					{msg.table.hostedConfigTitle}
				</h3>
			</div>
			<p className="hidden text-xs text-[var(--muted)] sm:block">
				{msg.table.hostedConfigSubtitle}
			</p>
		</div>
	);
}

function TableFooter({ count }: { count: number }) {
	return (
		<div className="flex items-center justify-between border-t border-[var(--border)] bg-white/[0.02] px-5 py-2.5">
			<span className="text-xs text-[var(--muted)]">
				{count} {count === 1 ? "flag" : "flags"}
			</span>
			<span className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
				<span className="inline-block h-2 w-2 rounded-full bg-[#4ade80]" />
				Dot = unsaved local change
			</span>
		</div>
	);
}

function FlagRow({
	flagKey,
	def,
	isPending,
	saving,
	onEdit,
	onDelete,
}: {
	flagKey: string;
	def: FeatureFlagDefinition;
	isPending: boolean;
	saving: boolean;
	onEdit: (key: string, def: FeatureFlagDefinition) => void;
	onDelete: (key: string) => void;
}) {
	const ownerIds = def.attributes?.allowedAccountOwnerIds ?? [];

	return (
		<tr
			className="group relative transition-colors duration-150 hover:bg-white/[0.035]"
			tabIndex={0}
			aria-label={`Feature flag ${flagKey}`}
		>
			{/* Flag name + description */}
			<td className="py-3.5 pl-5 pr-3 align-top">
				<div className="flex items-center gap-2.5">
					{isPending ? (
						<span
							className="relative flex h-2 w-2 shrink-0"
							title={msg.table.pendingTooltip}
						>
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-[#4ade80]" />
						</span>
					) : (
						<span className="h-2 w-2 shrink-0" />
					)}
					<div className="min-w-0">
						<span className="block truncate font-mono text-[13px] font-medium text-foreground">
							{flagKey}
						</span>
						{def.meta_data?.description ? (
							<TruncatedText
								text={def.meta_data.description}
								className="mt-0.5 text-xs text-[var(--muted)]"
								maxWidth="200px"
							/>
						) : (
							<span className="mt-0.5 block text-xs italic text-white/20">
								No description
							</span>
						)}
					</div>
				</div>
			</td>

			{/* Status */}
			<td className="px-3 py-3.5 align-top">
				<StatusBadge enabled={def.enabled} />
			</td>

			{/* Version */}
			<td className="px-3 py-3.5 text-center align-top">
				<span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md bg-white/[0.06] px-1.5 font-mono text-xs text-[var(--muted)]">
					{def.meta_data?.version ?? msg.table.missingValue}
				</span>
			</td>

			{/* Created */}
			<td className="px-3 py-3.5 align-top">
				<DateCell value={def.created_at} />
			</td>

			{/* Updated */}
			<td className="px-3 py-3.5 align-top">
				<DateCell value={def.updated_at} />
			</td>

			{/* Valid until */}
			<td className="px-3 py-3.5 align-top">
				<DateCell value={def.valid_until} />
			</td>

			{/* Owner IDs */}
			<td className="px-3 py-3.5 align-top">
				<OwnerIdsCell ids={ownerIds} />
			</td>

			{/* Actions */}
			<td className="px-3 py-3.5 pr-5 text-right align-top">
				<div className="flex items-center justify-end gap-1.5">
					<ActionButton
						variant="default"
						onClick={() => onEdit(flagKey, def)}
						label={`Edit ${flagKey}`}
					>
						<PencilIcon />
						<span className="sr-only sm:not-sr-only">{msg.table.edit}</span>
					</ActionButton>
					<ActionButton
						variant="danger"
						onClick={() => onDelete(flagKey)}
						disabled={saving}
						label={`Delete ${flagKey}`}
					>
						<TrashIcon />
						<span className="sr-only sm:not-sr-only">{msg.table.delete}</span>
					</ActionButton>
				</div>
			</td>
		</tr>
	);
}

function StatusBadge({ enabled }: { enabled: boolean }) {
	if (enabled) {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(74,222,128,0.2)] bg-[rgba(20,83,45,0.24)] px-2 py-0.5 text-[11px] font-medium text-[#86efac]">
				<span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
				{msg.common.enabled}
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
			<span className="h-1.5 w-1.5 rounded-full bg-[rgba(145,162,190,0.5)]" />
			{msg.common.disabled}
		</span>
	);
}

function DateCell({ value }: { value: number | undefined }) {
	const formatted = formatUnixSecondsDate(value);
	if (formatted === "—") {
		return <span className="text-xs text-white/20">—</span>;
	}
	return (
		<span className="whitespace-nowrap font-mono text-xs text-[var(--muted)]">
			{formatted}
		</span>
	);
}

function TruncatedText({
	text,
	className = "",
	maxWidth = "160px",
}: {
	text: string;
	className?: string;
	maxWidth?: string;
}) {
	const ref = useRef<HTMLSpanElement>(null);
	const [showTooltip, setShowTooltip] = useState(false);
	const [isTruncated, setIsTruncated] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
	}, [text]);

	const handleMouseEnter = useCallback(() => {
		if (isTruncated) setShowTooltip(true);
	}, [isTruncated]);

	return (
		<span className="relative inline-block w-full" style={{ maxWidth }}>
			<span
				ref={ref}
				className={`block truncate ${className}`}
				onMouseEnter={handleMouseEnter}
				onMouseLeave={() => setShowTooltip(false)}
				title={isTruncated ? text : undefined}
			>
				{text}
			</span>
			{showTooltip && (
				<span
					role="tooltip"
					className="absolute bottom-full left-0 z-50 mb-1.5 max-w-[320px] whitespace-normal rounded-lg border border-[var(--border)] bg-[rgba(8,18,35,0.98)] px-3 py-2 text-xs leading-relaxed text-foreground shadow-[var(--shadow-xl)] backdrop-blur-xl"
				>
					{text}
				</span>
			)}
		</span>
	);
}

function ActionButton({
	variant,
	onClick,
	disabled,
	label,
	children,
}: {
	variant: "default" | "danger";
	onClick: () => void;
	disabled?: boolean;
	label: string;
	children: React.ReactNode;
}) {
	const base =
		"inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-40";
	const variants = {
		default:
			"text-[var(--muted)] hover:text-foreground hover:bg-white/[0.08]",
		danger:
			"text-[var(--muted)] hover:text-[#fecdd3] hover:bg-[rgba(127,29,29,0.2)]",
	};

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			className={`${base} ${variants[variant]}`}
		>
			{children}
		</button>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center justify-center px-6 py-16">
			<div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-white/[0.04]">
				<FlagIcon className="h-5 w-5 text-[var(--muted)]" />
			</div>
			<p className="mt-4 text-sm font-medium text-foreground">No flags yet</p>
			<p className="mt-1.5 max-w-sm text-center text-xs leading-5 text-[var(--muted)]">
				{msg.table.emptyState}
			</p>
		</div>
	);
}

function FlagIcon({ className = "h-4 w-4 text-[var(--accent)]" }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M2 14V2" />
			<path d="M2 2h9l-2 3.5L11 9H2" />
		</svg>
	);
}

function PencilIcon() {
	return (
		<svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
		</svg>
	);
}

function TrashIcon() {
	return (
		<svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
			<path d="M2.5 4h11M5.5 4V2.5h5V4M6 7v4.5M10 7v4.5M3.5 4l.75 9.5h7.5L12.5 4" />
		</svg>
	);
}
