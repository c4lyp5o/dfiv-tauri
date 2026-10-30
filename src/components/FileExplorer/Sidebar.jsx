import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	FolderOpen,
	HardDrive,
	TriangleAlert,
} from "lucide-react";

import { useDBContext, useDFMVContext } from "../../context/DFMVContext";
import { useToast } from "../../context/ToastContext";

import useFolder from "../../hooks/useFolder";
import { baseName, formatBytes } from "../../utils/format";

import ContextMenu from "../ContextMenu";
import { EmptyState, FileRow, IconButton, Spinner } from "../ui";

const CLOSED_MENU = { x: 0, y: 0, file: null };
const HIDDEN_INFO = { visible: false, content: "" };
const NAV_KEYS = ["ArrowDown", "ArrowUp", "Enter"];

export default function Sidebar() {
	const { startImport, startRemove } = useDBContext();
	const { dfmvState, dfmvDispatch } = useDFMVContext();
	const { showToast } = useToast();

	const {
		data: currentFiles = [],
		isLoading,
		error,
	} = useFolder(dfmvState.currentDir, 5000);

	const listRef = useRef(null);
	const selectedPath = dfmvState.selectedMediaFilename.path;
	const selectedIndex = currentFiles.findIndex((f) => f.path === selectedPath);

	// Keep the keyboard selection in view
	useEffect(() => {
		listRef.current
			?.querySelector(`[data-index="${selectedIndex}"]`)
			?.scrollIntoView({ block: "nearest" });
	}, [selectedIndex]);

	const openDir = (dir, type) => {
		dfmvDispatch({ type: "SET_CURRENT_DIR", payload: dir });
		dfmvDispatch({ type: "RESET_MEDIA_AND_INFO" });
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

	const selectFile = (file, index) => {
		dfmvDispatch({
			type: "SET_SELECTED_MEDIA_FILENAME",
			payload: {
				name: file.name,
				path: file.path,
				type: file.file_type,
				index,
			},
		});
		dfmvDispatch({
			type: "SET_SELECTED_MEDIA",
			payload: file.is_directory ? null : convertFileSrc(file.path),
		});
	};

	const handleClick = (file, index) => {
		dfmvDispatch({ type: "SET_INFO_BOX", payload: HIDDEN_INFO });
		if (file.is_directory) openDir(file.path);
		else selectFile(file, index);
	};

	const handleKeyDown = (e) => {
		if (!currentFiles.length || !NAV_KEYS.includes(e.key)) return;
		// Let the drive picker handle its own arrow keys
		if (e.target.tagName === "SELECT") return;
		e.preventDefault();
		dfmvDispatch({ type: "SET_INFO_BOX", payload: HIDDEN_INFO });

		if (e.key === "Enter") {
			const file = currentFiles[selectedIndex];
			if (file?.is_directory) openDir(file.path);
			else if (file) selectFile(file, selectedIndex);
			return;
		}

		const nextIndex =
			e.key === "ArrowDown"
				? Math.min(selectedIndex + 1, currentFiles.length - 1)
				: Math.max(selectedIndex - 1, 0);
		selectFile(currentFiles[nextIndex], nextIndex);
	};

	const menuFile = dfmvState.contextMenu.file;
	const closeMenu = () =>
		dfmvDispatch({ type: "SET_CONTEXT_MENU", payload: CLOSED_MENU });

	const handleAddToLibrary = () => {
		closeMenu();
		startImport(menuFile.path);
		showToast(`Importing ${menuFile.name}…`, "info");
	};

	const handleRemoveFromLibrary = async () => {
		closeMenu();
		const isRemoved = await startRemove(menuFile.path, "folder");
		if (isRemoved) showToast(`Removed ${menuFile.name} from library`, "success");
		else showToast(`Couldn't remove ${menuFile.name}`, "error");
	};

	const renderListing = () => {
		if (!dfmvState.currentDir) {
			return (
				<EmptyState
					icon={HardDrive}
					title="Pick a drive to start browsing"
					hint="Use ↑ ↓ to move through files and Enter to open folders."
				/>
			);
		}
		if (isLoading) return <Spinner />;
		if (error) {
			return (
				<EmptyState
					icon={TriangleAlert}
					title="Couldn't read this folder"
					hint={String(error)}
				/>
			);
		}
		if (currentFiles.length === 0) {
			return (
				<EmptyState
					icon={FolderOpen}
					title="No media here"
					hint="Only folders and supported media files are shown."
				/>
			);
		}
		return (
			<ul ref={listRef} className="space-y-px px-2 py-1.5">
				{currentFiles.map((f, idx) => (
					<FileRow
						key={f.path}
						index={idx}
						name={f.name}
						type={f.file_type}
						isDirectory={f.is_directory}
						meta={f.is_directory ? null : formatBytes(f.size)}
						isSelected={f.path === selectedPath}
						onClick={() => handleClick(f, idx)}
						onContextMenu={(e) => {
							e.preventDefault();
							if (f.is_directory) {
								dfmvDispatch({
									type: "SET_CONTEXT_MENU",
									payload: { x: e.clientX, y: e.clientY, file: f },
								});
							}
						}}
					/>
				))}
			</ul>
		);
	};

	return (
		<section
			onKeyDown={handleKeyDown}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: focus target for keyboard navigation
			tabIndex={0}
			aria-label="File explorer"
			className="flex min-h-0 flex-1 flex-col outline-none"
		>
			<div className="flex items-center gap-1 px-2 pb-2">
				<IconButton
					label="Back"
					onClick={goToPreviousDir}
					disabled={dfmvState.prevDir.length === 0}
				>
					<ChevronLeft size={16} />
				</IconButton>
				<IconButton
					label="Forward"
					onClick={goToNextDir}
					disabled={dfmvState.nextDir.length === 0}
				>
					<ChevronRight size={16} />
				</IconButton>

				<div className="relative ml-1 flex min-w-0 flex-1 items-center">
					<HardDrive
						size={14}
						className="pointer-events-none absolute left-2.5 text-fg-subtle"
					/>
					<select
						aria-label="Drive"
						value={dfmvState.currentDrive}
						onChange={(e) => {
							const dir = e.target.value;
							if (dir) {
								dfmvDispatch({ type: "SET_CURRENT_DRIVE", payload: dir });
								openDir(dir, "drives");
							}
						}}
						className="h-8 w-full min-w-0 appearance-none truncate rounded-md border border-line bg-surface-2 pr-7 pl-8 text-[13px] text-fg outline-none transition-colors hover:border-fg-subtle/60 focus:border-accent"
					>
						<option value="" disabled>
							Select a drive
						</option>
						{dfmvState.allDrives.map((drive) => (
							<option key={drive} value={drive}>
								{drive}
							</option>
						))}
					</select>
					<ChevronDown
						size={14}
						className="pointer-events-none absolute right-2 text-fg-subtle"
					/>
				</div>
			</div>

			{dfmvState.currentDir && (
				<div
					className="border-y border-line px-3 py-2"
					title={dfmvState.currentDir}
				>
					<div className="flex items-center gap-2 text-[13px] font-medium text-fg">
						<FolderOpen size={14} className="shrink-0 text-accent" />
						<span className="truncate">{baseName(dfmvState.currentDir)}</span>
					</div>
					{/* rtl + bdi truncates the start of long paths instead of the end */}
					<div
						className="mt-0.5 truncate text-left text-[11px] text-fg-subtle"
						style={{ direction: "rtl" }}
					>
						<bdi>{dfmvState.currentDir}</bdi>
					</div>
				</div>
			)}

			<div className="min-h-0 flex-1 overflow-y-auto">{renderListing()}</div>

			{menuFile && (
				<ContextMenu
					x={dfmvState.contextMenu.x}
					y={dfmvState.contextMenu.y}
					title={menuFile.name}
					onClose={closeMenu}
					onAdd={handleAddToLibrary}
					onRemove={handleRemoveFromLibrary}
				/>
			)}
		</section>
	);
}
