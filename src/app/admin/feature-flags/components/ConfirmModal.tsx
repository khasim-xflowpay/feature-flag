"use client";

type Props = {
	open: boolean;
	kicker?: string;
	title: string;
	message: string;
	confirmLabel: string;
	secondaryLabel?: string;
	cancelLabel: string;
	danger?: boolean;
	onConfirm: () => void;
	onSecondaryAction?: () => void;
	onCancel: () => void;
};

export function ConfirmModal({
	open,
	kicker,
	title,
	message,
	confirmLabel,
	secondaryLabel,
	cancelLabel,
	danger,
	onConfirm,
	onSecondaryAction,
	onCancel,
}: Props) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(2,6,23,0.78)] p-4 backdrop-blur-md">
			<div
				className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,28,48,0.98),rgba(8,18,35,0.98))] p-6 shadow-[var(--shadow-xl)]"
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="confirm-modal-title"
				aria-describedby="confirm-modal-desc"
			>
				{kicker ? (
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
						{kicker}
					</p>
				) : null}
				<h2
					id="confirm-modal-title"
					className={`font-display text-2xl tracking-[-0.03em] text-foreground ${
						kicker ? "mt-2" : ""
					}`}
				>
					{title}
				</h2>
				<p
					id="confirm-modal-desc"
					className="mt-3 text-sm leading-6 text-[var(--muted)]"
				>
					{message}
				</p>
				<div className="mt-8 flex flex-wrap justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-full border border-[var(--border-strong)] bg-white/6 px-5 py-2.5 text-sm font-medium text-foreground hover:border-[var(--accent)] hover:bg-white/10"
					>
						{cancelLabel}
					</button>
					{secondaryLabel && onSecondaryAction ? (
						<button
							type="button"
							onClick={onSecondaryAction}
							className="rounded-full border border-[var(--border-strong)] bg-white/6 px-5 py-2.5 text-sm font-medium text-foreground hover:border-[var(--accent)] hover:bg-white/10"
						>
							{secondaryLabel}
						</button>
					) : null}
					<button
						type="button"
						onClick={onConfirm}
						className={`rounded-full border px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 ${
							danger
								? "border-[rgba(251,113,133,0.45)] bg-[linear-gradient(135deg,#fb7185,#be123c)]"
								: "border-[rgba(125,211,252,0.35)] bg-[linear-gradient(135deg,#38bdf8,#2563eb)]"
						}`}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
