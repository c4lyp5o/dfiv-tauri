import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileList } from "../context/FileListContext";

import Options from "./Options";

export default function Viewer() {
	const { selectedImage, imgSrc, setImgSrc } = useFileList();

	const [zoom, setZoom] = useState(1);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [dragging, setDragging] = useState(false);
	const [start, setStart] = useState({ x: 0, y: 0 });
	const containerRef = useRef();

	useEffect(() => {
		(async () => {
			setZoom(1);
			setOffset({ x: 0, y: 0 });
			if (selectedImage) {
				const b64 = await invoke("read_image_as_data_url", {
					path: selectedImage,
				});
				setImgSrc(b64);
			} else {
				setImgSrc(null);
			}
		})();
	}, [selectedImage, setImgSrc]);

	const handleWheel = (e) => {
		if (e.deltaY < 0) {
			setZoom((z) => Math.min(z * 1.1, 10)); // max zoom 10x
		} else {
			setZoom((z) => Math.max(z / 1.1, 0.1)); // min zoom 0.1x
		}
	};

	const handleMouseDown = (e) => {
		if (!imgSrc) return;
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
			aria-label="Image viewer"
		>
			<Options />
			{imgSrc ? (
				<img
					src={imgSrc}
					alt="selected"
					draggable={false}
					className="transition-transform duration-75"
					style={{
						transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
						cursor: dragging ? "grabbing" : "grab",
						userSelect: "none",
					}}
				/>
			) : (
				<span className="text-white">Select an image...</span>
			)}
		</section>
	);
}
