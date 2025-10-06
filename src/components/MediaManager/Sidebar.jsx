import { useState, useEffect, useRef, useMemo } from "react";
import { List } from "react-window";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useDMFVContext } from "../../context/DMFVContext";
import useDb from "../../hooks/useDb";
import useDebounce from "../../hooks/useDebounce";
import SearchWorker from "../../utils/searchWorker?worker";

import ContextMenu from "../ContextMenu";

const VirtListRowComponent = ({ index, sorted, icon, style }) => {
	const {
		setContextMenu,
		setInfoBox,
		setSelectedMedia,
		selectedMediaFilename,
		setSelectedMediaFilename,
	} = useDMFVContext();

	return (
		<li
			style={style}
			onContextMenu={(e) => {
				e.preventDefault();
				setContextMenu({
					x: e.clientX,
					y: e.clientY,
					file: sorted[index],
				});
			}}
			title={sorted[index].path}
		>
			<button
				type="button"
				className={`flex w-full items-center rounded-md text-left text-sm transition-colors duration-150
            ${
							selectedMediaFilename?.path === sorted[index].path
								? "bg-blue-100 font-medium text-blue-800"
								: "text-slate-700 hover:bg-slate-200"
						}`}
				onClick={() => {
					setInfoBox({ visible: false, content: "" });
					setSelectedMedia(convertFileSrc(sorted[index].path));
					setSelectedMediaFilename({
						name: sorted[index].name,
						path: sorted[index].path,
						type: sorted[index].file_type,
						index,
					});
				}}
			>
				<span className="w-5 text-center">{icon}</span>
				<span className="text-sm truncate">{sorted[index].name}</span>
			</button>
		</li>
	);
};

const VirtList = ({ currentFiles, types, icon }) => {
	const sorted = useMemo(() => {
		return currentFiles
			.filter((f) => Array.isArray(types) && types.includes(f.file_type))
			.sort((a, b) => {
				if (a.is_directory && !b.is_directory) return -1;
				if (!a.is_directory && b.is_directory) return 1;
				return a.name.localeCompare(b.name);
			});
	}, [currentFiles, types]);

	return (
		<List
			rowComponent={VirtListRowComponent}
			rowCount={sorted.length}
			rowHeight={25}
			rowProps={{
				sorted,
				icon,
			}}
		/>
	);
};

export default function Sidebar() {
	const {
		appMode,
		setAppMode,
		selectedMediaFilename,
		setSelectedMediaFilename,
		setSelectedMedia,
		contextMenu,
		setContextMenu,
		setInfoBox,
		database,
		resetMediaInfoHistory,
		IMAGE_TYPES,
		AUDIO_TYPES,
		VIDEO_TYPES,
	} = useDMFVContext();

	const [searchQuery, setSearchQuery] = useState("");
	const [filtered, setFiltered] = useState([]);
	const [openAccordion, setOpenAccordion] = useState(null);

	const { data: currentFiles = [], mutate } = useDb(5000);
	const debouncedSearchQuery = useDebounce(searchQuery, 500);
	const mediaFiles = searchQuery ? filtered : currentFiles;

	const menuRef = useRef();
	const scrollableContainerRef = useRef();
	const workerRef = useRef(null);

	useEffect(() => {
		const handleClick = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) {
				setContextMenu({ x: 0, y: 0, file: null });
			}
		};
		const handleEsc = (e) => {
			if (e.key === "Escape") {
				setContextMenu({ x: 0, y: 0, file: null });
			}
		};
		document.addEventListener("click", handleClick);
		document.addEventListener("keydown", handleEsc);
		return () => {
			document.removeEventListener("click", handleClick);
			document.removeEventListener("keydown", handleEsc);
		};
	}, [setContextMenu]);

	useEffect(() => {
		if (workerRef.current) {
			if (debouncedSearchQuery) {
				workerRef.current.postMessage({
					query: debouncedSearchQuery,
					files: currentFiles,
				});
			} else {
				setFiltered(currentFiles);
			}
		}
	}, [debouncedSearchQuery]);

	useEffect(() => {
		workerRef.current = new SearchWorker();
		workerRef.current.onmessage = (e) => {
			setFiltered(e.data);
		};

		return () => {
			workerRef.current?.terminate();
		};
	}, []);

	const toggleAccordion = (type) => {
		setSearchQuery("");
		setFiltered([]);
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

	const handleSearch = (e) => {
		setSearchQuery(e.target.value);
	};

	const handleKeyDown = (e) => {
		if (!currentFiles.length) return;

		setInfoBox({ visible: false, content: "" });

		const idx = selectedMediaFilename.index ?? 0;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			const nextIdx = Math.min(idx + 1, currentFiles.length - 1);
			const file = currentFiles[nextIdx];
			setSelectedMediaFilename({
				name: file.name,
				path: file.path,
				type: file.file_type,
				index: nextIdx,
			});
			if (!file.is_directory) setSelectedMedia(convertFileSrc(file.path));
			else setSelectedMedia(null);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			const prevIdx = Math.max(idx - 1, 0);
			const file = currentFiles[prevIdx];
			setSelectedMediaFilename({
				name: file.name,
				path: file.path,
				type: file.file_type,
				index: prevIdx,
			});
			if (!file.is_directory) setSelectedMedia(convertFileSrc(file.path));
			else setSelectedMedia(null);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const file = currentFiles[idx];
			if (file) {
				if (file.is_directory) openDir(file.path);
				else setSelectedMedia(convertFileSrc(file.path));
			}
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: false
		// biome-ignore lint/a11y/noNoninteractiveTabindex: false
		<section onKeyDown={handleKeyDown} tabIndex={0}>
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
						setAppMode(!appMode);
						resetMediaInfoHistory();
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
			<div ref={scrollableContainerRef} className="flex-1 overflow-y-auto">
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
						<VirtList currentFiles={mediaFiles} types={IMAGE_TYPES} icon="🖼️" />
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
						<VirtList currentFiles={mediaFiles} types={AUDIO_TYPES} icon="🎵" />
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
						<VirtList currentFiles={mediaFiles} types={VIDEO_TYPES} icon="🎞️" />
					)}
				</div>

				{contextMenu.file && (
					<div ref={menuRef}>
						<ContextMenu
							appMode={appMode}
							x={contextMenu.x}
							y={contextMenu.y}
							onClose={() => setContextMenu({ x: 0, y: 0, file: null })}
							onRemove={async () => {
								try {
									console.log("Remove", contextMenu.file);

									await database.execute(`DELETE FROM media WHERE path = ?`, [
										contextMenu.file.path,
									]);
								} catch (err) {
									console.error("DB remove failed:", err);
								} finally {
									mutate();
									setContextMenu({ x: 0, y: 0, file: null });
								}
							}}
						/>
					</div>
				)}
			</div>
		</section>
	);
}
