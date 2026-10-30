import { useCallback, useEffect, useRef, useState } from "react";
import { Clapperboard, Music } from "lucide-react";
import {
	command,
	init,
	observeProperties,
	setProperty,
} from "tauri-plugin-libmpv-api";

import { mediaKind, useDFMVContext } from "../context/DFMVContext";

import VideoControls from "./VideoControls";
import Options from "./FileExplorer/Options";
import { Kbd } from "./ui";

const ZOOM = { min: 0.1, max: 10, step: 1.1 };

const OBSERVED_PROPERTIES = [
	["pause", "flag"],
	["time-pos", "double", "none"],
	["duration", "double", "none"],
	["filename", "string", "none"],
	["volume", "double", "none"],
	["vf", "string", "none"],
];

const mpvConfig = {
	initialOptions: {
		vo: "gpu-next",
		hwdec: "auto-safe",
		"keep-open": "yes",
		"force-window": "yes",
	},
	observedProperties: OBSERVED_PROPERTIES,
};

export default function Viewer() {
	const { dfmvState } = useDFMVContext();

	const [zoom, setZoom] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [dragging, setDragging] = useState(false);
	const [start, setStart] = useState({ x: 0, y: 0 });

	const [playbackState, setPlaybackState] = useState({
		paused: true,
		timePos: 0,
		duration: 0,
		volume: 100,
		visible: true,
	});

	const containerRef = useRef(null);

	const updateMpvLayout = useCallback(async () => {
		if (!containerRef.current) return;

		const rect = containerRef.current.getBoundingClientRect();
		const winWidth = window.innerWidth;
		const winHeight = window.innerHeight;

		const leftRatio = rect.left / winWidth;
		const topRatio = rect.top / winHeight;
		const rightRatio = (winWidth - rect.right) / winWidth;
		const bottomRatio = (winHeight - rect.bottom) / winHeight;

		try {
			await Promise.all([
				setProperty("video-margin-ratio-left", leftRatio),
				setProperty("video-margin-ratio-top", topRatio),
				setProperty("video-margin-ratio-right", rightRatio),
				setProperty("video-margin-ratio-bottom", bottomRatio),
			]);
		} catch (e) {
			console.warn("MPV resize error", e);
		}
	}, []);

	const { name, type, path } = dfmvState.selectedMediaFilename;
	const kind = mediaKind(type);
	const isVideo = kind === "video";

	const resetView = useCallback(() => {
		setZoom(1);
		setOffset({ x: 0, y: 0 });
	}, []);

	// Start each file fitted and centred
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset when the selected file changes
	useEffect(() => {
		resetView();
	}, [path, resetView]);

	const handleWheel = (e) => {
		if (e.deltaY < 0) {
			setZoom((z) => Math.min(z * ZOOM.step, ZOOM.max));
		} else {
			setZoom((z) => Math.max(z / ZOOM.step, ZOOM.min));
		}
	};

	const handleMouseDown = (e) => {
		if (!dfmvState.selectedMedia) return;
		setDragging(true);
		setStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
	};

	const handleMouseMove = (e) => {
		if (!dragging) return;
		setOffset({
			x: e.clientX - start.x,
			y: e.clientY - start.y,
		});
	};

	const handleMouseUp = () => setDragging(false);
	const handleMouseLeave = () => setDragging(false);

	const togglePause = async () => {
		await setProperty("pause", !playbackState.paused);
	};

	const togglePrivacy = async (shouldShow) => {
		try {
			if (shouldShow) {
				await setProperty("hwdec", "auto-safe");
				await setProperty("vf", "");
			} else {
				await setProperty("hwdec", "no");
				await setProperty("vf", "lavfi=[pixelize=w=48:h=48]");
			}
		} catch (e) {
			console.error("Failed to toggle privacy mode", e);
		}
	};

	const toggleVideo = () => {
		togglePrivacy(!playbackState.visible);
		setPlaybackState((prev) => ({
			...prev,
			visible: !prev.visible,
		}));
	};

	const handleSeek = async (seconds) => {
		await command("seek", [seconds, "absolute"]);
	};

	const handleKeyControls = async (e) => {
		if (!["ArrowRight", "ArrowLeft", "Enter", " "].includes(e.key)) return;

		switch (e.key) {
			case "ArrowRight":
				await command("seek", [10, "relative"]);
				break;
			case "ArrowLeft":
				await command("seek", [-10, "relative"]);
				break;
			case " ":
			case "Enter":
				togglePause();
				break;
		}
	};

	const handleVolumeChange = async (newVolume) => {
		const vol = Math.max(0, Math.min(100, newVolume));
		await setProperty("volume", vol);
		setPlaybackState((prev) => ({ ...prev, volume: vol }));
	};

	useEffect(() => {
		let unlisten = () => {};

		const initMpv = async () => {
			try {
				await init(mpvConfig);

				unlisten = await observeProperties(
					OBSERVED_PROPERTIES,
					({ name, data }) => {
						if (data === null) return;

						setPlaybackState((prev) => {
							// Skip re-renders for sub-0.2s time-pos jitter
							if (name === "time-pos" && Math.abs(prev.timePos - data) < 0.2)
								return prev;

							return {
								...prev,
								paused: name === "pause" ? data : prev.paused,
								timePos: name === "time-pos" ? data : prev.timePos,
								duration: name === "duration" ? data : prev.duration,
							};
						});
					},
				);
			} catch (error) {
				console.error("mpv initialization failed:", error);
			}
		};

		initMpv();

		return () => {
			unlisten();
			// Only destroy if you are completely leaving the view
			// destroy();
		};
	}, []);

	useEffect(() => {
		const loadMedia = async () => {
			if (isVideo) {
				try {
					await command("stop");
					await command("loadfile", [dfmvState.selectedMediaFilename.path]);
					await setProperty("pause", false);
					setPlaybackState((prev) => ({
						...prev,
						paused: false,
					}));
				} catch (e) {
					console.error("Failed to load video in MPV", e);
				}
			} else {
				try {
					await command("stop");
				} catch (e) {
					console.error("Failed to stop video in MPV", e);
				}
			}
		};

		loadMedia();
	}, [dfmvState.selectedMediaFilename, isVideo]);

	useEffect(() => {
		if (!isVideo) return;

		let timeoutId;

		const resizeObserver = new ResizeObserver(() => {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				updateMpvLayout();
			}, 16);
		});

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => {
			if (timeoutId) clearTimeout(timeoutId);
			resizeObserver.disconnect();
		};
	}, [isVideo, updateMpvLayout]);

	return (
		<section
			ref={containerRef}
			className={`relative flex flex-1 items-center justify-center overflow-hidden ${
				isVideo ? "bg-transparent" : "bg-surface-0"
			}`}
			onWheel={handleWheel}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseLeave}
			onDoubleClick={resetView}
			aria-label="Media viewer"
		>
			{dfmvState.selectedMedia && (
				<Options
					key={path}
					zoom={kind === "image" ? zoom : null}
					onResetZoom={resetView}
				/>
			)}

			{kind === "image" && (
				<img
					src={dfmvState.selectedMedia}
					alt={name}
					draggable={false}
					className="max-h-full max-w-full object-contain transition-transform duration-75"
					style={{
						transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
						cursor: dragging ? "grabbing" : "grab",
					}}
				/>
			)}

			{kind === "audio" && (
				<div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-line bg-surface-1 p-8 shadow-2xl shadow-black/40">
					<div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500/35 to-accent/25 text-violet-200">
						<Music size={44} />
					</div>
					<div className="w-full min-w-0 text-center">
						<p className="truncate text-sm font-medium text-fg" title={name}>
							{name}
						</p>
						<p className="mt-0.5 text-[11px] uppercase tracking-wide text-fg-subtle">
							{type} audio
						</p>
					</div>
					{/* biome-ignore lint/a11y/useMediaCaption: local audio files have no captions */}
					<audio
						src={dfmvState.selectedMedia}
						controls
						autoPlay
						className="w-full"
					/>
				</div>
			)}

			{isVideo && (
				<>
					{/* mpv renders behind the transparent webview; this area stays empty */}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: click/keys control playback */}
					<div
						className="absolute inset-0 z-0"
						onClick={togglePause}
						onKeyDown={handleKeyControls}
						// biome-ignore lint/a11y/noNoninteractiveTabindex: focus target for playback keys
						tabIndex={0}
					/>
					<div className="absolute inset-x-0 bottom-0 z-10 p-4 opacity-0 transition-opacity duration-200 focus-within:opacity-100 hover:opacity-100">
						<VideoControls
							state={playbackState}
							onSeek={handleSeek}
							onTogglePause={togglePause}
							onToggleVideo={toggleVideo}
							onVolumeChange={handleVolumeChange}
						/>
					</div>
				</>
			)}

			{!dfmvState.selectedMedia && (
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="rounded-2xl border border-line bg-surface-1 p-4 text-fg-subtle">
						<Clapperboard size={28} />
					</div>
					<p className="text-sm font-medium text-fg-muted">Nothing selected</p>
					<p className="flex items-center gap-1.5 text-xs text-fg-subtle">
						Choose a file in the sidebar, or browse with <Kbd>↑</Kbd>
						<Kbd>↓</Kbd>
					</p>
				</div>
			)}
		</section>
	);
}
