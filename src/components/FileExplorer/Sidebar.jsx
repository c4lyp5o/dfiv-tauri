import { useEffect, useRef } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { useDFMVContext } from "../../context/DFMVContext";
import useFolder from "../../hooks/useFolder";

import ContextMenu from "../ContextMenu";

export default function Sidebar() {
	const {
		dfmvState,
		dfmvDispatch,
		startImport,
		startRemove,
		IMAGE_TYPES,
		AUDIO_TYPES,
		VIDEO_TYPES,
	} = useDFMVContext();

	const {
		data: currentFiles = [],
		isLoading,
		error,
	} = useFolder(dfmvState.currentDir, 5000);

	const menuRef = useRef();

	useEffect(() => {
		const handleClick = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				dfmvDispatch({
					type: "SET_CONTEXT_MENU",
					payload: { x: 0, y: 0, file: null },
				});
			}
		};
		const handleEsc = (e) => {
			if (e.key === "Escape") {
				dfmvDispatch({
					type: "SET_CONTEXT_MENU",
					payload: { x: 0, y: 0, file: null },
				});
			}
		};
		document.addEventListener("click", handleClick);
		document.addEventListener("keydown", handleEsc);
		return () => {
			document.removeEventListener("click", handleClick);
			document.removeEventListener("keydown", handleEsc);
		};
	}, [dfmvDispatch]);

	const openDir = (dir, type) => {
		dfmvDispatch({ type: "SET_CURRENT_DIR", payload: dir });
		if (dfmvState.currentDir && type !== "drives") {
			dfmvDispatch({
				type: "SET_PREV_DIR",
				payload: [...dfmvState.prevDir, dfmvState.currentDir],
			});
			dfmvDispatch({ type: "SET_NEXT_DIR", payload: [] });
		}
	};

	const goToPreviousDir = () => {
		if (dfmvState.prevDir.length === 0) return;
		const backDir = dfmvState.prevDir[dfmvState.prevDir.length - 1];
		dfmvDispatch({ type: "SET_CURRENT_DIR", payload: backDir });
		dfmvDispatch({
			type: "SET_PREV_DIR",
			payload: dfmvState.prevDir.slice(0, -1),
		});
		dfmvDispatch({
			type: "SET_NEXT_DIR",
			payload: [dfmvState.currentDir, ...dfmvState.nextDir],
		});
		dfmvDispatch({ type: "RESET_MEDIA_AND_INFO" });
	};

	const goToNextDir = () => {
		if (dfmvState.nextDir.length === 0) return;
		const forwardDir = dfmvState.nextDir[0];
		dfmvDispatch({ type: "SET_CURRENT_DIR", payload: forwardDir });
		dfmvDispatch({
			type: "SET_PREV_DIR",
			payload: [...dfmvState.prevDir, dfmvState.currentDir],
		});
		dfmvDispatch({ type: "SET_NEXT_DIR", payload: dfmvState.nextDir.slice(1) });
		dfmvDispatch({ type: "RESET_MEDIA_AND_INFO" });
	};

	const handleKeyDown = (e) => {
		if (!currentFiles.length) return;

		dfmvDispatch({
			type: "SET_INFO_BOX",
			payload: { visible: false, content: "" },
		});

		const idx = dfmvState.selectedMediaFilename.index ?? 0;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			const nextIdx = Math.min(idx + 1, currentFiles.length - 1);
			const file = currentFiles[nextIdx];
			dfmvDispatch({
				type: "SET_SELECTED_MEDIA_FILENAME",
				payload: {
					name: file.name,
					path: file.path,
					type: file.file_type,
					index: nextIdx,
				},
			});
			if (!file.is_directory) {
				dfmvDispatch({
					type: "SET_SELECTED_MEDIA",
					payload: convertFileSrc(file.path),
				});
			} else {
				dfmvDispatch({
					type: "SET_SELECTED_MEDIA",
					payload: null,
				});
			}
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			const prevIdx = Math.max(idx - 1, 0);
			const file = currentFiles[prevIdx];
			fmvDispatch({
				type: "SET_SELECTED_MEDIA_FILENAME",
				payload: {
					name: file.name,
					path: file.path,
					type: file.file_type,
					index: prevIdx,
				},
			});
			if (!file.is_directory) {
				dfmvDispatch({
					type: "SET_SELECTED_MEDIA",
					payload: convertFileSrc(file.path),
				});
			} else {
				dfmvDispatch({
					type: "SET_SELECTED_MEDIA",
					payload: null,
				});
			}
		} else if (e.key === "Enter") {
			e.preventDefault();
			const file = currentFiles[idx];
			if (file) {
				if (file.is_directory) {
					openDir(file.path);
				} else {
					dfmvDispatch({
						type: "SET_SELECTED_MEDIA",
						payload: convertFileSrc(file.path),
					});
				}
			}
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: false
		// biome-ignore lint/a11y/noNoninteractiveTabindex: false
		<section onKeyDown={handleKeyDown} tabIndex={0}>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-slate-200 p-2">
				{/* Back Button */}
				<button
					type="button"
					title="Back"
					onClick={goToPreviousDir}
					disabled={dfmvState.prevDir.length === 0}
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
					disabled={dfmvState.nextDir.length === 0}
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

				{/* Drive Selector */}
				<select
					className="ml-2 rounded border border-slate-300 bg-white px-2 py-1 text-sm"
					value={dfmvState.currentDrive}
					onChange={async (e) => {
						const dir = e.target.value;
						if (dir) {
							dfmvDispatch({ type: "SET_CURRENT_DRIVE", payload: dir });
							await openDir(dir, "drives");
						}
					}}
				>
					<option value="" disabled>
						Select Drive
					</option>
					{dfmvState?.allDrives.map((drive) => (
						<option key={drive} value={drive}>
							{drive}
						</option>
					))}
				</select>

				{/* Mode Selector */}
				<button
					type="button"
					title="Change Mode"
					onClick={() => {
						dfmvDispatch({ type: "TOGGLE_APP_MODE" });
						dfmvDispatch({ type: "RESET_ALL" });
					}}
					className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={1.5}
						stroke="currentColor"
						className="h-5 w-5"
					>
						<title>Change To Media Mode</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 14h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"
						/>
					</svg>
				</button>
			</div>

			{/* File & Directory Listing */}
			<div className="flex-1 overflow-y-auto">
				<h2 className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
					{dfmvState.currentDir}
				</h2>
				{isLoading && (
					<div className="px-3 text-xs text-slate-400">Loading...</div>
				)}
				{error && (
					<div className="px-3 text-xs text-red-500">Failed to load folder</div>
				)}
				<ul className="p-1">
					{currentFiles
						.sort((a, b) => {
							if (a.is_directory && !b.is_directory) return -1;
							if (!a.is_directory && b.is_directory) return 1;
							return a.name.localeCompare(b.name);
						})
						.map((f, idx) => (
							<li
								key={f.path}
								onContextMenu={(e) => {
									e.preventDefault();
									if (f.is_directory) {
										dfmvDispatch({
											type: "SET_CONTEXT_MENU",
											payload: { x: e.clientX, y: e.clientY, file: f },
										});
									}
								}}
								title={f.name}
								className="cursor-default hover:bg-slate-100"
							>
								<button
									type="button"
									className={`flex w-full items-center rounded-md text-left text-sm transition-colors duration-150
                ${
									dfmvState.selectedMediaFilename.index === idx
										? "bg-blue-100 font-medium text-blue-800"
										: "text-slate-700 hover:bg-slate-200"
								}`}
									onClick={() => {
										dfmvDispatch({
											type: "SET_INFO_BOX",
											payload: { visible: false, content: "" },
										});
										if (f.is_directory) {
											openDir(f.path);
										} else {
											dfmvDispatch({
												type: "SET_SELECTED_MEDIA",
												payload: convertFileSrc(f.path),
											});
											dfmvDispatch({
												type: "SET_SELECTED_MEDIA_FILENAME",
												payload: {
													name: f.name,
													path: f.path,
													type: f.file_type,
													index: idx,
												},
											});
										}
									}}
								>
									<span className="w-5 text-center">
										{f.is_directory
											? "📁"
											: IMAGE_TYPES.includes(f.file_type)
												? "🖼️"
												: AUDIO_TYPES.includes(f.file_type)
													? "🎵"
													: VIDEO_TYPES.includes(f.file_type)
														? "🎞️"
														: "📄"}
									</span>
									<span className="text-sm truncate">{f.name}</span>
								</button>
							</li>
						))}
				</ul>

				{dfmvState.contextMenu.file && (
					<div ref={menuRef}>
						<ContextMenu
							x={dfmvState.contextMenu.x}
							y={dfmvState.contextMenu.y}
							onClose={() =>
								dfmvDispatch({
									type: "SET_CONTEXT_MENU",
									payload: { x: 0, y: 0, file: null },
								})
							}
							onAdd={async () => {
								try {
									console.log("Add", dfmvState.contextMenu.file);

									const folderFiles = await invoke("read_folder_recursive", {
										dir: dfmvState.contextMenu.file.path,
									});

									startImport(folderFiles);
									// // Batch insert
									// const values = folderFiles
									// 	.map(() => "(?, ?, ?, ?, ?)")
									// 	.join(", ");
									// const params = folderFiles.flatMap((file) => [
									// 	file.name,
									// 	file.size,
									// 	file.folder,
									// 	file.path,
									// 	file.file_type,
									// ]);

									// dbDispatch({ type: "TEST_DB_WORKER" });
									// dbWorkerRef.current.postMessage({ files: folderFiles });

									// await dbRef.current.execute(
									// 	`INSERT OR IGNORE INTO media (name, size, folder, path, file_type) VALUES ${values}`,
									// 	params,
									// );
								} catch (err) {
									console.error("DB insert failed:", err);
								} finally {
									dfmvDispatch({
										type: "SET_CONTEXT_MENU",
										payload: { x: 0, y: 0, file: null },
									});
								}
							}}
							onRemove={() => {
								try {
									console.log("Remove", dfmvState.contextMenu.file);

									startRemove(dfmvState.contextMenu.file.path, "folder");
								} catch (err) {
									console.error("DB remove failed:", err);
								} finally {
									dfmvDispatch({
										type: "SET_CONTEXT_MENU",
										payload: { x: 0, y: 0, file: null },
									});
								}
							}}
						/>
					</div>
				)}
			</div>
		</section>
	);
}
