"use client";

import type {
	FeatureFlagDefinition,
	FeatureFlagsConfig,
} from "@/types/featureFlags";
import { useCallback, useEffect, useMemo, useState } from "react";

function unixSecondsToDatetimeLocal(sec: number | undefined): string {
	if (sec === undefined || !Number.isFinite(sec)) {
		return "";
	}
	const d = new Date(sec * 1000);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToUnixSeconds(s: string): number | undefined {
	const t = s.trim();
	if (t === "") {
		return undefined;
	}
	const ms = new Date(t).getTime();
	if (!Number.isFinite(ms)) {
		return undefined;
	}
	return Math.floor(ms / 1000);
}

function parseOwnerIds(text: string): string[] {
	return text
		.split(/[\s,]+/)
		.map((s) => s.trim())
		.filter(Boolean);
}

function cloneConfig(c: FeatureFlagsConfig): FeatureFlagsConfig {
	return JSON.parse(JSON.stringify(c)) as FeatureFlagsConfig;
}

type ModalMode = "closed" | "add" | "edit";

export default function FeatureFlagsAdmin() {
	const [config, setConfig] = useState<FeatureFlagsConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [adminSecret, setAdminSecret] = useState("");

	const [modalMode, setModalMode] = useState<ModalMode>("closed");
	const [editKey, setEditKey] = useState("");
	const [draftKey, setDraftKey] = useState("");
	const [draft, setDraft] = useState<FeatureFlagDefinition | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch("/api/appconfig/config");
			const data: unknown = await res.json();
			if (!res.ok) {
				const err = data as { error?: string };
				throw new Error(err.error ?? res.statusText);
			}
			setConfig(data as FeatureFlagsConfig);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const rows = useMemo(() => {
		if (!config) {
			return [];
		}
		return Object.entries(config.featureFlags).sort(([a], [b]) =>
			a.localeCompare(b),
		);
	}, [config]);

	const openAdd = () => {
		const now = Math.floor(Date.now() / 1000);
		setDraftKey("");
		setEditKey("");
		setDraft({
			enabled: true,
			created_at: now,
			updated_at: now,
			valid_until: undefined,
			environment: "production",
			meta_data: { version: "1", description: "" },
			attributes: { allowedAccoutsOwnerIds: [] },
		});
		setModalMode("add");
	};

	const openEdit = (key: string, def: FeatureFlagDefinition) => {
		setEditKey(key);
		setDraftKey(key);
		setDraft(cloneConfig({ featureFlags: { [key]: def } }).featureFlags[key] ?? null);
		setModalMode("edit");
	};

	const closeModal = () => {
		setModalMode("closed");
		setDraft(null);
		setEditKey("");
		setDraftKey("");
	};

	const saveFullConfig = async (next: FeatureFlagsConfig) => {
		setSaving(true);
		setError(null);
		setSuccess(null);
		try {
			const headers: HeadersInit = {
				"Content-Type": "application/json",
			};
			if (adminSecret.trim() !== "") {
				headers["x-admin-secret"] = adminSecret.trim();
			}
			const res = await fetch("/api/appconfig/config", {
				method: "PUT",
				headers,
				body: JSON.stringify(next),
			});
			const data: unknown = await res.json();
			if (!res.ok) {
				const err = data as { error?: string };
				throw new Error(err.error ?? res.statusText);
			}
			const ok = data as { versionNumber?: number };
			setSuccess(
				ok.versionNumber !== undefined
					? `Published version ${ok.versionNumber}. Refresh may take a few seconds until deployment completes.`
					: "Published.",
			);
			setConfig(cloneConfig(next));
			closeModal();
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Save failed");
		} finally {
			setSaving(false);
		}
	};

	const handleModalSubmit = () => {
		if (!config || !draft) {
			return;
		}
		const now = Math.floor(Date.now() / 1000);
		const key =
			modalMode === "add" ? draftKey.trim() : editKey.trim();
		if (!key) {
			setError("Flag key is required.");
			return;
		}
		if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
			setError(
				"Flag key may only contain letters, numbers, underscore, and hyphen.",
			);
			return;
		}

		const next = cloneConfig(config);
		const prev = next.featureFlags[key];
		const metaVersion = draft.meta_data?.version?.trim();
		const metaDesc = draft.meta_data?.description?.trim();
		const meta =
			metaVersion || metaDesc
				? {
						...(metaVersion ? { version: metaVersion } : {}),
						...(metaDesc ? { description: metaDesc } : {}),
					}
				: undefined;
		const ownerIds = (
			draft.attributes?.allowedAccoutsOwnerIds ?? []
		).filter(Boolean);
		const attributes =
			ownerIds.length > 0 ? { allowedAccoutsOwnerIds: ownerIds } : undefined;

		const updated: FeatureFlagDefinition = {
			...draft,
			updated_at: now,
			created_at:
				modalMode === "add"
					? now
					: (prev?.created_at ?? draft.created_at ?? now),
			meta_data: meta,
			attributes,
		};

		next.featureFlags[key] = updated;
		void saveFullConfig(next);
	};

	const handleDelete = (key: string) => {
		if (!config) {
			return;
		}
		if (
			typeof window !== "undefined" &&
			!window.confirm(`Delete feature flag "${key}"?`)
		) {
			return;
		}
		const next = cloneConfig(config);
		delete next.featureFlags[key];
		void saveFullConfig(next);
	};

	if (loading && !config) {
		return (
			<div className="rounded-lg border border-zinc-200 bg-white p-8 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
				Loading configuration…
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-6 px-4 py-10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
						Feature flags
					</h1>
					<p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
						Read from AppConfig; publish creates a new hosted version and starts
						a deployment. Set{" "}
						<code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
							APPCONFIG_DEPLOYMENT_STRATEGY_ID
						</code>{" "}
						for writes.
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => void load()}
						className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
					>
						Reload
					</button>
					<button
						type="button"
						onClick={openAdd}
						className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
					>
						Add flag
					</button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<label className="block text-sm">
					<span className="font-medium text-zinc-700 dark:text-zinc-300">
						Admin secret (optional)
					</span>
					<input
						type="password"
						autoComplete="off"
						value={adminSecret}
						onChange={(e) => setAdminSecret(e.target.value)}
						placeholder="If APPCONFIG_ADMIN_SECRET is set on the server"
						className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
					/>
				</label>
			</div>

			{error ? (
				<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
					{error}
				</div>
			) : null}
			{success ? (
				<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
					{success}
				</div>
			) : null}

			<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
						<tr>
							<th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
								Key
							</th>
							<th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
								Enabled
							</th>
							<th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
								Environment
							</th>
							<th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
								Valid until (UTC)
							</th>
							<th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
								Allowed owner IDs
							</th>
							<th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map(([key, def]) => (
							<tr
								key={key}
								className="border-b border-zinc-100 dark:border-zinc-800/80"
							>
								<td className="px-4 py-3 font-mono text-zinc-900 dark:text-zinc-100">
									{key}
								</td>
								<td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
									{def.enabled ? "Yes" : "No"}
								</td>
								<td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
									{def.environment ?? "—"}
								</td>
								<td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
									{def.valid_until !== undefined
										? new Date(def.valid_until * 1000).toISOString()
										: "—"}
								</td>
								<td className="max-w-[200px] truncate px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400">
									{(def.attributes?.allowedAccoutsOwnerIds ?? []).join(", ") ||
										"—"}
								</td>
								<td className="px-4 py-3">
									<div className="flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() => openEdit(key, def)}
											className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => handleDelete(key)}
											disabled={saving}
											className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{rows.length === 0 ? (
					<p className="px-4 py-8 text-center text-zinc-500">
						No flags yet. Add one or check AppConfig / IAM permissions.
					</p>
				) : null}
			</div>

			<details className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
				<summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
					Raw JSON
				</summary>
				<pre className="mt-3 max-h-96 overflow-auto rounded bg-white p-4 text-xs text-zinc-800 dark:bg-black dark:text-zinc-200">
					{config ? JSON.stringify(config, null, 2) : ""}
				</pre>
			</details>

			{modalMode !== "closed" && draft ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div
						className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
						role="dialog"
						aria-modal="true"
					>
						<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
							{modalMode === "add" ? "Add feature flag" : `Edit ${editKey}`}
						</h2>
						<div className="mt-4 space-y-4">
							{modalMode === "add" ? (
								<label className="block text-sm">
									<span className="font-medium text-zinc-700 dark:text-zinc-300">
										Key
									</span>
									<input
										value={draftKey}
										onChange={(e) => setDraftKey(e.target.value)}
										className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
										placeholder="e.g. limit_order"
									/>
								</label>
							) : null}

							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={draft.enabled}
									onChange={(e) =>
										setDraft({ ...draft, enabled: e.target.checked })
									}
								/>
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Enabled
								</span>
							</label>

							<label className="block text-sm">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Valid until (local)
								</span>
								<input
									type="datetime-local"
									value={unixSecondsToDatetimeLocal(draft.valid_until)}
									onChange={(e) =>
										setDraft({
											...draft,
											valid_until: datetimeLocalToUnixSeconds(
												e.target.value,
											),
										})
									}
									className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
								/>
							</label>

							<label className="block text-sm">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Environment
								</span>
								<input
									value={draft.environment ?? ""}
									onChange={(e) =>
										setDraft({
											...draft,
											environment: e.target.value.trim() || undefined,
										})
									}
									className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
									placeholder="production"
								/>
							</label>

							<label className="block text-sm">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Meta — version
								</span>
								<input
									value={draft.meta_data?.version ?? ""}
									onChange={(e) =>
										setDraft({
											...draft,
											meta_data: {
												...draft.meta_data,
												version: e.target.value,
											},
										})
									}
									className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
								/>
							</label>

							<label className="block text-sm">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Meta — description
								</span>
								<textarea
									value={draft.meta_data?.description ?? ""}
									onChange={(e) =>
										setDraft({
											...draft,
											meta_data: {
												...draft.meta_data,
												description: e.target.value,
											},
										})
									}
									rows={3}
									className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
								/>
							</label>

							<label className="block text-sm">
								<span className="font-medium text-zinc-700 dark:text-zinc-300">
									Allowed account owner IDs (comma or newline separated)
								</span>
								<textarea
									value={(draft.attributes?.allowedAccoutsOwnerIds ?? []).join(
										"\n",
									)}
									onChange={(e) =>
										setDraft({
											...draft,
											attributes: {
												...draft.attributes,
												allowedAccoutsOwnerIds: parseOwnerIds(e.target.value),
											},
										})
									}
									rows={4}
									className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
								/>
							</label>
						</div>

						<div className="mt-6 flex justify-end gap-2">
							<button
								type="button"
								onClick={closeModal}
								className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={saving}
								onClick={() => handleModalSubmit()}
								className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
							>
								{saving ? "Publishing…" : "Save & deploy"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
