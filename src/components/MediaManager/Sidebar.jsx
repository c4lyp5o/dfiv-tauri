import { useState, useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useFileList } from "../../context/FileListContext";
import useDb from "../../hooks/useDb";

import ContextMenu from "../ContextMenu";

export default function Sidebar() {
	const {
		appMode,
		setAppMode,
		setSelectedMedia,
		selectedMediaFilename,
		setSelectedMediaFilename,
		setInfoBox,
		contextMenu,
		setContextMenu,
		getFileExtension,
		database,
		IMAGE_TYPES,
		AUDIO_TYPES,
		VIDEO_TYPES,
	} = useFileList();

	const { data: currentFiles = [], mutate } = useDb(5000);

	const menuRef = useRef();

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

	const [openAccordion, setOpenAccordion] = useState(null);

	const toggleAccordion = (type) => {
		setOpenAccordion((prev) => (prev === type ? null : type));
	};

	const renderFiles = (types, icon) => {
		return currentFiles
			.filter((f) => types.includes(getFileExtension(f.name).toLowerCase()))
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
						setContextMenu({ x: e.clientX, y: e.clientY, file: f });
					}}
					title={f.name}
				>
					<button
						type="button"
						className={`flex w-full items-center rounded-md text-left text-sm transition-colors duration-150
							${
								selectedMediaFilename?.path === f.path
									? "bg-blue-100 font-medium text-blue-800"
									: "text-slate-700 hover:bg-slate-200"
							}`}
						onClick={() => {
							setInfoBox({ visible: false, content: "" });
							setSelectedMedia(convertFileSrc(f.path));
							setSelectedMediaFilename({
								name: f.path.split(/[/\\]/).pop(),
								path: f.path,
								type: getFileExtension(f.name),
								index: idx,
							});
						}}
					>
						<span className="w-5 text-center">{icon}</span>
						<span className="text-sm truncate">{f.name}</span>
					</button>
				</li>
			));
	};

	return (
		<section className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-50 outline-0">
			{/* Header */}
			<div className="flex items-center border-b border-slate-200 p-2">
				{/* Mode Selector */}
				<button
					type="button"
					title="Change Mode"
					onClick={() => setAppMode(!appMode)}
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
			<div className="flex-1 overflow-y-auto">
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
						<ul className="p-1">{renderFiles(IMAGE_TYPES, "🖼️")}</ul>
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
						<ul className="p-1">{renderFiles(AUDIO_TYPES, "🎵")}</ul>
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
						<ul className="p-1">{renderFiles(VIDEO_TYPES, "🎞️")}</ul>
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
