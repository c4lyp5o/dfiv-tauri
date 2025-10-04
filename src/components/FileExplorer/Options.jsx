import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileList } from "../../context/FileListContext";
import useFolder from "../../hooks/useFolder";

export default function Options() {
	const {
		currentDir,
		selectedMedia,
		setSelectedMedia,
		selectedMediaFilename,
		setSelectedMediaFilename,
		infoBox,
		setInfoBox,
		IMAGE_TYPES,
	} = useFileList();

	const { mutate } = useFolder(currentDir, 5000);
	const infoBtnRef = useRef(null);

	const handleDelete = async () => {
		if (selectedMedia) {
			setSelectedMedia(null);
			await invoke("delete_file", { path: selectedMediaFilename.path });
			setSelectedMediaFilename({ name: "", path: "", type: "", index: 0 });
			mutate();
		}
	};

	const handleInfo = () => {
		if (!selectedMedia) return;
		if (!IMAGE_TYPES.includes(selectedMediaFilename.type.toLowerCase())) return;
		if (infoBox.visible) {
			setInfoBox({ visible: false, content: "" });
			return;
		}

		const img = new window.Image();
		img.onload = () => {
			setInfoBox({
				visible: true,
				content: `File: ${selectedMediaFilename.name}\nDimensions: ${img.width} x ${img.height}\nType: ${img.src
					.split(".")
					.pop()
					.toUpperCase()}`,
			});
		};
		img.onerror = () => {
			setInfoBox({ visible: true, content: "Failed to load image info." });
		};
		img.src = selectedMedia;
	};

	const handleCloseInfo = () => setInfoBox({ visible: false, content: "" });

	return (
		<div className="absolute top-2 right-2 z-20 flex gap-2 bg-black/60 rounded p-1 shadow-lg">
			<button
				type="button"
				className={`rounded px-2 py-1 transition-colors ${
					selectedMedia === null
						? "bg-gray-400 text-gray-200 cursor-not-allowed"
						: "text-white hover:bg-red-600 bg-red-500"
				}`}
				title="Delete"
				disabled={selectedMedia === null}
				onClick={handleDelete}
			>
				🗑️
			</button>
			<div className="relative" style={{ display: "inline-block" }}>
				<button
					type="button"
					ref={infoBtnRef}
					className={`rounded px-2 py-1 transition-colors ${
						selectedMedia === null ||
						!IMAGE_TYPES.includes(selectedMediaFilename.type.toLowerCase())
							? "bg-gray-400 text-gray-200 cursor-not-allowed"
							: "text-white hover:bg-blue-600 bg-blue-500"
					}`}
					title="Info (only for images)"
					disabled={
						selectedMedia === null ||
						!IMAGE_TYPES.includes(selectedMediaFilename.type.toLowerCase())
					}
					onClick={handleInfo}
				>
					ℹ️
				</button>
				{infoBox.visible && (
					<div
						className="absolute right-0 mt-2 min-w-[180px] bg-white text-black text-xs rounded shadow-lg p-2 border border-gray-300 whitespace-pre z-50"
						style={{ top: "100%" }}
					>
						<button
							type="button"
							onClick={handleCloseInfo}
							className="absolute top-1 right-1 text-gray-400 hover:text-gray-700 text-xs"
							title="Close"
						>
							×
						</button>
						{infoBox.content}
					</div>
				)}
			</div>
		</div>
	);
}
