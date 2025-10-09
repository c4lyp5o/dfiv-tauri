import { useEffect, useRef, useState } from "react";
import { useDFMVContext } from "../context/DFMVContext";

import Options from "./FileExplorer/Options";

export default function Viewer() {
	const { dfmvState, IMAGE_TYPES, AUDIO_TYPES, VIDEO_TYPES } = useDFMVContext();

	const [zoom, setZoom] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [dragging, setDragging] = useState(false);
	const [start, setStart] = useState({ x: 0, y: 0 });

	const containerRef = useRef();

	useEffect(() => {
		if (dfmvState.selectedMedia) {
			setZoom(1);
			setOffset({ x: 0, y: 0 });
		}
	}, [dfmvState.selectedMedia]);

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

	return (
		<section
			ref={containerRef}
			className="flex-1 flex justify-center items-center bg-gray-900 overflow-hidden relative"
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
			{[...AUDIO_TYPES, ...VIDEO_TYPES].includes(
				dfmvState.selectedMediaFilename?.type,
			) && (
				<div className="flex flex-col items-center">
					{/** biome-ignore lint/a11y/useMediaCaption: false */}
					<video
						src={dfmvState.selectedMedia}
						controls
						className="max-w-full max-h-full mb-4"
						title={dfmvState.selectedMediaFilename.file}
						preload="metadata"
						autoPlay
						loop
					/>
				</div>
			)}
			{!dfmvState.selectedMedia && (
				<span className="text-white">Select media...</span>
			)}
		</section>
	);
}
