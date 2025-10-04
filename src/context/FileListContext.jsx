import { createContext, useContext, useState, useEffect } from "react";
import Database from "@tauri-apps/plugin-sql";

const FileListContext = createContext();

export function FileListProvider({ children }) {
	const [appMode, setAppMode] = useState("explorer");
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
	const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, file: null });
	const [database, setDatabase] = useState(null);

	const getFileExtension = (filename) => {
		const parts = filename.split(".");
		return parts.length > 1 ? parts.pop().toLowerCase() : "";
	};

	useEffect(() => {
		const loadDb = async () => {
			const db = await Database.load("sqlite:dfiv.db");
			setDatabase(db);
		};
		loadDb();
	}, []);

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
				appMode,
				setAppMode,
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
				contextMenu,
				setContextMenu,
				getFileExtension,
				database,
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
