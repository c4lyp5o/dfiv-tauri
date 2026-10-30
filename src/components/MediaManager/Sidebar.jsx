import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { convertFileSrc } from "@tauri-apps/api/core";

import { useDBContext, useDFMVContext } from "../../context/DFMVContext";

import { useMediaByType, useMediaSearch } from "../../hooks/useMediaQuery";
import useDebounce from "../../hooks/useDebounce";

import ContextMenu from "../ContextMenu";

const VirtListRowComponent = memo(
	({ index, sorted, icon, style, selectedPath, onSelect, onContextMenu }) => {
		return (
			<li
				style={style}
				onContextMenu={(e) => {
					e.preventDefault();
					onContextMenu(e, sorted[index]);
				}}
				title={sorted[index].path}
			>
				<button
					type="button"
					className={`flex w-full items-center rounded-md text-left text-sm transition-colors duration-150
          ${
						selectedPath === sorted[index].path
							? "bg-blue-100 font-medium text-blue-800"
							: "text-slate-700 hover:bg-slate-200"
					}`}
					onClick={() => onSelect(sorted[index], index)}
				>
					<span className="w-5 text-center">{icon}</span>
					<span className="text-sm truncate">{sorted[index].name}</span>
				</button>
			</li>
		);
	},
);

const VirtList = ({ mediaFiles, types, icon, isLoading }) => {
	const parentRef = useRef(null);
	const { dfmvDispatch, dfmvState } = useDFMVContext();

	const sorted = useMemo(() => {
		return mediaFiles
			.filter((f) => Array.isArray(types) && types.includes(f.file_type))
			.sort((a, b) => {
				if (a.is_directory && !b.is_directory) return -1;
				if (!a.is_directory && b.is_directory) return 1;
				return a.name.localeCompare(b.name);
			});
	}, [mediaFiles, types]);

	const virtualizer = useVirtualizer({
		count: sorted.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 25,
	});

	const selectedPath = dfmvState.selectedMediaFilename?.path;

	const onSelect = useCallback(
		(file, index) => {
			dfmvDispatch({
				type: "SET_INFO_BOX",
				payload: { visible: false, content: "" },
			});
			dfmvDispatch({
				type: "SET_SELECTED_MEDIA",
				payload: convertFileSrc(file.path),
			});
			dfmvDispatch({
				type: "SET_SELECTED_MEDIA_FILENAME",
				payload: {
					name: file.name,
					path: file.path,
					type: file.file_type,
					index,
				},
			});
		},
		[dfmvDispatch],
	);

	const onContextMenu = useCallback(
		(e, file) => {
			dfmvDispatch({
				type: "SET_CONTEXT_MENU",
				payload: { x: e.clientX, y: e.clientY, file },
			});
		},
		[dfmvDispatch],
	);

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center py-8">
				<svg
					className="h-6 w-6 animate-spin text-blue-500"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<title>Loading...</title>
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					/>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					/>
				</svg>
				<span className="ml-2 text-sm text-slate-500">Loading...</span>
			</div>
		);
	}

	if (sorted.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center py-8">
				<span className="text-sm text-slate-400">No files found</span>
			</div>
		);
	}

	return (
		<div ref={parentRef} className="flex-1 overflow-auto">
			<ul
				style={{
					height: virtualizer.getTotalSize(),
					position: "relative",
					width: "100%",
				}}
			>
				{virtualizer.getVirtualItems().map((vRow) => (
					<VirtListRowComponent
						key={vRow.key}
						index={vRow.index}
						sorted={sorted}
						icon={icon}
						selectedPath={selectedPath}
						onSelect={onSelect}
						onContextMenu={onContextMenu}
						style={{
							position: "absolute",
							top: vRow.start,
							height: vRow.size,
							width: "100%",
						}}
					/>
				))}
			</ul>
		</div>
	);
};

export default function Sidebar() {
	const { startRemove } = useDBContext();
	const { dfmvState, dfmvDispatch, IMAGE_TYPES, AUDIO_TYPES, VIDEO_TYPES } =
		useDFMVContext();

	const [searchQuery, setSearchQuery] = useState("");
	const [openAccordion, setOpenAccordion] = useState(null);

	const debouncedSearchQuery = useDebounce(searchQuery, 200);
	const isSearching = !!debouncedSearchQuery;

	const types =
		openAccordion === "images"
			? IMAGE_TYPES
			: openAccordion === "audios"
				? AUDIO_TYPES
				: openAccordion === "videos"
					? VIDEO_TYPES
					: [];

	const { data: browseFiles = [], isLoading: isBrowseLoading } = useMediaByType(
		types,
		!!openAccordion && !isSearching,
	);

	const { data: searchFiles = [], isLoading: isSearchLoading } = useMediaSearch(
		types,
		debouncedSearchQuery,
		!!openAccordion && isSearching,
	);

	const mediaFiles = isSearching ? searchFiles : browseFiles;
	const isLoading = isSearching ? isSearchLoading : isBrowseLoading;

	const menuRef = useRef();
	const scrollableContainerRef = useRef();

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

	const toggleAccordion = (type) => {
		setSearchQuery("");
		setOpenAccordion((prev) => (prev === type ? null : type));
		scrollToTop();
	};

	const scrollToTop = () => {
		if (scrollableContainerRef.current) {
			scrollableContainerRef.current.scrollTo({
				top: 0,
				behavior: "smooth",
			});
		}
	};

	const handleSearch = (e) => setSearchQuery(e.target.value);

	const handleKeyDown = (e) => {
		if (!mediaFiles.length) return;

		dfmvDispatch({
			type: "SET_INFO_BOX",
			payload: { visible: false, content: "" },
		});

		const idx = dfmvState.selectedMediaFilename.index ?? 0;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			const nextIdx = Math.min(idx + 1, mediaFiles.length - 1);
			const file = mediaFiles[nextIdx];
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
			const file = mediaFiles[prevIdx];
			dfmvDispatch({
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
			const file = mediaFiles[idx];
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
		<section
			onKeyDown={handleKeyDown}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: false
			tabIndex={0}
			className="flex flex-col h-full"
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-slate-200 p-2">
				{/* Search Input */}
				<input
					type="text"
					placeholder="Search"
					value={searchQuery}
					disabled={!openAccordion}
					onChange={handleSearch}
					className={`flex-1 rounded border px-2 py-1 text-sm ${
						!openAccordion
							? "bg-gray-200 text-gray-400 cursor-not-allowed"
							: "bg-white text-black"
					}`}
				/>
				{/* Mode Selector */}
				<button
					type="button"
					title="Change Mode"
					onClick={() => {
						dfmvDispatch({ type: "TOGGLE_APP_MODE" });
						dfmvDispatch({ type: "RESET_MEDIA_AND_INFO" });
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
						<title>Change To Explorer Mode</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5"
						/>
					</svg>
				</button>
			</div>

			{/* Accordions */}
			<div
				ref={scrollableContainerRef}
				className="flex-1 flex flex-col min-h-0 overflow-y-auto"
			>
				{/* Images */}
				<div>
					<button
						type="button"
						className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-200"
						onClick={() => toggleAccordion("images")}
					>
						<span>Images</span>
						<span>{openAccordion === "images" ? "−" : "+"}</span>
					</button>
					{openAccordion === "images" && (
						<VirtList
							mediaFiles={mediaFiles}
							types={IMAGE_TYPES}
							icon="🖼️"
							isLoading={isLoading}
						/>
					)}
				</div>

				{/* Audios */}
				<div>
					<button
						type="button"
						className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-200"
						onClick={() => toggleAccordion("audios")}
					>
						<span>Audios</span>
						<span>{openAccordion === "audios" ? "−" : "+"}</span>
					</button>
					{openAccordion === "audios" && (
						<VirtList
							mediaFiles={mediaFiles}
							types={AUDIO_TYPES}
							icon="🎵"
							isLoading={isLoading}
						/>
					)}
				</div>

				{/* Videos */}
				<div>
					<button
						type="button"
						className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-200"
						onClick={() => toggleAccordion("videos")}
					>
						<span>Videos</span>
						<span>{openAccordion === "videos" ? "−" : "+"}</span>
					</button>
					{openAccordion === "videos" && (
						<VirtList
							mediaFiles={mediaFiles}
							types={VIDEO_TYPES}
							icon="🎞️"
							isLoading={isLoading}
						/>
					)}
				</div>

				{dfmvState.contextMenu.file && (
					<div ref={menuRef}>
						<ContextMenu
							appMode={dfmvState.appMode}
							x={dfmvState.contextMenu.x}
							y={dfmvState.contextMenu.y}
							onClose={() =>
								dfmvDispatch({
									type: "SET_CONTEXT_MENU",
									payload: { x: 0, y: 0, file: null },
								})
							}
							onRemove={() => {
								try {
									startRemove(dfmvState.contextMenu.file.path, "file");
								} catch (err) {
									console.error("DB remove failed:", err);
								} finally {
									mutate();
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
