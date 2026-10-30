import { useState } from "react";
import {
	Database,
	Film,
	HardDrive,
	Image as ImageIcon,
	Music,
	TriangleAlert,
	X,
} from "lucide-react";

import { useMediaStats } from "../hooks/useMediaQuery";
import { useDBContext, useDFMVContext } from "../context/DFMVContext";
import { formatBytes, formatCount } from "../utils/format";

import { IconButton } from "./ui";

const STATUS_DOTS = {
	Idle: "bg-fg-subtle",
	Importing: "bg-sky-400 animate-pulse",
	Imported: "bg-emerald-400",
	Removed: "bg-emerald-400",
	Nuking: "bg-amber-400 animate-pulse",
	Nuked: "bg-emerald-400",
	Error: "bg-red-400",
};

function Section({ title, children }) {
	return (
		<section className="mb-8">
			<h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
				{title}
			</h2>
			{children}
		</section>
	);
}

function StatTile({ icon: Icon, label, value, accent }) {
	return (
		<div className="rounded-xl border border-line bg-surface-1 p-4">
			<div className={`mb-3 inline-flex rounded-lg bg-surface-2 p-2 ${accent}`}>
				<Icon size={16} />
			</div>
			<div className="text-xl font-semibold tabular-nums text-fg">{value}</div>
			<div className="text-xs text-fg-muted">{label}</div>
		</div>
	);
}

export default function Settings() {
	const { dbState, startNukeDb } = useDBContext();
	const { dfmvDispatch } = useDFMVContext();
	const { data: stats, mutate } = useMediaStats();

	const [isConfirmingNuke, setIsConfirmingNuke] = useState(false);

	const handleNukeDatabase = async () => {
		setIsConfirmingNuke(false);
		// startNukeDb reports failures through dbState; refresh stats once it settles
		await startNukeDb();
		mutate();
	};

	const isImporting = dbState.status === "Importing";

	return (
		<main className="flex-1 overflow-y-auto bg-surface-0">
			<div className="mx-auto max-w-3xl px-8 py-8">
				<header className="mb-8 flex items-start justify-between gap-4">
					<div>
						<h1 className="text-xl font-semibold text-fg">Settings</h1>
						<p className="mt-1 text-sm text-fg-muted">
							Your media library and background tasks.
						</p>
					</div>
					<IconButton
						label="Close settings"
						onClick={() => dfmvDispatch({ type: "TOGGLE_SETTINGS" })}
					>
						<X size={16} />
					</IconButton>
				</header>

				<Section title="Library">
					<div className="grid grid-cols-2 gap-3 md:grid-cols-5">
						<StatTile
							icon={Database}
							label="Items"
							value={formatCount(stats?.total_count)}
							accent="text-accent"
						/>
						<StatTile
							icon={HardDrive}
							label="Total size"
							value={formatBytes(stats?.total_size)}
							accent="text-fg-muted"
						/>
						<StatTile
							icon={ImageIcon}
							label="Images"
							value={formatCount(stats?.image_count)}
							accent="text-sky-400"
						/>
						<StatTile
							icon={Music}
							label="Audio"
							value={formatCount(stats?.audio_count)}
							accent="text-violet-400"
						/>
						<StatTile
							icon={Film}
							label="Video"
							value={formatCount(stats?.video_count)}
							accent="text-rose-400"
						/>
					</div>
				</Section>

				<Section title="Activity">
					<div className="rounded-xl border border-line bg-surface-1 p-4">
						<div className="flex items-center gap-2.5">
							<span
								className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOTS[dbState.status] ?? STATUS_DOTS.Idle}`}
							/>
							<span className="text-sm font-medium text-fg">{dbState.status}</span>
							{dbState.message && (
								<span className="truncate text-sm text-fg-muted">
									· {dbState.message}
								</span>
							)}
						</div>
						{isImporting && (
							<div className="mt-3">
								<div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
									<div
										className="h-full rounded-full bg-accent transition-all duration-500"
										style={{ width: `${dbState.progress || 0}%` }}
									/>
								</div>
								<p className="mt-1 text-right text-xs tabular-nums text-fg-muted">
									{dbState.progress || 0}%
								</p>
							</div>
						)}
					</div>
				</Section>

				<Section title="Danger zone">
					<div className="flex flex-col gap-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex gap-3">
							<TriangleAlert size={18} className="mt-0.5 shrink-0 text-red-400" />
							<div>
								<p className="text-sm font-medium text-fg">Reset library</p>
								<p className="text-xs text-fg-muted">
									Removes every item from the library database. Files on disk
									aren't touched.
								</p>
							</div>
						</div>
						<div className="flex shrink-0 gap-2">
							{isConfirmingNuke && (
								<button
									type="button"
									onClick={() => setIsConfirmingNuke(false)}
									className="h-8 rounded-md px-3 text-sm text-fg-muted hover:bg-surface-3 hover:text-fg"
								>
									Cancel
								</button>
							)}
							<button
								type="button"
								disabled={dbState.isNuking}
								aria-busy={dbState.isNuking}
								onClick={
									isConfirmingNuke
										? handleNukeDatabase
										: () => setIsConfirmingNuke(true)
								}
								className="h-8 rounded-md bg-red-500 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{dbState.isNuking
									? "Resetting…"
									: isConfirmingNuke
										? "Yes, reset library"
										: "Reset library"}
							</button>
						</div>
					</div>
				</Section>
			</div>
		</main>
	);
}
