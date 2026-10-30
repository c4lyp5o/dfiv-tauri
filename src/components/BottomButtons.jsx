import { Settings as SettingsIcon } from "lucide-react";

import { useDBContext, useDFMVContext } from "../context/DFMVContext";

export default function BottomButtons() {
	const { dfmvState, dfmvDispatch } = useDFMVContext();
	const { dbState } = useDBContext();

	const isImporting = dbState.status === "Importing";

	return (
		<footer className="border-t border-line p-2">
			{isImporting && (
				<div className="mb-2 px-1" role="status">
					<div className="mb-1 flex justify-between text-[11px] text-fg-muted">
						<span>Importing to library…</span>
						<span className="tabular-nums">{dbState.progress}%</span>
					</div>
					<div className="h-1 overflow-hidden rounded-full bg-surface-3">
						<div
							className="h-full rounded-full bg-accent transition-all duration-300"
							style={{ width: `${dbState.progress}%` }}
						/>
					</div>
				</div>
			)}
			<button
				type="button"
				aria-pressed={dfmvState.showSettings}
				onClick={() => dfmvDispatch({ type: "TOGGLE_SETTINGS" })}
				className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors ${
					dfmvState.showSettings
						? "bg-surface-3 text-fg"
						: "text-fg-muted hover:bg-surface-3 hover:text-fg"
				}`}
			>
				<SettingsIcon size={15} />
				Settings
			</button>
		</footer>
	);
}
