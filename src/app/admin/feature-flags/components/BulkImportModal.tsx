"use client";

import type {
	FeatureFlagDefinition,
	FeatureFlagsConfig,
} from "@/types/featureFlags";
import { useState } from "react";
import { featureFlagsMessages as msg } from "../messages";
import { FLAG_KEY_RE } from "../utils/flagKey";
import { buildUpdatedFlag, cloneConfig } from "../utils/configUtils";
import { normalizeFeatureFlagDefinitionFromLegacy } from "@/lib/featureFlagConfig";
import {
	isValidFeatureFlagDefinition,
	normalizeFeatureFlagDefinition,
	validateFeatureFlagDefinition,
} from "../utils/validateFlagDefinition";

type Props = {
	working: FeatureFlagsConfig;
	saving?: boolean;
	onApply: (next: FeatureFlagsConfig, newKeysInOrder: string[]) => void;
	onClose: () => void;
};

export function BulkImportModal({
	working,
	saving = false,
	onApply,
	onClose,
}: Props) {
	const [text, setText] = useState("");
	const [error, setError] = useState<string | null>(null);

	const handleApply = () => {
		if (saving) return;
		setError(null);
		let parsed: unknown;
		try {
			parsed = JSON.parse(text) as unknown;
		} catch {
			setError(msg.bulkImport.invalidJson);
			return;
		}
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			setError(msg.bulkImport.rootMustBeObject);
			return;
		}
		const root = parsed as Record<string, unknown>;
		const keys = Object.keys(root);
		if (keys.length === 0) {
			setError(msg.bulkImport.emptyObject);
			return;
		}

		const errors: string[] = [];
		const toMerge: [string, FeatureFlagDefinition][] = [];

		for (const key of keys) {
			if (!FLAG_KEY_RE.test(key)) {
				errors.push(msg.bulkImport.keyInvalidFormat(key));
				continue;
			}
			if (key in working) {
				errors.push(msg.bulkImport.keyAlreadyExists(key));
				continue;
			}
			const defRaw = normalizeFeatureFlagDefinitionFromLegacy(
				root[key] as FeatureFlagDefinition,
			);
			const err = validateFeatureFlagDefinition(defRaw);
			if (err) {
				errors.push(msg.bulkImport.keyInvalid(key, err));
				continue;
			}
			if (!isValidFeatureFlagDefinition(defRaw)) continue;
			const normalized = normalizeFeatureFlagDefinition(defRaw);
			toMerge.push([key, normalized]);
		}

		if (errors.length > 0) {
			setError(errors.join("\n"));
			return;
		}

		const next = cloneConfig(working);
		const newKeysInOrder: string[] = [];
		for (const [key, def] of toMerge) {
			next[key] = buildUpdatedFlag(def, true, undefined);
			newKeysInOrder.push(key);
		}
		onApply(next, newKeysInOrder);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-md">
			<div
				className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,28,48,0.98),rgba(8,18,35,0.98))] shadow-[var(--shadow-xl)]"
				role="dialog"
				aria-modal="true"
			>
				<div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
							{msg.bulkImport.kicker}
						</p>
						<h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-foreground">
							{msg.bulkImport.title}
						</h2>
						<p className="mt-2 text-sm leading-6 text-[var(--muted)]">
							{msg.bulkImport.subtitle}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close modal"
						className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] bg-white/6 text-xl leading-none text-foreground hover:border-[var(--accent)] hover:bg-white/10"
					>
						<span aria-hidden="true">&times;</span>
					</button>
				</div>

				<div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
					<label className="block">
						<span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
							{msg.bulkImport.pasteLabel}
						</span>
						<textarea
							value={text}
							onChange={(e) => {
								setText(e.target.value);
								setError(null);
							}}
							rows={14}
							placeholder={msg.bulkImport.placeholder}
							className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-black/20 px-4 py-3 font-mono text-xs leading-6 text-foreground outline-none placeholder:text-[rgba(145,162,190,0.55)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(56,189,248,0.22)]"
						/>
					</label>
					{error ? (
						<pre className="whitespace-pre-wrap rounded-2xl border border-[rgba(251,113,133,0.35)] bg-[rgba(79,18,31,0.45)] px-4 py-3 font-sans text-sm leading-6 text-[#ffd5dd]">
							{error}
						</pre>
					) : null}
				</div>

				<div className="flex shrink-0 justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
					<button
						type="button"
						onClick={onClose}
						className="rounded-full border border-[var(--border-strong)] bg-white/6 px-5 py-2.5 text-sm font-medium text-foreground hover:border-[var(--accent)] hover:bg-white/10"
					>
						{msg.modal.cancel}
					</button>
					<button
						type="button"
						disabled={saving}
						onClick={handleApply}
						className="rounded-full border border-[rgba(125,211,252,0.35)] bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
					>
						{msg.bulkImport.addToTable}
					</button>
				</div>
			</div>
		</div>
	);
}
