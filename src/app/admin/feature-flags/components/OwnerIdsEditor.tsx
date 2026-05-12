"use client";

import { useState } from "react";
import { featureFlagsMessages as msg } from "../messages";
import { dedupeOwnerIds, parseOwnerIds } from "../utils/configUtils";

type Props = {
	value: string[];
	onChange: (next: string[]) => void;
};

export function OwnerIdsEditor({ value, onChange }: Props) {
	const [pending, setPending] = useState("");
	const normalizedValue = dedupeOwnerIds(value);

	const commit = () => {
		const parsed = parseOwnerIds(pending);
		if (!parsed.length) return;
		const existing = new Set(normalizedValue);
		const nextIds = parsed.filter((id) => !existing.has(id));
		if (!nextIds.length) {
			setPending("");
			return;
		}
		onChange([...nextIds, ...normalizedValue]);
		setPending("");
	};

	return (
		<div className="space-y-3">
			<div className="grid gap-2 sm:grid-cols-[1fr_auto]">
				<input
					value={pending}
					onChange={(e) => setPending(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							commit();
						}
					}}
					className="rounded-2xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-[rgba(145,162,190,0.85)] focus:border-[var(--accent)] focus:bg-black/30 focus:ring-2 focus:ring-[rgba(56,189,248,0.22)]"
					placeholder={msg.ownerIds.bulkPlaceholder}
				/>
				<button
					type="button"
					onClick={commit}
					className="rounded-full border border-[rgba(125,211,252,0.35)] bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(37,99,235,0.35)] hover:-translate-y-0.5"
				>
					{msg.ownerIds.add}
				</button>
			</div>

			<div className="space-y-2">
				{normalizedValue.length > 0 ? (
					normalizedValue.map((id, i) => (
						<div
							key={i}
							className="grid gap-2 rounded-[20px] border border-[var(--border)] bg-black/20 p-3 sm:grid-cols-[1fr_auto]"
						>
							<input
								value={id}
								onChange={(e) =>
									onChange(
										normalizedValue.map((v, j) =>
											j === i ? e.target.value : v
										)
									)
								}
								onBlur={(e) =>
									onChange(
										dedupeOwnerIds(
											normalizedValue.map((v, j) =>
												j === i ? e.target.value : v
											)
										)
									)
								}
								className="rounded-2xl border border-[var(--border)] bg-white/6 px-3 py-2 text-sm text-foreground outline-none placeholder:text-[rgba(145,162,190,0.85)] focus:border-[var(--accent)] focus:bg-white/10 focus:ring-2 focus:ring-[rgba(56,189,248,0.22)]"
								placeholder={msg.ownerIds.rowPlaceholder}
							/>
							<button
								type="button"
								onClick={() =>
									onChange(normalizedValue.filter((_, j) => j !== i))
								}
								className="rounded-2xl border border-[rgba(251,113,133,0.3)] bg-[rgba(127,29,29,0.18)] px-3 py-2 text-sm text-[#fecdd3] hover:bg-[rgba(127,29,29,0.28)]"
							>
								{msg.ownerIds.remove}
							</button>
						</div>
					))
				) : (
					<p className="rounded-[20px] border border-dashed border-[var(--border-strong)] bg-black/15 px-3 py-4 text-center text-sm text-[var(--muted)]">
						{msg.ownerIds.emptyHint}
					</p>
				)}
			</div>
		</div>
	);
}
