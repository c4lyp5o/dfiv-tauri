import { useState, useEffect } from "react";

const formatTime = (seconds) => {
	if (!seconds || Number.isNaN(seconds)) return "00:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s < 10 ? "0" : ""}${s}`;
};

export default function VideoControls({
	state,
	onSeek,
	onTogglePause,
	onToggleVideo,
	onVolumeChange,
}) {
	const [isDragging, setIsDragging] = useState(false);
	const [localTime, setLocalTime] = useState(0);
	const [lastVolume, setLastVolume] = useState(100); // To remember volume before mute

	const { paused, timePos, duration, volume, visible } = state;

	useEffect(() => {
		if (!isDragging) setLocalTime(state.timePos);
	}, [state.timePos, isDragging]);

	const handleSliderChange = (e) => {
		setLocalTime(parseFloat(e.target.value));
		onSeek(parseFloat(e.target.value));
	};

	const handleMuteToggle = () => {
		if (volume > 0) {
			setLastVolume(volume);
			onVolumeChange(0);
		} else {
			// Restore previous volume, or default to 50 if it was 0
			onVolumeChange(lastVolume || 50);
		}
	};

	return (
		<div className="z-10 bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 flex flex-col gap-2 text-white shadow-lg border border-white/10">
			{/* PROGRESS BAR */}
			<div className="flex items-center gap-3">
				<span className="text-xs font-mono w-10 text-right">
					{formatTime(timePos)}
				</span>

				<input
					type="range"
					min={0}
					max={duration || 100}
					step={0.1}
					value={localTime}
					onMouseDown={() => setIsDragging(true)}
					onMouseUp={() => setIsDragging(false)}
					onChange={handleSliderChange}
					className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
				/>

				<span className="text-xs font-mono w-10">{formatTime(duration)}</span>
			</div>

			{/* BUTTON ROW */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={onTogglePause}
						className="hover:text-blue-400 transition-colors"
					>
						{paused ? (
							<PlayIcon className="w-6 h-6" />
						) : (
							<PauseIcon className="w-6 h-6" />
						)}
					</button>

					<button
						type="button"
						onClick={onToggleVideo}
						className="hover:text-blue-400 transition-colors"
					>
						{visible ? (
							<HideVideo className="w-6 h-6" />
						) : (
							<ShowVideo className="w-6 h-6" />
						)}
					</button>

					<div className="flex items-center gap-2 group/vol">
						<button
							type="button"
							onClick={handleMuteToggle}
							className="hover:text-blue-400 p-1"
						>
							{volume === 0 ? (
								<MuteIcon className="w-6 h-6" />
							) : (
								<VolumeIcon className="w-6 h-6" />
							)}
						</button>

						{/* Volume Slider - Expands on hover or always visible */}
						<div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 ease-out flex items-center">
							<input
								type="range"
								min={0}
								max={100}
								value={volume}
								onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
								className="w-20 h-1 ml-2 bg-gray-500 rounded-lg appearance-none cursor-pointer accent-white"
							/>
						</div>
					</div>
				</div>

				<div className="text-xs text-gray-400">Standard / MPV</div>
			</div>
		</div>
	);
}

// Simple Icon Components (or use Lucide/Heroicons)
const PlayIcon = ({ className }) => (
	<svg className={className} fill="currentColor" viewBox="0 0 24 24">
		<title>Play</title>
		<path d="M8 5v14l11-7z" />
	</svg>
);

const PauseIcon = ({ className }) => (
	<svg className={className} fill="currentColor" viewBox="0 0 24 24">
		<title>Pause</title>
		<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
	</svg>
);

const ShowVideo = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
		stroke="currentColor"
		className={className}
	>
		<title>Hide Video</title>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
		/>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
		/>
	</svg>
);

const HideVideo = ({ className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		strokeWidth={1.5}
		stroke="currentColor"
		className={className}
	>
		<title>Show Video</title>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
		/>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
		/>
		<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15" />
	</svg>
);

const VolumeIcon = ({ className }) => (
	<svg
		className={className}
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		strokeWidth={2}
	>
		<title>Volume</title>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
		/>
	</svg>
);

const MuteIcon = ({ className }) => (
	<svg
		className={className}
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		strokeWidth={2}
	>
		<title>Mute</title>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
		/>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
		/>
	</svg>
);
