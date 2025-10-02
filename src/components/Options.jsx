import { invoke } from "@tauri-apps/api/core";
import { useFileList } from "../context/FileListContext";

export default function Options() {
	const { setCurrentFiles, currentDir, selectedImage, imgSrc, setImgSrc } =
		useFileList();

	const handleDelete = async () => {
		if (selectedImage) {
			setImgSrc(null);
			await invoke("delete_file", { path: selectedImage });
			const folder = await invoke("read_folder", { dir: currentDir });
			setCurrentFiles(folder);
		}
	};

	const handleInfo = () => {
		if (!selectedImage) {
			alert("No image loaded.");
			return;
		}

		// Extract base64 info
		const match = imgSrc.match(/^data:(image\/[\w+]+);base64,(.*)$/);
		if (!match) {
			alert("Invalid image data.");
			return;
		}
		const mime = match[1];
		const b64 = match[2];
		const sizeKB = (b64.length * 3) / 4 / 1024;

		// Create an image to get dimensions
		const img = new window.Image();
		img.onload = () => {
			alert(
				`Type: ${mime}\nSize: ${sizeKB.toFixed(1)} KB\nDimensions: ${img.width} x ${img.height}`,
			);
		};
		img.onerror = () => {
			alert(
				`Type: ${mime}\nSize: ${sizeKB.toFixed(1)} KB\nDimensions: Unknown`,
			);
		};
		img.src = imgSrc;
	};

	return (
		<div className="absolute top-2 right-2 z-20 flex gap-2 bg-black/60 rounded p-1 shadow-lg">
			<button
				type="button"
				className={`rounded px-2 py-1 transition-colors ${
					imgSrc === null
						? "bg-gray-400 text-gray-200 cursor-not-allowed"
						: "text-white hover:bg-red-600 bg-red-500"
				}`}
				title="Delete"
				disabled={imgSrc === null}
				onClick={handleDelete}
			>
				🗑️
			</button>
			<button
				type="button"
				className={`rounded px-2 py-1 transition-colors ${
					imgSrc === null
						? "bg-gray-400 text-gray-200 cursor-not-allowed"
						: "text-white hover:bg-blue-600 bg-blue-500"
				}`}
				title="Info"
				disabled={imgSrc === null}
				onClick={handleInfo}
			>
				ℹ️
			</button>
		</div>
	);
}
