import { useEffect, useState } from "react";
import { Eye, EyeOff, Pause, Play, Volume2, VolumeX } from "lucide-react";

const DEFAULT_UNMUTE_VOLUME = 50;

const formatTime = (seconds) => {
	if (!seconds || Number.isNaN(seconds)) return "0:00";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s < 10 ? "0" : ""}${s}`;
};

const percent = (value, max) => (max > 0 ? `${(value / max) * 100}%` : "0%");

function ControlButton({ label, onClick, children }) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			onClick={onClick}
			className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
		>
			{children}
		</button>
	);
}

export default function VideoControls({
	state,
	onSeek,
	onTogglePause,
	onToggleVideo,
	onVolumeChange,
}) {
	const [isDragging, setIsDragging] = useState(false);
	const [localTime, setLocalTime] = useState(0);
	// Remembers the volume before muting
	const [lastVolume, setLastVolume] = useState(100);

	const { paused, timePos, duration, volume, visible } = state;

	useEffect(() => {
		if (!isDragging) setLocalTime(timePos);
	}, [timePos, isDragging]);

	const handleSliderChange = (e) => {
		const value = Number.parseFloat(e.target.value);
		setLocalTime(value);
		onSeek(value);
	};

	const handleMuteToggle = () => {
		if (volume > 0) {
			setLastVolume(volume);
			onVolumeChange(0);
		} else {
			onVolumeChange(lastVolume || DEFAULT_UNMUTE_VOLUME);
		}
	};

	return (
		<div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/60 px-4 py-3 text-white shadow-2xl shadow-black/50 backdrop-blur-md">
			<div className="flex items-center gap-3">
				<span className="w-12 text-right font-mono text-[11px] text-white/70 tabular-nums">
					{formatTime(localTime)}
				</span>
				<input
					type="range"
					aria-label="Seek"
					min={0}
					max={duration || 100}
					step={0.1}
					value={localTime}
					onMouseDown={() => setIsDragging(true)}
					onMouseUp={() => setIsDragging(false)}
					onChange={handleSliderChange}
					style={{ "--progress": percent(localTime, duration) }}
					className="flex-1"
				/>
				<span className="w-12 font-mono text-[11px] text-white/70 tabular-nums">
					{formatTime(duration)}
				</span>
			</div>

			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1">
					<button
						type="button"
						aria-label={paused ? "Play" : "Pause"}
						title={paused ? "Play (Space)" : "Pause (Space)"}
						onClick={onTogglePause}
						className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-black transition-transform hover:scale-105"
					>
						{paused ? (
							<Play size={16} fill="currentColor" className="ml-0.5" />
						) : (
							<Pause size={16} fill="currentColor" />
						)}
					</button>

					<ControlButton
						label={visible ? "Pixelate video" : "Show video"}
						onClick={onToggleVideo}
					>
						{visible ? <EyeOff size={17} /> : <Eye size={17} />}
					</ControlButton>

					<div className="group/vol flex items-center">
						<ControlButton
							label={volume === 0 ? "Unmute" : "Mute"}
							onClick={handleMuteToggle}
						>
							{volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
						</ControlButton>
						<div className="flex w-0 items-center overflow-hidden transition-all duration-300 ease-out group-focus-within/vol:w-24 group-hover/vol:w-24">
							<input
								type="range"
								aria-label="Volume"
								min={0}
								max={100}
								value={volume}
								onChange={(e) => onVolumeChange(Number.parseFloat(e.target.value))}
								style={{ "--progress": percent(volume, 100) }}
								className="ml-1 w-20"
							/>
						</div>
					</div>
				</div>

				<span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
					mpv
				</span>
			</div>
		</div>
	);
}
