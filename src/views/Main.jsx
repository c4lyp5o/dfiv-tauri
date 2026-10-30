import { memo, useCallback, useEffect, useState } from "react";
import { FolderTree, Library } from "lucide-react";

import { useDFMVContext } from "../context/DFMVContext";

import FileSidebar from "../components/FileExplorer/Sidebar";
import MediaSidebar from "../components/MediaManager/Sidebar";
import Viewer from "../components/Viewer";
import Settings from "../components/Settings";
import BottomButtons from "../components/BottomButtons";

const MemoedViewer = memo(Viewer);
const MemoedSettings = memo(Settings);
const MemoedFileSidebar = memo(FileSidebar);
const MemoedMediaSidebar = memo(MediaSidebar);

const SIDEBAR_WIDTH = { min: 220, max: 520, initial: 288, keyboardStep: 16 };
const SIDEBAR_WIDTH_KEY = "dfmv.sidebarWidth";

const MODES = [
	{ label: "Explorer", icon: FolderTree, isLibrary: false },
	{ label: "Library", icon: Library, isLibrary: true },
];

const clampWidth = (width) =>
	Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, width));

function readStoredWidth() {
	try {
		const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
		return stored ? clampWidth(stored) : SIDEBAR_WIDTH.initial;
	} catch {
		return SIDEBAR_WIDTH.initial;
	}
}

function useResizableSidebar() {
	const [width, setWidth] = useState(readStoredWidth);
	const [isResizing, setIsResizing] = useState(false);

	useEffect(() => {
		if (!isResizing) return;
		// The sidebar starts at the window's left edge, so clientX is its width
		const handleMove = (e) => setWidth(clampWidth(e.clientX));
		const handleUp = () => setIsResizing(false);
		window.addEventListener("pointermove", handleMove);
		window.addEventListener("pointerup", handleUp);
		return () => {
			window.removeEventListener("pointermove", handleMove);
			window.removeEventListener("pointerup", handleUp);
		};
	}, [isResizing]);

	useEffect(() => {
		if (isResizing) return;
		try {
			localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
		} catch {
			// Storage unavailable; the width just won't persist
		}
	}, [width, isResizing]);

	const startResize = useCallback((e) => {
		e.preventDefault();
		setIsResizing(true);
	}, []);

	const resizeBy = useCallback(
		(delta) => setWidth((current) => clampWidth(current + delta)),
		[],
	);

	return { width, isResizing, startResize, resizeBy };
}

function ModeSwitch() {
	const { dfmvState, dfmvDispatch } = useDFMVContext();

	const selectMode = (isLibrary) => {
		if (dfmvState.appMode === isLibrary) return;
		dfmvDispatch({ type: "TOGGLE_APP_MODE" });
		dfmvDispatch({ type: isLibrary ? "RESET_ALL" : "RESET_MEDIA_AND_INFO" });
	};

	return (
		<div className="p-2">
			<div
				role="tablist"
				aria-label="Mode"
				className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1"
			>
				{MODES.map(({ label, icon: Icon, isLibrary }) => {
					const isActive = dfmvState.appMode === isLibrary;
					return (
						<button
							key={label}
							type="button"
							role="tab"
							aria-selected={isActive}
							onClick={() => selectMode(isLibrary)}
							className={`flex h-7 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${
								isActive
									? "bg-surface-3 text-fg shadow-sm"
									: "text-fg-subtle hover:text-fg"
							}`}
						>
							<Icon size={14} />
							{label}
						</button>
					);
				})}
			</div>
		</div>
	);
}

function SidebarSwitch() {
	const { dfmvState } = useDFMVContext();
	return dfmvState.appMode ? <MemoedMediaSidebar /> : <MemoedFileSidebar />;
}

function ContentSwitch() {
	const { dfmvState } = useDFMVContext();
	return dfmvState.showSettings ? <MemoedSettings /> : <MemoedViewer />;
}

export default function Main() {
	const { width, isResizing, startResize, resizeBy } = useResizableSidebar();

	const handleResizeKey = (e) => {
		if (e.key === "ArrowLeft") resizeBy(-SIDEBAR_WIDTH.keyboardStep);
		if (e.key === "ArrowRight") resizeBy(SIDEBAR_WIDTH.keyboardStep);
	};

	return (
		<div
			className={`flex h-screen text-fg ${isResizing ? "cursor-col-resize" : ""}`}
		>
			<aside
				style={{ width }}
				className="relative flex h-full shrink-0 flex-col border-r border-line bg-surface-1"
			>
				<ModeSwitch />
				<div className="flex min-h-0 flex-1 flex-col">
					<SidebarSwitch />
				</div>
				<BottomButtons />

				{/* biome-ignore lint/a11y/useSemanticElements: a resizable splitter has no native element */}
				<div
					role="separator"
					aria-orientation="vertical"
					aria-label="Resize sidebar"
					aria-valuemin={SIDEBAR_WIDTH.min}
					aria-valuemax={SIDEBAR_WIDTH.max}
					aria-valuenow={width}
					tabIndex={0}
					onPointerDown={startResize}
					onKeyDown={handleResizeKey}
					className={`absolute inset-y-0 -right-1 z-30 w-2 cursor-col-resize outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 ${
						isResizing ? "bg-accent/60" : ""
					}`}
				/>
			</aside>
			<ContentSwitch />
		</div>
	);
}
