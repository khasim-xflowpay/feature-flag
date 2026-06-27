"use client";

import type { FeatureFlagDefinition } from "@/types/featureFlags";
import { useState } from "react";
import { featureFlagsMessages as msg } from "../messages";
import { FLAG_KEY_RE } from "../utils/flagKey";
import {
	dateInputToUnixSeconds,
	unixSecondsToDateInput,
} from "../utils/dateUtils";
import { OwnerIdsEditor } from "./OwnerIdsEditor";

type FieldErrors = {
	key?: "required" | "format";
	validUntil?: boolean;
};

type Props = {
	mode: "add" | "edit";
	flagKey: string;
	draft: FeatureFlagDefinition;
	saving: boolean;
	submitLabel: string;
	onKeyChange?: (key: string) => void;
	onDraftChange: (next: FeatureFlagDefinition) => void;
	onSubmit: () => void;
	onClose: () => void;
};

function inputClass(invalid: boolean): string {
	const base =
		"mt-2 w-full rounded-2xl border bg-black/20 px-4 py-3 text-sm text-foreground outline-none placeholder:text-[rgba(145,162,190,0.85)] focus:bg-black/30";
	if (invalid) {
		return `${base} border-[rgba(251,113,133,0.65)] ring-2 ring-[rgba(251,113,133,0.35)] focus:border-[rgba(251,113,133,0.85)] focus:ring-[rgba(251,113,133,0.35)]`;
	}
	return `${base} border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(56,189,248,0.22)]`;
}

export function FlagModal({
	mode,
	flagKey,
	draft,
	saving,
	submitLabel,
	onKeyChange,
	onDraftChange,
	onSubmit,
	onClose,
}: Props) {
	const [errors, setErrors] = useState<FieldErrors>({});

	const patch = (partial: Partial<FeatureFlagDefinition>) =>
		onDraftChange({ ...draft, ...partial });

	const trySubmit = () => {
		const next: FieldErrors = {};
		if (mode === "add") {
			const k = flagKey.trim();
			if (!k) next.key = "required";
			else if (!FLAG_KEY_RE.test(k)) next.key = "format";
		}
		if (
			draft.valid_until === undefined ||
			!Number.isFinite(draft.valid_until)
		) {
			next.validUntil = true;
		}
		if (next.key !== undefined || next.validUntil) {
			setErrors(next);
			return;
		}
		setErrors({});
		onSubmit();
	};

	const keyInvalid = errors.key !== undefined;
	const validUntilInvalid = errors.validUntil === true;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-md">
			<div
				className="flex max-h-[min(90vh,100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,28,48,0.98),rgba(8,18,35,0.98))] font-sans antialiased shadow-[var(--shadow-xl)]"
				role="dialog"
				aria-modal="true"
			>
				{/* Header */}
				<div className="shrink-0 border-b border-[var(--border)] px-6 py-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
								Flag editor
							</p>
							<h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-foreground">
								{mode === "add"
									? msg.modal.titleAdd
									: msg.modal.titleEdit(flagKey)}
							</h2>
							<p className="mt-2 text-sm leading-6 text-[var(--muted)]">
								{msg.modal.subtitle}
							</p>
						</div>
						<div className="flex items-center gap-3 self-start sm:flex-col sm:items-end">
							<button
								type="button"
								onClick={onClose}
								aria-label="Close modal"
								className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] bg-white/6 text-xl leading-none text-foreground hover:border-[var(--accent)] hover:bg-white/10"
							>
								<span aria-hidden="true">&times;</span>
							</button>
							<EnabledToggle
								enabled={draft.enabled}
								onToggle={() => patch({ enabled: !draft.enabled })}
							/>
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-5">
					{mode === "add" ? (
						<div className="block">
							<span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
								{msg.modal.keyLabelRequired}
							</span>
							<input
								value={flagKey}
								onChange={(e) => {
									setErrors((prev) => ({ ...prev, key: undefined }));
									onKeyChange?.(e.target.value);
								}}
								aria-invalid={keyInvalid}
								aria-describedby={keyInvalid ? "flag-key-error" : undefined}
								className={inputClass(keyInvalid)}
								placeholder={msg.modal.keyPlaceholder}
							/>
							{keyInvalid ? (
								<p
									id="flag-key-error"
									className="mt-2 text-sm font-medium text-[#fecdd3]"
								>
									{errors.key === "required"
										? msg.modal.keyRequiredError
										: msg.modal.keyFormatError}
								</p>
							) : null}
						</div>
					) : null}

					<div className="grid gap-4">
						<div className="block">
							<span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
								{msg.modal.validUntilLabelRequired}
							</span>
							<input
								type="date"
								value={unixSecondsToDateInput(draft.valid_until)}
								onChange={(e) => {
									setErrors((prev) => ({ ...prev, validUntil: undefined }));
									patch({
										valid_until: dateInputToUnixSeconds(e.target.value),
									});
								}}
								aria-invalid={validUntilInvalid}
								aria-describedby={
									validUntilInvalid ? "flag-valid-until-error" : undefined
								}
								className={inputClass(validUntilInvalid)}
							/>
							{validUntilInvalid ? (
								<p
									id="flag-valid-until-error"
									className="mt-2 text-sm font-medium text-[#fecdd3]"
								>
									{msg.modal.validUntilRequiredError}
								</p>
							) : null}
						</div>
					</div>

					<div className="rounded-[26px] border border-[var(--border)] bg-white/5 p-5">
						<h3 className="mb-1 font-display text-2xl tracking-[-0.03em] text-foreground">
							{msg.modal.metadataHeading}
						</h3>
						<p className="mb-3 text-sm leading-6 text-[var(--muted)]">
							{msg.modal.metadataOptionalHint}
						</p>
						<label className="block">
							<span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
								{msg.modal.versionLabel}
							</span>
							<input
								value={draft.meta_data?.version ?? ""}
								onChange={(e) =>
									patch({
										meta_data: { ...draft.meta_data, version: e.target.value },
									})
								}
								className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-black/20 px-4 py-3 text-sm text-foreground outline-none placeholder:text-[rgba(145,162,190,0.85)] focus:border-[var(--accent)] focus:bg-black/30 focus:ring-2 focus:ring-[rgba(56,189,248,0.22)]"
								placeholder={msg.modal.versionPlaceholder}
							/>
						</label>
						<label className="mt-4 block">
							<span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
								{msg.modal.descriptionLabel}
							</span>
							<textarea
								value={draft.meta_data?.description ?? ""}
								onChange={(e) =>
									patch({
										meta_data: {
											...draft.meta_data,
											description: e.target.value,
										},
									})
								}
								rows={3}
								className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-black/20 px-4 py-3 text-sm text-foreground outline-none placeholder:text-[rgba(145,162,190,0.85)] focus:border-[var(--accent)] focus:bg-black/30 focus:ring-2 focus:ring-[rgba(56,189,248,0.22)]"
								placeholder={msg.modal.descriptionPlaceholder}
							/>
						</label>
					</div>

					<div className="rounded-[26px] border border-[var(--border)] bg-white/5 p-5">
						<h3 className="mb-1 font-display text-2xl tracking-[-0.03em] text-foreground">
							{msg.modal.ownerIdsHeading}
						</h3>
						<p className="mb-3 text-sm leading-6 text-[var(--muted)]">
							{msg.modal.ownerIdsHint}
						</p>
						<OwnerIdsEditor
							value={draft.attributes?.allowedAccountOwnerIds ?? []}
							onChange={(ids) =>
								patch({
									attributes: {
										...draft.attributes,
										allowedAccountOwnerIds: ids,
									},
								})
							}
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="flex shrink-0 justify-end gap-3 border-t border-[var(--border)] bg-[rgba(8,18,35,0.96)] px-6 py-4 backdrop-blur-sm">
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
						onClick={trySubmit}
						className="rounded-full border border-[rgba(125,211,252,0.35)] bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 disabled:opacity-50"
					>
						{submitLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

function EnabledToggle({
	enabled,
	onToggle,
}: {
	enabled: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={enabled}
			onClick={onToggle}
			className={`inline-flex w-fit items-center gap-3 rounded-full border px-3 py-2 text-sm transition ${
				enabled
					? "border-[rgba(74,222,128,0.28)] bg-[rgba(20,83,45,0.3)] text-[#bbf7d0]"
					: "border-[var(--border)] bg-white/6 text-[var(--muted)]"
			}`}
		>
			<span
				className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
					enabled ? "bg-[#15803d]" : "bg-[rgba(145,162,190,0.7)]"
				}`}
			>
				<span
					className={`h-4 w-4 rounded-full bg-white shadow-sm transition ${
						enabled ? "translate-x-4" : "translate-x-0"
					}`}
				/>
			</span>
			{enabled ? msg.common.enabled : msg.common.disabled}
		</button>
	);
}
