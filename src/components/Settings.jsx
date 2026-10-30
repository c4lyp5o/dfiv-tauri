import { useMediaStats } from "../hooks/useMediaQuery";

import { useDBContext } from "../context/DFMVContext";

export default function Settings() {
	const { dbState, startNukeDb } = useDBContext();
	const { data: stats, mutate } = useMediaStats();

	const handleNukeDatabase = async () => {
		// if (
		// 	!window.confirm(
		// 		"Are you sure? This will permanently delete all media entries.",
		// 	)
		// )
		// 	return;

		// startNukeDb reports failures through dbState; refresh stats once it settles
		await startNukeDb();
		mutate();
	};

	const formatBytes = (bytes) => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	return (
		<div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-800">
			{/* Section: Media Info */}
			<div>
				<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Media Info
				</h2>
				<div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
					<dl className="space-y-1 text-sm">
						<div className="flex justify-between">
							<dt className="text-slate-600">Items</dt>
							<dd className="font-medium text-slate-800">
								{stats?.total_count ?? 0}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-slate-600">Size</dt>
							<dd className="font-medium text-slate-800">
								{formatBytes(stats?.total_size)}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-slate-600">Images</dt>
							<dd className="font-medium text-slate-800">
								{stats?.image_count ?? 0}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-slate-600">Audios</dt>
							<dd className="font-medium text-slate-800">
								{stats?.audio_count ?? 0}
							</dd>
						</div>
						<div className="flex justify-between">
							<dt className="text-slate-600">Videos</dt>
							<dd className="font-medium text-slate-800">
								{stats?.video_count ?? 0}
							</dd>
						</div>
					</dl>
				</div>
			</div>

			{/* Section: Task Status */}
			<div>
				<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Task Status
				</h2>
				<div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
					<dl className="space-y-2 text-sm">
						<div className="flex justify-between items-center">
							<dt className="text-slate-600">Status</dt>
							<dd
								className={`font-medium ${
									dbState.status.toLowerCase() === "imported" ||
									dbState.status.toLowerCase() === "removed" ||
									dbState.status.toLowerCase() === "nuked"
										? "text-green-600"
										: dbState.status.toLowerCase() === "error" ||
												dbState.status.toLowerCase() === "nuking"
											? "text-red-600"
											: dbState.status.toLowerCase() === "importing" ||
													dbState.status.toLowerCase() === "removing"
												? "text-blue-600"
												: "text-slate-800"
								}`}
							>
								{dbState.status}
							</dd>
						</div>

						<div className="flex justify-between items-center">
							<dt className="text-slate-600">Message</dt>
							<dd className="font-medium text-slate-800">{dbState.message}</dd>
						</div>

						{dbState.status.toLowerCase() === "importing" && (
							<div className="space-y-1">
								<dt className="text-slate-600">Progress</dt>
								<dd className="flex flex-col gap-1">
									<div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
										<div
											className="h-full bg-blue-500 transition-all duration-500"
											style={{ width: `${dbState.progress || 0}%` }}
										/>
									</div>
									<p className="text-right text-xs text-slate-600">
										{dbState.progress || 0}%
									</p>
								</dd>
							</div>
						)}
					</dl>
				</div>
			</div>

			{/* Section: Nuke Database */}
			<div>
				<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Nuke Database
				</h2>
				<div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
					<p className="mb-3 text-sm text-slate-600">
						This will permanently delete all stored data. Proceed with caution.
					</p>
					<button
						type="button"
						disabled={dbState.isNuking}
						aria-busy={dbState.isNuking}
						aria-label="Nuke Database"
						title="Nuke Database"
						className={`rounded px-3 py-1.5 text-sm font-medium shadow focus:outline-none focus:ring-2 ${
							dbState.isNuking
								? "bg-red-300 text-white cursor-not-allowed"
								: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
						}`}
						onClick={handleNukeDatabase}
					>
						{dbState.isNuking ? "Nuking…" : "Nuke Database"}
					</button>
				</div>
			</div>
		</div>
	);
}
