import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSWRConfig } from "swr";

import { useDBContext, useDFMVContext } from "../../context/DFMVContext";

import useFolder from "../../hooks/useFolder";

export default function Options() {
	const { startRemove } = useDBContext();
	const { dfmvState, dfmvDispatch, IMAGE_TYPES } = useDFMVContext();
	const { mutate } = useSWRConfig();

	const { mutate: mutateFolder } = useFolder(dfmvState.currentDir, 5000);

	const infoBtnRef = useRef(null);

	const revalidateMedia = () => {
		mutate(
			(key) => Array.isArray(key) && key[0]?.startsWith?.("media-"),
			undefined,
			{ revalidate: true },
		);
		mutate("media-stats");
	};

	const handleDelete = async () => {
		if (!dfmvState.selectedMedia) return;

		dfmvDispatch({ type: "SET_SELECTED_MEDIA", payload: null });

		if (!dfmvState.appMode) {
			await invoke("delete_file", {
				path: dfmvState.selectedMediaFilename.path,
			});
			mutateFolder();
		} else {
			await startRemove(dfmvState.selectedMediaFilename.path, "file");
			revalidateMedia();
		}

		dfmvDispatch({
			type: "SET_SELECTED_MEDIA_FILENAME",
			payload: { name: "", path: "", type: "", index: 0 },
		});
		handleCloseInfo();
	};

	const handleInfo = () => {
		if (!dfmvState.selectedMedia) return;
		if (
			!IMAGE_TYPES.includes(dfmvState.selectedMediaFilename.type.toLowerCase())
		)
			return;
		if (dfmvState.infoBox.visible) {
			handleCloseInfo();
			return;
		}

		const img = new window.Image();
		img.onload = () => {
			dfmvDispatch({
				type: "SET_INFO_BOX",
				payload: {
					visible: true,
					content: `File: ${dfmvState.selectedMediaFilename.name}\nDimensions: ${img.width} x ${img.height}\nType: ${img.src.split(".").pop().toUpperCase()}`,
				},
			});
		};
		img.onerror = () => {
			dfmvDispatch({
				type: "SET_INFO_BOX",
				payload: { visible: true, content: "Failed to load image info." },
			});
		};
		img.src = dfmvState.selectedMedia;
	};

	const handleCloseInfo = () =>
		dfmvDispatch({
			type: "SET_INFO_BOX",
			payload: { visible: false, content: "" },
		});

	return (
		<div className="absolute top-2 right-2 z-20 flex gap-2 bg-black/60 rounded p-1 shadow-lg">
			<button
				type="button"
				className={`rounded px-2 py-1 transition-colors ${
					dfmvState.selectedMedia === null
						? "bg-gray-400 text-gray-200 cursor-not-allowed"
						: "text-white hover:bg-red-600 bg-red-500"
				}`}
				title="Delete"
				disabled={dfmvState.selectedMedia === null}
				onClick={handleDelete}
			>
				🗑️
			</button>
			<div className="relative" style={{ display: "inline-block" }}>
				<button
					type="button"
					ref={infoBtnRef}
					className={`rounded px-2 py-1 transition-colors ${
						dfmvState.selectedMedia === null ||
						!IMAGE_TYPES.includes(
							dfmvState.selectedMediaFilename.type.toLowerCase(),
						)
							? "bg-gray-400 text-gray-200 cursor-not-allowed"
							: "text-white hover:bg-blue-600 bg-blue-500"
					}`}
					title="Info (only for images)"
					disabled={
						dfmvState.selectedMedia === null ||
						!IMAGE_TYPES.includes(
							dfmvState.selectedMediaFilename.type.toLowerCase(),
						)
					}
					onClick={handleInfo}
				>
					ℹ️
				</button>

				{dfmvState.infoBox.visible && (
					<div
						className="absolute right-0 mt-2 min-w-45 bg-white text-black text-xs rounded shadow-lg p-2 border border-gray-300 whitespace-pre z-50"
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
						{dfmvState.infoBox.content}
					</div>
				)}
			</div>
		</div>
	);
}
