import { useCallback, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
	Film,
	Image as ImageIcon,
	LibraryBig,
	Music,
	Search,
	SearchX,
	X,
} from "lucide-react";

import {
	AUDIO_TYPES,
	IMAGE_TYPES,
	VIDEO_TYPES,
	useDBContext,
	useDFMVContext,
} from "../../context/DFMVContext";
import { useToast } from "../../context/ToastContext";

import {
	useMediaByType,
	useMediaSearch,
	useMediaStats,
	useRevalidateMedia,
} from "../../hooks/useMediaQuery";
import useDebounce from "../../hooks/useDebounce";
import { formatCount } from "../../utils/format";

import ContextMenu from "../ContextMenu";
import { EmptyState, FileRow, Spinner } from "../ui";

const ROW_HEIGHT = 33;
const CLOSED_MENU = { x: 0, y: 0, file: null };
const NAV_KEYS = ["ArrowDown", "ArrowUp", "Enter"];

const CATEGORIES = [
	{
		id: "images",
		label: "Images",
		noun: "images",
		icon: ImageIcon,
		types: IMAGE_TYPES,
		statKey: "image_count",
	},
	{
		id: "audios",
		label: "Audio",
		noun: "tracks",
		icon: Music,
		types: AUDIO_TYPES,
		statKey: "audio_count",
	},
	{
		id: "videos",
		label: "Video",
		noun: "videos",
		icon: Film,
		types: VIDEO_TYPES,
		statKey: "video_count",
	},
];

function MediaList({ files, isLoading, emptyState }) {
	const scrollRef = useRef(null);
	const { dfmvState, dfmvDispatch } = useDFMVContext();

	const virtualizer = useVirtualizer({
		count: files.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 12,
	});

	const selectedPath = dfmvState.selectedMediaFilename.path;

	const select = useCallback(
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

	const handleKeyDown = (e) => {
		if (!files.length || !NAV_KEYS.includes(e.key)) return;
		e.preventDefault();
		const current = files.findIndex((f) => f.path === selectedPath);

		if (e.key === "Enter") {
			if (current >= 0) select(files[current], current);
			return;
		}

		const next =
			e.key === "ArrowDown"
				? Math.min(current + 1, files.length - 1)
				: Math.max(current - 1, 0);
		select(files[next], next);
		virtualizer.scrollToIndex(next);
	};

	if (isLoading) return <Spinner />;
	if (files.length === 0) return emptyState;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: keyboard navigation for the media list
		<div
			ref={scrollRef}
			onKeyDown={handleKeyDown}
			// biome-ignore lint/a11y/noNoninteractiveTabindex: focus target for keyboard navigation
			tabIndex={0}
			className="min-h-0 flex-1 overflow-y-auto py-1.5 outline-none"
		>
			<ul
				className="relative mx-2"
				style={{ height: virtualizer.getTotalSize() }}
			>
				{virtualizer.getVirtualItems().map((row) => {
					const file = files[row.index];
					return (
						<FileRow
							key={file.path}
							index={row.index}
							name={file.name}
							type={file.file_type}
							title={file.path}
							isSelected={file.path === selectedPath}
							onClick={() => select(file, row.index)}
							onContextMenu={(e) => {
								e.preventDefault();
								dfmvDispatch({
									type: "SET_CONTEXT_MENU",
									payload: { x: e.clientX, y: e.clientY, file },
								});
							}}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: "100%",
								height: row.size,
								transform: `translateY(${row.start}px)`,
							}}
						/>
					);
				})}
			</ul>
		</div>
	);
}

export default function Sidebar() {
	const { startRemove } = useDBContext();
	const { dfmvState, dfmvDispatch } = useDFMVContext();
	const { showToast } = useToast();
	const revalidateMedia = useRevalidateMedia();

	const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
	const [searchQuery, setSearchQuery] = useState("");

	const debouncedSearchQuery = useDebounce(searchQuery, 200);
	const isSearching = !!debouncedSearchQuery;
	const category = CATEGORIES.find((c) => c.id === categoryId);

	const { data: stats } = useMediaStats();
	const { data: browseFiles = [], isLoading: isBrowseLoading } = useMediaByType(
		category.types,
		!isSearching,
	);
	const { data: searchFiles = [], isLoading: isSearchLoading } = useMediaSearch(
		category.types,
		debouncedSearchQuery,
		isSearching,
	);

	const mediaFiles = isSearching ? searchFiles : browseFiles;
	const isLoading = isSearching ? isSearchLoading : isBrowseLoading;

	const selectCategory = (id) => {
		setCategoryId(id);
		setSearchQuery("");
	};

	const menuFile = dfmvState.contextMenu.file;
	const closeMenu = useCallback(
		() => dfmvDispatch({ type: "SET_CONTEXT_MENU", payload: CLOSED_MENU }),
		[dfmvDispatch],
	);

	const handleRemove = async () => {
		closeMenu();
		const isRemoved = await startRemove(menuFile.path, "file");
		revalidateMedia();
		if (isRemoved) showToast(`Removed ${menuFile.name} from library`, "success");
		else showToast(`Couldn't remove ${menuFile.name}`, "error");
	};

	const totalInCategory = stats?.[category.statKey] ?? 0;
	const summary = isSearching ? (
		<>
			{formatCount(mediaFiles.length)}{" "}
			{mediaFiles.length === 1 ? "match" : "matches"} for{" "}
			<span className="normal-case">“{debouncedSearchQuery}”</span>
		</>
	) : (
		`${formatCount(totalInCategory)} ${category.noun}`
	);

	const emptyState = isSearching ? (
		<EmptyState
			icon={SearchX}
			title="No matches"
			hint={`Nothing in ${category.label.toLowerCase()} matches “${debouncedSearchQuery}”.`}
		/>
	) : (
		<EmptyState
			icon={LibraryBig}
			title={`No ${category.noun} yet`}
			hint="In Explorer, right-click a folder and choose “Add to library”."
		/>
	);

	return (
		<section aria-label="Media library" className="flex min-h-0 flex-1 flex-col">
			<div className="space-y-2 px-2 pb-2">
				<div className="relative flex items-center">
					<Search
						size={14}
						className="pointer-events-none absolute left-2.5 text-fg-subtle"
					/>
					<input
						type="search"
						placeholder={`Search ${category.label.toLowerCase()}`}
						aria-label="Search library"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-8 w-full rounded-md border border-line bg-surface-2 pr-8 pl-8 text-[13px] text-fg outline-none transition-colors placeholder:text-fg-subtle hover:border-fg-subtle/60 focus:border-accent [&::-webkit-search-cancel-button]:hidden"
					/>
					{searchQuery && (
						<button
							type="button"
							aria-label="Clear search"
							onClick={() => setSearchQuery("")}
							className="absolute right-1.5 rounded p-1 text-fg-subtle hover:bg-surface-3 hover:text-fg"
						>
							<X size={12} />
						</button>
					)}
				</div>

				<div role="tablist" aria-label="Media type" className="grid grid-cols-3 gap-1">
					{CATEGORIES.map(({ id, label, icon: Icon, statKey }) => {
						const isActive = id === categoryId;
						return (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={isActive}
								onClick={() => selectCategory(id)}
								className={`flex flex-col items-center gap-0.5 rounded-md border py-1.5 text-[11px] font-medium transition-colors ${
									isActive
										? "border-accent/40 bg-accent/10 text-fg"
										: "border-line text-fg-subtle hover:bg-surface-2 hover:text-fg"
								}`}
							>
								<Icon size={14} className={isActive ? "text-accent" : ""} />
								<span>{label}</span>
								<span className="tabular-nums text-[10px] text-fg-subtle">
									{formatCount(stats?.[statKey])}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="border-t border-line px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
				{summary}
			</div>

			<MediaList
				files={mediaFiles}
				isLoading={isLoading}
				emptyState={emptyState}
			/>

			{menuFile && (
				<ContextMenu
					x={dfmvState.contextMenu.x}
					y={dfmvState.contextMenu.y}
					title={menuFile.name}
					onClose={closeMenu}
					onRemove={handleRemove}
				/>
			)}
		</section>
	);
}
