import { createContext, useContext, useState } from "react";

const FileListContext = createContext();

export function FileListProvider({ children }) {
	const [drives, setDrives] = useState({ allDrives: [], currentDrive: "" });
	const [currentDir, setCurrentDir] = useState("");
	const [prevDir, setPrevDir] = useState([]);
	const [nextDir, setNextDir] = useState([]);
	const [selectedMedia, setSelectedMedia] = useState(null);
	const [selectedMediaFilename, setSelectedMediaFilename] = useState({
		name: "",
		path: "",
		type: "",
		index: 0,
	});
	const [infoBox, setInfoBox] = useState({ visible: false, content: "" });

	const IMAGE_TYPES = [
		"jpg",
		"jpeg",
		"png",
		"gif",
		"bmp",
		"webp",
		"tiff",
		"svg",
		"avif",
		"heic",
	];
	const AUDIO_TYPES = ["mp3", "wav", "ogg", "flac", "aac"];
	const VIDEO_TYPES = ["mp4", "webm", "mov", "avi", "mkv"];

	return (
		<FileListContext.Provider
			value={{
				drives,
				setDrives,
				currentDir,
				setCurrentDir,
				prevDir,
				setPrevDir,
				nextDir,
				setNextDir,
				selectedMedia,
				setSelectedMedia,
				selectedMediaFilename,
				setSelectedMediaFilename,
				infoBox,
				setInfoBox,
				IMAGE_TYPES,
				AUDIO_TYPES,
				VIDEO_TYPES,
			}}
		>
			{children}
		</FileListContext.Provider>
	);
}

export function useFileList() {
	return useContext(FileListContext);
}
