import { invoke } from "@tauri-apps/api/core";
import { useFileList } from "../context/FileListContext";
import useFolder from "../hooks/useFolder";

export default function Options() {
	const {
		currentDir,
		selectedMedia,
		setSelectedMedia,
		selectedMediaFilename,
		setSelectedMediaFilename,
		IMAGE_TYPES,
	} = useFileList();

	const { mutate } = useFolder(currentDir, 5000);

	const handleDelete = async () => {
		if (selectedMedia) {
			setSelectedMedia(null);
			await invoke("delete_file", { path: selectedMediaFilename.path });
			setSelectedMediaFilename({ name: "", path: "", type: "", index: 0 });
			mutate();
		}
	};

	const handleInfo = () => {
		if (!selectedMedia) {
			alert("No image loaded.");
			return;
		}

		if (!IMAGE_TYPES.includes(selectedMediaFilename.type.toLowerCase())) {
			alert("Info is only available for image files.");
			return;
		}

		const img = new window.Image();
		img.onload = () => {
			alert(
				`File: ${selectedMediaFilename.name}\nDimensions: ${img.width} x ${img.height}\nType: ${img.src
					.split(".")
					.pop()
					.toUpperCase()}`,
			);
		};
		img.onerror = (err) => {
			console.error("Image load error:", err);
			alert("Failed to load image info.");
		};
		img.src = selectedMedia;
	};

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
			<button
				type="button"
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
		</div>
	);
}
