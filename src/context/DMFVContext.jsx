import {
	createContext,
	useContext,
	useState,
	useEffect,
	useReducer,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import DbWorker from "../utils/dbWorker?worker";

const initialState = {
	status: "idle",
	message: "",
};

const dbReducer = (state, action) => {
	switch (action.type) {
		case "START_IMPORT":
			return { ...state, status: "importing", message: "Importing..." };
		case "IMPORT_SUCCESS":
			return { ...state, status: "imported", message: "Import successful" };
		case "IMPORT_FAILURE":
			return { ...state, status: "error", message: "Import failed" };
		default:
			return state;
	}
};

const DFMVContext = createContext();

export function DMFVProvider({ children }) {
	const [state, dispatch] = useReducer(dbReducer, initialState);
	const [appMode, setAppMode] = useState(false);
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
	const [showSettings, setShowSettings] = useState(false);
	const [database, setDatabase] = useState(null);

	const dbWorkerRef = useRef(null);

	const resetMediaAndInfo = () => {
		setSelectedMedia(null);
		setSelectedMediaFilename({ name: "", path: "", type: "", index: 0 });
		setInfoBox({ visible: false, content: "" });
	};

	const resetMediaInfoHistory = () => {
		setDrives({ ...drives, currentDrive: "" });
		setCurrentDir("");
		setPrevDir([]);
		setNextDir([]);
		setSelectedMedia(null);
		setSelectedMediaFilename({ name: "", path: "", type: "", index: 0 });
		setInfoBox({ visible: false, content: "" });
	};

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

	useEffect(() => {
		const init = async () => {
			try {
				const db = await Database.load("sqlite:dfiv.db");
				setDatabase(db);
				const allDrives = await invoke("get_all_drives");
				setDrives({ ...drives, allDrives });
				dbWorkerRef.current = new DbWorker();
				dbWorkerRef.current.onmessage = (e) => {
					dispatch(e.data);
				};
			} catch (err) {
				console.error("init failed ❌:", err);
			}
		};
		init();

		return () => {
			dbWorkerRef.current?.terminate();
		};
	}, []);

	return (
		<DFMVContext.Provider
			value={{
				state,
				dispatch,
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
				showSettings,
				setShowSettings,
				database,
				resetMediaAndInfo,
				resetMediaInfoHistory,
				IMAGE_TYPES,
				AUDIO_TYPES,
				VIDEO_TYPES,
			}}
		>
			{children}
		</DFMVContext.Provider>
	);
}

export function useDMFVContext() {
	return useContext(DFMVContext);
}
