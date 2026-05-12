import type { FeatureFlagDefinition } from "@/types/featureFlags";
import { featureFlagsMessages as msg } from "../messages";
import { formatUnixSecondsDate } from "../utils/dateUtils";

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
	return (
		<div className="glass-panel overflow-hidden rounded-[28px]">
			<div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
						Hosted rollout inventory
					</p>
					<h2 className="mt-2 font-display text-2xl tracking-[-0.03em] text-foreground">
						{msg.table.hostedConfigTitle}
					</h2>
				</div>
				<p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
					{msg.table.hostedConfigSubtitle}
				</p>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full min-w-[1040px] text-left text-sm">
					<thead className="border-b border-[var(--border)] bg-white/5">
						<tr>
							{msg.table.headers.map((h, i) => (
								<th
									key={i}
									className="whitespace-nowrap px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:px-6"
								>
									{h}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map(([key, def]) => (
							<tr
								key={key}
								className="border-b border-[var(--border)] align-top hover:bg-white/4"
							>
								<td className="px-5 py-5 sm:px-6">
									<div className="flex items-start gap-3">
										<span
											className="mt-2 flex w-2.5 shrink-0 justify-center"
											aria-hidden
										>
											{pendingKeys.has(key) ? (
												<span className="group relative inline-flex">
													<span className="block h-2.5 w-2.5 rounded-full bg-[#4ade80] shadow-[0_0_12px_rgba(74,222,128,0.75)]" />
													<span className="pointer-events-none absolute left-5 top-1/2 z-10 w-52 -translate-y-1/2 rounded-2xl border border-[rgba(74,222,128,0.24)] bg-[rgba(8,18,35,0.96)] px-3 py-2 text-[11px] font-medium leading-5 text-[#d8ffe6] opacity-0 shadow-[var(--shadow-xl)] transition-opacity group-hover:opacity-100">
														{msg.table.pendingTooltip}
													</span>
												</span>
											) : (
												<span className="block h-2.5 w-2.5 rounded-full bg-transparent" />
											)}
										</span>
										<div className="min-w-0 flex-1">
											<div className="font-display text-2xl tracking-[-0.04em] text-foreground">
												{key}
											</div>
											{def.meta_data?.description ? (
												<div className="mt-2 max-w-[260px] text-sm leading-6 text-[var(--muted)]">
													{def.meta_data.description}
												</div>
											) : (
												<div className="mt-2 text-sm text-[rgba(145,162,190,0.6)]">
													No description set.
												</div>
											)}
										</div>
									</div>
								</td>

								<td className="px-5 py-5 sm:px-6">
									<EnabledBadge enabled={def.enabled} />
								</td>

								<td className="px-5 py-5 text-sm text-foreground sm:px-6">
									{def.meta_data?.version ?? msg.table.missingValue}
								</td>

								<td className="px-5 py-5 text-xs leading-6 text-[var(--muted)] sm:px-6">
									{formatUnixSecondsDate(def.created_at)}
								</td>

								<td className="px-5 py-5 text-xs leading-6 text-[var(--muted)] sm:px-6">
									{formatUnixSecondsDate(def.updated_at)}
								</td>

								<td className="px-5 py-5 text-xs leading-6 text-[var(--muted)] sm:px-6">
									{formatUnixSecondsDate(def.valid_until)}
								</td>

								<td className="max-w-[220px] px-5 py-5 text-xs leading-6 text-[var(--muted)] sm:px-6">
									{(def.attributes?.allowedAccoutsOwnerIds ?? []).join(", ") ||
										msg.table.missingValue}
								</td>

								<td className="px-5 py-5 sm:px-6">
									<div className="flex flex-wrap gap-3">
										<button
											type="button"
											onClick={() => onEdit(key, def)}
											className="rounded-full border border-[var(--border)] bg-white/6 px-3 py-1.5 text-sm text-foreground hover:border-[var(--accent)] hover:bg-white/10"
										>
											{msg.table.edit}
										</button>
										<button
											type="button"
											onClick={() => onDelete(key)}
											disabled={saving}
											className="rounded-full border border-[rgba(251,113,133,0.3)] bg-[rgba(127,29,29,0.18)] px-3 py-1.5 text-sm text-[#fecdd3] hover:bg-[rgba(127,29,29,0.28)] disabled:opacity-40"
										>
											{msg.table.delete}
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{rows.length === 0 ? (
				<p className="border-t border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--muted)]">
					{msg.table.emptyState}
				</p>
			) : null}
		</div>
	);
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
	return (
		<span
			className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
				enabled
					? "border-[rgba(74,222,128,0.3)] bg-[rgba(20,83,45,0.32)] text-[#bbf7d0]"
					: "border-[var(--border)] bg-white/6 text-[var(--muted)]"
			}`}
		>
			<span
				className={`h-2 w-2 rounded-full ${
					enabled ? "bg-[#4ade80]" : "bg-[rgba(145,162,190,0.88)]"
				}`}
			/>
			{enabled ? msg.common.enabled : msg.common.disabled}
		</span>
	);
}
