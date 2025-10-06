import { useState, useMemo } from "react";
import { useDMFVContext } from "../context/DMFVContext";
import useDb from "../hooks/useDb";

export default function Settings() {
	const { database, IMAGE_TYPES, AUDIO_TYPES, VIDEO_TYPES } = useDMFVContext();
	const { data: currentFiles = [], mutate } = useDb(5000);

	const [isNuking, setIsNuking] = useState(false);

	const { totalSize, counts } = useMemo(() => {
		const counts = { images: 0, audios: 0, videos: 0 };
		let totalSize = 0;

		for (const file of currentFiles) {
			totalSize += file.size;
			if (IMAGE_TYPES.includes(file.file_type)) counts.images++;
			else if (AUDIO_TYPES.includes(file.file_type)) counts.audios++;
			else if (VIDEO_TYPES.includes(file.file_type)) counts.videos++;
		}

		return { totalSize, counts };
	}, [currentFiles, IMAGE_TYPES, AUDIO_TYPES, VIDEO_TYPES]);

	const handleNukeDatabase = async () => {
		// if (
		// 	!window.confirm(
		// 		"Are you sure? This will permanently delete all media entries.",
		// 	)
		// )
		// 	return;

		try {
			setIsNuking(true);
			await database.execute("DELETE FROM media");
			console.log("Database nuked successfully");
		} catch (error) {
			console.error("Error nuking database:", error);
		} finally {
			mutate();
			setIsNuking(false);
		}
	};

	const formatBytes = (bytes) => {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
	};

	return (
		<div className="flex-1 overflow-y-auto p-4 space-y-6">
			{/* Section: Media Info */}
			<div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
				<h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Media Info
				</h2>

				<dl className="space-y-1 text-sm">
					<div className="flex justify-between">
						<dt className="text-slate-600">Items</dt>
						<dd className="font-medium text-slate-800">
							{currentFiles.length}
						</dd>
					</div>

					<div className="flex justify-between">
						<dt className="text-slate-600">Size</dt>
						<dd className="font-medium text-slate-800">
							{formatBytes(totalSize)}
						</dd>
					</div>

					<div className="flex justify-between">
						<dt className="text-slate-600">Images</dt>
						<dd className="font-medium text-slate-800">{counts.images}</dd>
					</div>

					<div className="flex justify-between">
						<dt className="text-slate-600">Audios</dt>
						<dd className="font-medium text-slate-800">{counts.audios}</dd>
					</div>

					<div className="flex justify-between">
						<dt className="text-slate-600">Videos</dt>
						<dd className="font-medium text-slate-800">{counts.videos}</dd>
					</div>
				</dl>
			</div>

			{/* Section: Nuke Database */}
			<div>
				<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Nuke Database
				</h2>
				<p className="mb-3 text-sm text-slate-600">
					This will permanently delete all stored data. Proceed with caution.
				</p>
				<button
					type="button"
					disabled={isNuking}
					aria-busy={isNuking}
					aria-label="Nuke Database"
					title="Nuke Database"
					className={`rounded px-3 py-1.5 text-sm font-medium shadow focus:outline-none focus:ring-2 ${
						isNuking
							? "bg-red-300 text-white cursor-not-allowed"
							: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
					}`}
					onClick={handleNukeDatabase}
				>
					{isNuking ? "Nuking…" : "Nuke Database"}
				</button>
			</div>

			{/* Section: Placeholder 2 */}
			{/* <div>
				<h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
					Placeholder Section 2
				</h2>
				<p className="text-sm text-slate-600">
					Add content or settings controls here.
				</p>
			</div> */}
		</div>
	);
}
