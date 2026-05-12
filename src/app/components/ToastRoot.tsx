"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function ToastRoot() {
	return (
		<ToastContainer
			position="top-right"
			theme="dark"
			autoClose={4200}
			limit={4}
			newestOnTop
			closeOnClick
			pauseOnFocusLoss
			draggable
			pauseOnHover
			className="!font-sans"
			toastClassName="!rounded-2xl !border !border-[var(--border)] !bg-[var(--surface-3)] !text-foreground !shadow-[var(--shadow-xl)]"
		/>
	);
}
