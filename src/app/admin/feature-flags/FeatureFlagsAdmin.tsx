"use client";

import type {
	FeatureFlagDefinition,
	FeatureFlagsConfig,
} from "@/types/featureFlags";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { BulkImportModal } from "./components/BulkImportModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { FlagModal } from "./components/FlagModal";
import { FlagTable } from "./components/FlagTable";
import { featureFlagsMessages as msg } from "./messages";
import { FLAG_KEY_RE } from "./utils/flagKey";
import {
	DEFAULT_PUBLISH_ENVIRONMENT,
	getPublishEnvironmentLabel,
	publishEnvironmentOptions,
	type PublishEnvironment,
} from "./publishEnvironments";
import {
	buildUpdatedFlag,
	cloneConfig,
	configsAreEqual,
	definitionsEqual,
} from "./utils/configUtils";
import { todayUnixSeconds } from "./utils/dateUtils";

// ─── Types ───────────────────────────────────────────────────────────────────

type ModalState =
	| null
	| { mode: "add"; key: string; def: FeatureFlagDefinition }
	| { mode: "edit"; key: string; def: FeatureFlagDefinition };

type DirtyAction =
	| { kind: "reload" }
	| { kind: "switch-environment"; environment: PublishEnvironment };

type Feedback = { type: "error" | "success"; message: string } | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_CONFIG: FeatureFlagsConfig = {};

function defaultNewFlag(): FeatureFlagDefinition {
	const today = todayUnixSeconds();
	return {
		enabled: true,
		created_at: today,
		updated_at: today,
		meta_data: undefined,
		attributes: { allowedAccoutsOwnerIds: [] },
	};
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FeatureFlagsAdmin() {
	const [config, setConfig] = useState<FeatureFlagsConfig | null>(null);
	const [baselineConfig, setBaselineConfig] =
		useState<FeatureFlagsConfig | null>(null);
	const [rowOrderBoost, setRowOrderBoost] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<Feedback>(null);
	const [modal, setModal] = useState<ModalState>(null);
	const [showJsonModal, setShowJsonModal] = useState(false);
	const [bulkImportOpen, setBulkImportOpen] = useState(false);
	const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
	const [dirtyAction, setDirtyAction] = useState<DirtyAction | null>(null);
	const [missingDeployment, setMissingDeployment] = useState(false);
	const [selectedEnvironment, setSelectedEnvironment] =
		useState<PublishEnvironment>(DEFAULT_PUBLISH_ENVIRONMENT);

	const rows = useMemo(() => {
		if (!config) return [];
		const boostFiltered = rowOrderBoost.filter((k) => k in config);
		const boostSet = new Set(boostFiltered);
		const rest = Object.entries(config)
			.filter(([k]) => !boostSet.has(k))
			.sort(([a], [b]) => a.localeCompare(b));
		const boosted = boostFiltered.map(
			(k) => [k, config[k]!] as [string, FeatureFlagDefinition]
		);
		return [...boosted, ...rest];
	}, [config, rowOrderBoost]);

	const hasDirty = useMemo(() => {
		if (config === null || baselineConfig === null) return false;
		return !configsAreEqual(config, baselineConfig);
	}, [config, baselineConfig]);

	const pendingKeys = useMemo(() => {
		const s = new Set<string>();
		if (!config || baselineConfig === null) return s;
		for (const k of Object.keys(config)) {
			if (!definitionsEqual(baselineConfig[k], config[k])) s.add(k);
		}
		return s;
	}, [config, baselineConfig]);
	const enabledCount = useMemo(
		() => rows.filter(([, def]) => def.enabled).length,
		[rows]
	);
	const disabledCount = rows.length - enabledCount;
	const selectedEnvironmentLabel =
		getPublishEnvironmentLabel(selectedEnvironment);
	const canShowTable = config !== null;
	const showEmptyDeploymentSplash =
		missingDeployment && config !== null && Object.keys(config).length === 0;

	// ── Data fetching ──────────────────────────────────────────────────────────

	const load = useCallback(
		async (opts?: { clearFeedback?: boolean }) => {
			setLoading(true);
			if (opts?.clearFeedback !== false) setFeedback(null);
			setMissingDeployment(false);
			try {
				const res = await fetch(
					`/api/appconfig/config?environment=${selectedEnvironment}`
				);
				const data: unknown = await res.json();
				if (!res.ok)
					throw new Error((data as { error?: string }).error ?? res.statusText);
				const cfg = data as FeatureFlagsConfig;
				setConfig(cfg);
				setBaselineConfig(cloneConfig(cfg));
				setRowOrderBoost([]);
			} catch (e) {
				const message = e instanceof Error ? e.message : msg.admin.loadFailed;
				if (isMissingDeploymentError(message)) {
					setMissingDeployment(true);
					setConfig({});
					setBaselineConfig({});
					setRowOrderBoost([]);
					setFeedback(null);
				} else {
					setConfig(null);
					setBaselineConfig(null);
					setRowOrderBoost([]);
					setFeedback({
						type: "error",
						message,
					});
				}
			} finally {
				setLoading(false);
			}
		},
		[selectedEnvironment]
	);

	useEffect(() => {
		const timeoutId = window.setTimeout(() => {
			void load();
		}, 0);
		return () => window.clearTimeout(timeoutId);
	}, [load]);

	// ── Mutations ──────────────────────────────────────────────────────────────

	const switchEnvironment = useCallback((environment: PublishEnvironment) => {
		setConfig(null);
		setBaselineConfig(null);
		setRowOrderBoost([]);
		setFeedback(null);
		setMissingDeployment(false);
		setModal(null);
		setShowJsonModal(false);
		setBulkImportOpen(false);
		setDirtyAction(null);
		setSelectedEnvironment(environment);
	}, []);

	const runDirtyAction = useCallback(
		(action: DirtyAction) => {
			if (action.kind === "reload") {
				void load();
				return;
			}
			switchEnvironment(action.environment);
		},
		[load, switchEnvironment]
	);

	const requestDirtyAction = (action: DirtyAction) => {
		if (!hasDirty) {
			runDirtyAction(action);
			return;
		}
		setDirtyAction(action);
	};

	const saveConfig = async (
		next: FeatureFlagsConfig,
		opts?: { afterSuccess?: () => void }
	) => {
		setSaving(true);
		setFeedback(null);
		try {
			const res = await fetch("/api/appconfig/config", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					environment: selectedEnvironment,
					config: next,
				}),
			});
			const data: unknown = await res.json();
			if (!res.ok)
				throw new Error((data as { error?: string }).error ?? res.statusText);

			const { versionNumber } = data as { versionNumber?: number };
			setModal(null);
			setRowOrderBoost([]);
			await load({ clearFeedback: false });
			opts?.afterSuccess?.();
			toast.success(
				versionNumber != null
					? msg.toast.deployedVersion(versionNumber, selectedEnvironmentLabel)
					: msg.toast.deployed(selectedEnvironmentLabel)
			);
		} catch (e) {
			const message = e instanceof Error ? e.message : msg.admin.saveFailed;
			toast.error(message);
			setFeedback({
				type: "error",
				message,
			});
		} finally {
			setSaving(false);
		}
	};

	const handleSubmit = () => {
		if (!modal || config === null) return;
		const key = modal.key.trim();
		if (!key) return;
		const next = cloneConfig(config);
		if (modal.mode === "add") {
			if (key in next) {
				setFeedback({ type: "error", message: msg.admin.flagKeyExists });
				return;
			}
			if (!FLAG_KEY_RE.test(key)) {
				setFeedback({
					type: "error",
					message: msg.admin.flagKeyInvalid,
				});
				return;
			}
			next[key] = buildUpdatedFlag(modal.def, true, undefined);
			setRowOrderBoost((p) => [key, ...p.filter((k) => k !== key)]);
		} else {
			next[key] = buildUpdatedFlag(modal.def, false, next[key]?.created_at);
		}
		setConfig(next);
		setFeedback(null);
		setModal(null);
		if (modal.mode === "add") {
			toast.success(msg.toast.flagAdded(key));
		} else {
			toast.success(msg.toast.flagUpdated(key));
		}
	};

	const requestDeleteFlag = (key: string) => {
		setDeleteConfirmKey(key);
	};

	const applyDeleteFlag = () => {
		const key = deleteConfirmKey;
		if (!key || !config) return;
		const next = cloneConfig(config);
		delete next[key];
		setConfig(next);
		setRowOrderBoost((p) => p.filter((k) => k !== key));
		setDeleteConfirmKey(null);
		toast.success(msg.toast.flagDeleted(key));
	};

	const handleDeploy = () => {
		if (!config || !hasDirty) return;
		void saveConfig(config);
	};

	const handleDirtyActionWithoutDeploy = () => {
		if (!dirtyAction) return;
		const nextAction = dirtyAction;
		setDirtyAction(null);
		runDirtyAction(nextAction);
	};

	const handleDirtyActionWithDeploy = () => {
		if (!config || !dirtyAction) return;
		const nextAction = dirtyAction;
		setDirtyAction(null);
		void saveConfig(config, {
			afterSuccess:
				nextAction.kind === "switch-environment"
					? () => switchEnvironment(nextAction.environment)
					: undefined,
		});
	};

	// ─── Loading state ────────────────────────────────────────────────────────

	if (loading && !config) {
		return (
			<div className="min-h-screen px-4 py-10 font-sans antialiased">
				<div className="mx-auto max-w-7xl rounded-[28px] border border-[var(--border)] bg-[var(--surface-2)] p-10 text-sm text-[var(--muted)] shadow-[var(--shadow-xl)] backdrop-blur-xl">
					{msg.admin.loadingConfig}
				</div>
			</div>
		);
	}

	// ─── Render ───────────────────────────────────────────────────────────────

	return (
		<div className="min-h-screen px-4 py-8 font-sans antialiased sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl space-y-6">
				<div className="glass-panel data-grid overflow-visible rounded-[32px]">
					<div className="flex flex-col gap-8 px-6 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
						<div className="max-w-3xl">
							<div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
								<span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_16px_var(--accent)]" />
								Flag control center
							</div>
							<h1 className="mt-5 font-display text-4xl tracking-[-0.04em] text-foreground sm:text-5xl">
								{msg.admin.pageTitle}
							</h1>
							<p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
								{msg.admin.targetEnvironmentHint}
							</p>
							<div className="mt-5 flex flex-wrap gap-3">
								<span className="rounded-full border border-[var(--border)] bg-white/6 px-3 py-1.5 text-sm text-foreground">
									{selectedEnvironmentLabel}
								</span>
								<span className="rounded-full border border-[var(--border)] bg-white/6 px-3 py-1.5 text-sm text-foreground">
									{msg.admin.flagCount(rows.length)}
								</span>
							</div>
						</div>

						<div className="flex flex-wrap items-end gap-3">
							<TargetEnvironmentSelect
								value={selectedEnvironment}
								onChange={(environment) => {
									requestDirtyAction({
										kind: "switch-environment",
										environment,
									});
								}}
							/>
							<button
								type="button"
								onClick={() => {
									requestDirtyAction({ kind: "reload" });
								}}
								disabled={loading}
								className="rounded-full border border-[var(--border-strong)] bg-white/6 px-5 py-3 text-sm font-medium text-foreground hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-white/10"
							>
								{msg.admin.reload}
							</button>
							<button
								type="button"
								onClick={handleDeploy}
								disabled={saving || !hasDirty}
								title={!hasDirty ? msg.admin.deployDisabledHint : undefined}
								className={`rounded-full border px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(22,163,74,0.28)] ${
									hasDirty && !saving
										? "border-[rgba(74,222,128,0.45)] bg-[linear-gradient(135deg,#4ade80,#15803d)] hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(74,222,128,0.22)]"
										: "cursor-not-allowed border-[var(--border)] bg-[rgba(34,197,94,0.22)] opacity-45"
								}`}
							>
								{saving ? msg.modal.savePublishing : msg.admin.deploy}
							</button>
							<button
								type="button"
								onClick={() => setBulkImportOpen(true)}
								disabled={!canShowTable}
								className="rounded-full border border-[var(--border-strong)] bg-white/6 px-5 py-3 text-sm font-medium text-foreground hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
							>
								{msg.admin.bulkImportOpen}
							</button>
							<button
								type="button"
								onClick={() =>
									setModal({ mode: "add", key: "", def: defaultNewFlag() })
								}
								className="rounded-full border border-[rgba(125,211,252,0.35)] bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(56,189,248,0.32)]"
							>
								{msg.admin.addFlag}
							</button>
						</div>
					</div>

					<div className="grid gap-4 border-t border-[var(--border)] px-6 py-6 sm:grid-cols-3 sm:px-8">
						<StatCard
							label="Enabled flags"
							value={enabledCount}
							tone="success"
							helper={`${disabledCount} disabled`}
						/>
						<StatCard
							label="Target environment"
							value={selectedEnvironmentLabel}
							tone="accent"
							helper="Load and publish scope"
						/>
						<StatCard
							label="Inspect payload"
							value="JSON"
							tone="warning"
							helper="Open the raw configuration viewer"
							onClick={() => setShowJsonModal(true)}
						/>
					</div>
				</div>

				<div className="space-y-6">
					{feedback ? (
						<div
							className={`rounded-[24px] border px-4 py-3 text-sm shadow-[var(--shadow-xl)] ${
								feedback.type === "error"
									? "border-[rgba(251,113,133,0.35)] bg-[rgba(79,18,31,0.72)] text-[#ffd5dd]"
									: "border-[rgba(74,222,128,0.35)] bg-[rgba(14,55,34,0.76)] text-[#d8ffe6]"
							}`}
						>
							{feedback.message}
						</div>
					) : null}

					{canShowTable && !showEmptyDeploymentSplash ? (
						<FlagTable
							rows={rows}
							saving={saving}
							pendingKeys={pendingKeys}
							onEdit={(key, def) =>
								setModal({
									mode: "edit",
									key,
									def: JSON.parse(JSON.stringify(def)) as FeatureFlagDefinition,
								})
							}
							onDelete={requestDeleteFlag}
						/>
					) : null}

					{showEmptyDeploymentSplash ? (
						<EmptyDeploymentState
							onCreate={() =>
								setModal({
									mode: "add",
									key: "",
									def: defaultNewFlag(),
								})
							}
						/>
					) : null}
				</div>

				{modal ? (
					<FlagModal
						mode={modal.mode}
						flagKey={modal.key}
						draft={modal.def}
						saving={saving}
						submitLabel={
							modal.mode === "add"
								? msg.modal.addToDraft
								: msg.modal.saveLocalChanges
						}
						onKeyChange={(key) => setModal({ ...modal, key })}
						onDraftChange={(def) => setModal({ ...modal, def })}
						onSubmit={handleSubmit}
						onClose={() => setModal(null)}
					/>
				) : null}

				{bulkImportOpen && config ? (
					<BulkImportModal
						working={config}
						saving={saving}
						onApply={(next, newKeysInOrder) => {
							setConfig(next);
							setRowOrderBoost((p) => [
								...newKeysInOrder,
								...p.filter((k) => !newKeysInOrder.includes(k)),
							]);
							setFeedback(null);
						}}
						onClose={() => setBulkImportOpen(false)}
					/>
				) : null}

				{showJsonModal ? (
					<JsonPreviewModal
						json={JSON.stringify(config ?? EMPTY_CONFIG, null, 2)}
						onClose={() => setShowJsonModal(false)}
					/>
				) : null}

				<ConfirmModal
					open={dirtyAction !== null}
					kicker={msg.admin.unsavedChangesModal.kicker}
					title={msg.admin.unsavedChangesModal.title}
					message={msg.admin.unsavedChangesModal.body}
					confirmLabel={msg.admin.unsavedChangesModal.confirm}
					secondaryLabel={msg.admin.unsavedChangesModal.reloadWithoutDeploy}
					cancelLabel={msg.admin.unsavedChangesModal.cancel}
					onConfirm={handleDirtyActionWithDeploy}
					onSecondaryAction={handleDirtyActionWithoutDeploy}
					onCancel={() => setDirtyAction(null)}
				/>

				<ConfirmModal
					open={deleteConfirmKey !== null}
					kicker={msg.admin.deleteModal.kicker}
					title={msg.admin.deleteModal.title}
					message={
						deleteConfirmKey ? msg.admin.deleteModal.body(deleteConfirmKey) : ""
					}
					confirmLabel={msg.admin.deleteModal.confirm}
					cancelLabel={msg.admin.deleteModal.cancel}
					danger
					onConfirm={applyDeleteFlag}
					onCancel={() => setDeleteConfirmKey(null)}
				/>
			</div>
		</div>
	);
}

function isMissingDeploymentError(message: string): boolean {
	return /deployment not found/i.test(message);
}

function StatCard({
	label,
	value,
	helper,
	tone,
	onClick,
}: {
	label: string;
	value: number | string;
	helper: string;
	tone: "accent" | "success" | "warning";
	onClick?: () => void;
}) {
	const toneClass = {
		accent:
			"border-[rgba(125,211,252,0.18)] bg-[linear-gradient(180deg,rgba(20,37,64,0.84),rgba(10,20,38,0.76))]",
		success:
			"border-[rgba(74,222,128,0.18)] bg-[linear-gradient(180deg,rgba(11,46,32,0.8),rgba(8,28,23,0.72))]",
		warning:
			"border-[rgba(251,191,36,0.18)] bg-[linear-gradient(180deg,rgba(54,37,12,0.82),rgba(31,23,8,0.72))]",
	} as const;

	const Component = onClick ? "button" : "div";

	return (
		<Component
			{...(onClick ? { type: "button", onClick } : {})}
			className={`rounded-[24px] border p-5 text-left ${toneClass[tone]} ${
				onClick
					? "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[rgba(56,189,248,0.28)]"
					: ""
			}`}
		>
			<p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
				{label}
			</p>
			<div className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground">
				{value}
			</div>
			<p className="mt-2 text-sm text-[var(--muted)]">{helper}</p>
		</Component>
	);
}

function TargetEnvironmentSelect({
	value,
	onChange,
}: {
	value: PublishEnvironment;
	onChange: (value: PublishEnvironment) => void;
}) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const selected = publishEnvironmentOptions.find(
		(option) => option.value === value
	);

	useEffect(() => {
		if (!open) return;

		const handlePointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [open]);

	return (
		<div
			ref={rootRef}
			className={`relative min-w-[220px] ${open ? "z-[90]" : "z-10"}`}
		>
			<span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
				{msg.admin.targetEnvironmentLabel}
			</span>
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((prev) => !prev)}
				className={`flex w-full items-center justify-between gap-3 rounded-[20px] border px-4 py-3 text-left text-sm text-foreground shadow-[0_12px_28px_rgba(2,6,23,0.18)] outline-none ${
					open
						? "border-[var(--accent)] bg-[rgba(12,24,44,0.98)] ring-2 ring-[rgba(56,189,248,0.22)]"
						: "border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,36,61,0.88),rgba(11,21,39,0.92))] hover:border-[var(--border-strong)] hover:bg-[linear-gradient(180deg,rgba(24,42,71,0.92),rgba(12,24,44,0.96))]"
				}`}
			>
				<div className="min-w-0 font-display text-lg tracking-[-0.03em] text-foreground sm:text-xl">
					{selected?.label ?? value}
				</div>
				<span
					className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-white/6 text-[var(--accent)] transition ${
						open ? "rotate-180 border-[var(--accent)] bg-[var(--accent-soft)]" : ""
					}`}
					aria-hidden
				>
					<ChevronDownIcon />
				</span>
			</button>

			{open ? (
				<div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-[95] overflow-hidden rounded-[22px] border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(20,36,61,0.98),rgba(10,20,38,0.98))] p-2 shadow-[0_24px_54px_rgba(1,10,24,0.52)] backdrop-blur-xl">
					<div role="listbox" aria-label={msg.admin.targetEnvironmentLabel} className="space-y-1">
						{publishEnvironmentOptions.map((option) => {
							const active = option.value === value;
							return (
								<button
									key={option.value}
									type="button"
									role="option"
									aria-selected={active}
									onClick={() => {
										setOpen(false);
										if (!active) onChange(option.value);
									}}
									className={`flex w-full items-center justify-between rounded-[16px] px-3.5 py-2.5 text-left ${
										active
											? "bg-[linear-gradient(135deg,rgba(56,189,248,0.22),rgba(37,99,235,0.16))] text-foreground"
											: "text-[var(--muted)] hover:bg-white/7 hover:text-foreground"
									}`}
								>
									<div className="font-display text-lg tracking-[-0.03em] sm:text-xl">
										{option.label}
									</div>
									{active ? (
										<span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(125,211,252,0.28)] bg-[rgba(56,189,248,0.16)] text-[var(--accent)]">
											<CheckIcon />
										</span>
									) : null}
								</button>
							);
						})}
					</div>
				</div>
			) : null}
		</div>
	);
}

function JsonPreviewModal({
	json,
	onClose,
}: {
	json: string;
	onClose: () => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(2,6,23,0.72)] p-4 backdrop-blur-md">
			<div
				className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,28,48,0.98),rgba(8,18,35,0.98))] shadow-[var(--shadow-xl)]"
				role="dialog"
				aria-modal="true"
			>
				<div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
							Inspect payload
						</p>
						<h2 className="mt-2 font-display text-3xl tracking-[-0.04em] text-foreground">
							{msg.admin.rawJsonSummary}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full border border-[var(--border-strong)] bg-white/6 px-4 py-2 text-sm font-medium text-foreground hover:border-[var(--accent)] hover:bg-white/10"
					>
						Close
					</button>
				</div>
				<div className="p-6">
					<pre className="max-h-[65vh] overflow-auto rounded-[22px] border border-[var(--border)] bg-black/20 p-4 font-mono text-[11px] leading-6 text-[#d9e8fb]">
						{json}
					</pre>
				</div>
			</div>
		</div>
	);
}

function ChevronDownIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 20 20" fill="none">
			<path
				d="M5 7.5L10 12.5L15 7.5"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
			<path
				d="M5 10.5L8.5 14L15 7.5"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

function EmptyDeploymentState({ onCreate }: { onCreate: () => void }) {
	return (
		<div className="glass-panel rounded-[28px] px-6 py-12 text-center">
			<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
				{msg.admin.noDeploymentTitle}
			</p>
			<h2 className="mt-3 font-display text-3xl tracking-[-0.04em] text-foreground">
				{msg.admin.createFeatureFlags}
			</h2>
			<p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
				{msg.admin.noDeploymentHint}
			</p>
			<button
				type="button"
				onClick={onCreate}
				className="mt-6 rounded-full border border-[rgba(125,211,252,0.35)] bg-[linear-gradient(135deg,#38bdf8,#2563eb)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 hover:shadow-[0_22px_38px_rgba(56,189,248,0.32)]"
			>
				{msg.admin.createFeatureFlags}
			</button>
		</div>
	);
}
