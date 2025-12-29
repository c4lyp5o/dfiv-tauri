import { useEffect, useRef, useState, useCallback } from "react";
import { useDFMVContext } from "../context/DFMVContext";
import {
	init,
	observeProperties,
	command,
	setProperty,
	getProperty,
	destroy,
} from "tauri-plugin-libmpv-api";

import VideoControls from "./VideoControls";
import Options from "./FileExplorer/Options";

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
	const { dfmvState, IMAGE_TYPES, AUDIO_TYPES, VIDEO_TYPES } = useDFMVContext();

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

	const isVideo = VIDEO_TYPES.includes(dfmvState.selectedMediaFilename?.type);

	const handleWheel = (e) => {
		if (e.deltaY < 0) {
			setZoom((z) => Math.min(z * 1.1, 10)); // max zoom 10x
		} else {
			setZoom((z) => Math.max(z / 1.1, 0.1)); // min zoom 0.1x
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

	const toggleVideo = () => {
		console.log("toggle video", playbackState.visible);
		togglePrivacy(!playbackState.visible);
		setPlaybackState((prev) => ({
			...prev,
			visible: !prev.visible,
		}));
	};

	const togglePrivacy = async () => {
		console.log("in privacy", playbackState.visible);
		try {
			if (!playbackState.visible) {
				await setProperty("hwdec", "no");
				await setProperty("vf", "lavfi=[pixelize=w=96:h=96]");
			} else {
				await setProperty("hwdec", "auto-safe");
				await setProperty("vf", "");
			}
		} catch (e) {
			console.error("Failed to toggle privacy mode", e);
		}
	};

	const handleSeek = async (seconds) => {
		await command("seek", [seconds, "absolute"]);
	};

	const handleKeyControls = async (e) => {
		console.log(e.key);

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
		console.log("new volume", newVolume);
		const vol = Math.max(0, Math.min(100, newVolume));
		await setProperty("volume", vol);

		// Optimistically update state so UI feels snappy
		setPlaybackState((prev) => ({ ...prev, volume: vol }));
	};

	useEffect(() => {
		let unlisten = () => {};

		const initMpv = async () => {
			try {
				await init(mpvConfig);
				console.log("mpv initialization completed successfully!");

				// Optional: Listen to MPV events (e.g., to update a custom seek bar)
				unlisten = await observeProperties(
					OBSERVED_PROPERTIES,
					({ name, data }) => {
						if (data === null) return;

						setPlaybackState((prev) => {
							// Optimization: Don't trigger re-render if value hasn't changed significantly
							if (name === "time-pos" && Math.abs(prev.timePos - data) < 0.2)
								return prev;

							return {
								...prev,
								paused: name === "pause" ? data : prev.paused,
								timePos: name === "time-pos" ? data : prev.timePos,
								duration: name === "duration" ? data : prev.duration,
							};
						});
						// You can update local state here if you want to build a custom UI
						// console.log(name, data);
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

		const resizeObserver = new ResizeObserver(() => {
			updateMpvLayout();
		});

		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		updateMpvLayout();

		return () => resizeObserver.disconnect();
	}, [isVideo, updateMpvLayout]);

	return (
		<section
			ref={containerRef}
			className={`flex-1 flex justify-center items-center overflow-hidden relative ${
				isVideo ? "bg-transparent" : "bg-gray-900"
			}`}
			onWheel={handleWheel}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseLeave}
			aria-label="Media viewer"
		>
			{dfmvState.selectedMedia && <Options />}

			{IMAGE_TYPES.includes(dfmvState.selectedMediaFilename?.type) && (
				<img
					src={dfmvState.selectedMedia}
					alt={dfmvState.selectedMediaFilename.name}
					draggable={false}
					className="transition-transform duration-75"
					style={{
						transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
						cursor: dragging ? "grabbing" : "grab",
						userSelect: "none",
					}}
				/>
			)}

			{AUDIO_TYPES.includes(dfmvState.selectedMediaFilename?.type) && (
				// biome-ignore lint/a11y/useMediaCaption: captions otw
				<audio
					src={dfmvState.selectedMedia}
					controls
					autoPlay
					className="z-50"
				/>
			)}

			{VIDEO_TYPES.includes(dfmvState.selectedMediaFilename?.type) && (
				<>
					<div className="w-full h-full flex justify-center items-center">
						{/* We render NOTHING here (or a transparent div). 
               MPV renders directly to the window surface.
               
               If MPV is rendering *behind* the webview, ensure this div 
               and the section container are transparent in the center.
            */}
					</div>
					{/* 1. Click on video to toggle play/pause */}
					{/** biome-ignore lint/a11y/noStaticElementInteractions: false*/}
					<div
						className="absolute inset-0 z-0"
						onClick={togglePause}
						onKeyDown={handleKeyControls}
						// biome-ignore lint/a11y/noNoninteractiveTabindex: false
						tabIndex={0}
					/>
					{/* 2. The Controls Component */}
					{/* 'group-hover' allows controls to appear only when mouse is over the section */}
					{/* opacity-100 ensures it is always visible for debugging */}
					<div className="absolute bottom-0 left-0 right-0 p-4 z-10 opacity-0 hover:opacity-100">
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
				<span className="text-white">Select media...</span>
			)}
		</section>
	);
}
