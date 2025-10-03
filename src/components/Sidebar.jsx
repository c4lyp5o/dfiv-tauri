import { useEffect, useRef } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useFileList } from "../context/FileListContext";
import useFolder from "../hooks/useFolder";

const Sidebar = () => {
	const {
		drives,
		setDrives,
		currentDir,
		setCurrentDir,
		prevDir,
		setPrevDir,
		nextDir,
		setNextDir,
		setSelectedMedia,
		selectedMediaFilename,
		setSelectedMediaFilename,
		IMAGE_TYPES,
		AUDIO_TYPES,
		VIDEO_TYPES,
	} = useFileList();

	const {
		data: currentFiles = [],
		isLoading,
		error,
	} = useFolder(currentDir, 5000);

	const listRef = useRef();

	useEffect(() => {
		(async () => {
			const allDrives = await invoke("get_all_drives");
			setDrives({ allDrives, currentDrive: "" });
		})();
	}, [setDrives]);

	const openDir = async (dir, type) => {
		setSelectedMedia(null);
		setSelectedMediaFilename({ name: "", path: "", type: "", index: 0 });
		setCurrentDir(dir);
		if (currentDir && type !== "drives") {
			setPrevDir([...prevDir, currentDir]);
			setNextDir([]); // reset forward history
		}
	};

	const goToPreviousDir = async () => {
		if (prevDir.length === 0) return;
		const backDir = prevDir[prevDir.length - 1];
		setNextDir([currentDir, ...nextDir]); // Push current into forward history
		setCurrentDir(backDir); // Navigate
		setPrevDir(prevDir.slice(0, -1)); // Pop from prev
		setSelectedMedia(null);
		setSelectedMediaFilename({ name: "", path: "", type: "", index: 0 });
	};

	const goToNextDir = async () => {
		if (nextDir.length === 0) return;
		const forwardDir = nextDir[0];
		setPrevDir([...prevDir, currentDir]); // Push current into back history
		setCurrentDir(forwardDir); // Navigate
		setNextDir(nextDir.slice(1)); // Pop from next
		setSelectedMedia(null);
		setSelectedMediaFilename({ name: "", path: "", type: "", index: 0 });
	};

	const getFileExtension = (filename) => {
		const parts = filename.split(".");
		return parts.length > 1 ? parts.pop().toLowerCase() : "";
	};

	const handleKeyDown = (e) => {
		if (!currentFiles.length) return;

		const idx = selectedMediaFilename.index ?? 0;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			const nextIdx = Math.min(idx + 1, currentFiles.length - 1);
			const file = currentFiles[nextIdx];
			setSelectedMediaFilename({
				name: file.path.split(/[/\\]/).pop(),
				path: file.path,
				type: getFileExtension(file.name),
				index: nextIdx,
			});
			if (!file.is_directory) setSelectedMedia(convertFileSrc(file.path));
			else setSelectedMedia(null);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			const prevIdx = Math.max(idx - 1, 0);
			const file = currentFiles[prevIdx];
			setSelectedMediaFilename({
				name: file.path.split(/[/\\]/).pop(),
				path: file.path,
				type: getFileExtension(file.name),
				index: prevIdx,
			});
			if (!file.is_directory) setSelectedMedia(convertFileSrc(file.path));
			else setSelectedMedia(null);
		} else if (e.key === "Enter") {
			const file = currentFiles[idx];
			if (file) {
				if (file.is_directory) openDir(file.path);
				else setSelectedMedia(convertFileSrc(file.path));
			}
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: false
		<section
			className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-50 outline-0"
			onKeyDown={handleKeyDown}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: false
			tabIndex={0}
		>
			{/* Header with Navigation Controls */}
			<div className="flex items-center justify-between border-b border-slate-200 p-2">
				<div className="flex items-center gap-1">
					{/* Back Button */}
					<button
						type="button"
						title="Back"
						onClick={goToPreviousDir}
						disabled={prevDir.length === 0}
						className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="h-5 w-5"
						>
							<title>Back</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M15.75 19.5 8.25 12l7.5-7.5"
							/>
						</svg>
					</button>

					{/* Forward Button */}
					<button
						type="button"
						title="Forward"
						onClick={goToNextDir}
						disabled={nextDir.length === 0}
						className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							className="h-5 w-5"
						>
							<title>Forward</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="m8.25 4.5 7.5 7.5-7.5 7.5"
							/>
						</svg>
					</button>
				</div>

				{/* Drive Selector */}
				<select
					className="ml-2 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
					value={drives.currentDrive}
					onChange={async (e) => {
						const dir = e.target.value;
						if (dir) {
							setDrives((prev) => ({ ...prev, currentDrive: e.target.value }));
							await openDir(dir, "drives");
						}
					}}
				>
					<option value="" disabled>
						Select Drive
					</option>
					{drives?.allDrives.map((drive) => (
						<option key={drive} value={drive}>
							{drive}
						</option>
					))}
				</select>
			</div>

			{/* File & Directory Listing */}
			<div className="flex-1 overflow-y-auto">
				<h2 className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
					{currentDir}
				</h2>
				{isLoading && (
					<div className="px-3 text-xs text-slate-400">Loading...</div>
				)}
				{error && (
					<div className="px-3 text-xs text-red-500">Failed to load folder</div>
				)}
				<ul ref={listRef} className="p-1">
					{currentFiles
						.sort((a, b) => {
							if (a.is_directory && !b.is_directory) return -1;
							if (!a.is_directory && b.is_directory) return 1;
							return a.name.localeCompare(b.name);
						})
						.map((f, idx) => (
							<li key={f.path}>
								<button
									type="button"
									className={`flex w-full items-center rounded-md text-left text-sm transition-colors duration-150
                ${
									selectedMediaFilename.index === idx
										? "bg-blue-100 font-medium text-blue-800"
										: "text-slate-700 hover:bg-slate-200"
								}`}
									onClick={() => {
										if (f.is_directory) {
											openDir(f.path);
										} else {
											setSelectedMedia(convertFileSrc(f.path));
											setSelectedMediaFilename({
												name: f.path.split(/[/\\]/).pop(),
												path: f.path,
												type: getFileExtension(f.name),
												index: idx,
											});
										}
									}}
								>
									<span className="w-5 text-center">
										{f.is_directory
											? "📁"
											: IMAGE_TYPES.includes(getFileExtension(f.name))
												? "🖼️"
												: AUDIO_TYPES.includes(getFileExtension(f.name))
													? "🎵"
													: VIDEO_TYPES.includes(getFileExtension(f.name))
														? "🎞️"
														: "📄"}
									</span>
									<span className="text-sm truncate">{f.name}</span>
								</button>
							</li>
						))}
				</ul>
			</div>
		</section>
	);
};

export default Sidebar;
