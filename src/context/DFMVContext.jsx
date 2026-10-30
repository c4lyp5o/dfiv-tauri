import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const dbReducerInitialState = {
	status: "Idle",
	message: "",
	progress: 0,
	isNuking: false,
};

export const dbReducer = (state, action) => {
	switch (action.type) {
		case "START_IMPORT":
			return {
				...state,
				status: "Importing",
				message: "Importing...",
				progress: 0,
			};
		case "IMPORT_PROGRESS":
			return {
				...state,
				status: "Importing",
				message: `Importing ${action.payload.inserted}/${action.payload.total} files`,
				progress: action.payload.percent,
			};
		case "IMPORT_SUCCESS":
			return {
				...state,
				status: "Imported",
				message: `Import complete: added ${action.payload.inserted} of ${action.payload.total} files`,
				progress: 100,
			};
		case "IMPORT_FAILURE":
			return {
				...state,
				status: "Error",
				message: `Import failed: ${action.payload}`,
			};
		case "REMOVE_SUCCESS":
			return {
				...state,
				status: "Removed",
				message: `Removed the ${action.payload.itemType} - ${action.payload.item}`,
			};
		case "REMOVE_FAILURE":
			return {
				...state,
				status: "Error",
				message: `Removed failed: ${action.payload}`,
			};
		case "NUKE_START":
			return {
				...state,
				status: "Nuking",
				message: "Nuking the database...",
				isNuking: true,
			};
		case "NUKE_SUCCESS":
			return {
				...state,
				status: "Nuked",
				message: "Database nuked",
				isNuking: false,
			};
		case "NUKE_FAILURE":
			return {
				...state,
				status: "Error",
				message: `Nuke failed: ${action.payload}`,
				isNuking: false,
			};
		default:
			return state;
	}
};

export const dfmvReducerInitialState = {
	appMode: false,
	allDrives: [],
	currentDrive: "",
	currentDir: "",
	prevDir: [],
	nextDir: [],
	selectedMedia: null,
	selectedMediaFilename: { name: "", path: "", type: "", index: 0 },
	infoBox: { visible: false, content: "" },
	contextMenu: { x: 0, y: 0, file: null },
	showSettings: false,
};

export const dfmvReducer = (state, action) => {
	switch (action.type) {
		case "TOGGLE_APP_MODE":
			return {
				...state,
				appMode: !state.appMode,
			};
		case "SET_DRIVES":
			return {
				...state,
				allDrives: action.payload,
			};
		case "SET_CURRENT_DRIVE":
			return {
				...state,
				currentDrive: action.payload,
			};
		case "SET_CURRENT_DIR":
			return {
				...state,
				currentDir: action.payload,
				// prevDir: [...state.prevDir, state.currentDir],
				// nextDir: [],
			};
		case "SET_PREV_DIR":
			return {
				...state,
				prevDir: action.payload,
			};
		case "SET_NEXT_DIR":
			return {
				...state,
				nextDir: action.payload,
			};
		case "SET_SELECTED_MEDIA":
			return {
				...state,
				selectedMedia: action.payload,
			};
		case "SET_SELECTED_MEDIA_FILENAME":
			return {
				...state,
				selectedMediaFilename: action.payload,
			};
		case "SET_INFO_BOX":
			return {
				...state,
				infoBox: action.payload,
			};
		case "SET_CONTEXT_MENU":
			return {
				...state,
				contextMenu: action.payload,
			};
		case "TOGGLE_SETTINGS":
			return {
				...state,
				showSettings: !state.showSettings,
				selectedMedia: null,
				selectedMediaFilename: { name: "", path: "", type: "", index: 0 },
				infoBox: { visible: false, content: "" },
			};
		case "RESET_MEDIA_AND_INFO":
			return {
				...state,
				selectedMedia: null,
				selectedMediaFilename: { name: "", path: "", type: "", index: 0 },
				infoBox: { visible: false, content: "" },
			};
		case "RESET_ALL":
			return {
				...state,
				currentDrive: "",
				currentDir: "",
				prevDir: [],
				nextDir: [],
				selectedMedia: null,
				selectedMediaFilename: { name: "", path: "", type: "", index: 0 },
				infoBox: { visible: false, content: "" },
			};
		default:
			return state;
	}
};

export const IMAGE_TYPES = [
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
export const AUDIO_TYPES = ["mp3", "wav", "ogg", "flac", "aac"];
export const VIDEO_TYPES = ["mp4", "webm", "mov", "avi", "mkv"];

/** "image" | "audio" | "video" for a file extension, or null if unsupported. */
export function mediaKind(type) {
	if (IMAGE_TYPES.includes(type)) return "image";
	if (AUDIO_TYPES.includes(type)) return "audio";
	if (VIDEO_TYPES.includes(type)) return "video";
	return null;
}

const DBContext = createContext();
const DFMVStateContext = createContext();
const DFMVDispatchContext = createContext();

export function DBProvider({ children }) {
	const [dbState, dbDispatch] = useReducer(dbReducer, dbReducerInitialState);
	const dbRef = useRef(null);

	const startImport = useCallback(async (folderPath) => {
		dbDispatch({ type: "START_IMPORT" });

		const unlisten = await listen("import-progress", (event) => {
			const { totalFound, processed } = event.payload;

			dbDispatch({
				type: "IMPORT_PROGRESS",
				payload: {
					inserted: processed,
					total: totalFound,
					percent: Math.round((processed / totalFound) * 100),
				},
			});
		});

		try {
			const { inserted, total } = await invoke("import_directory", {
				path: folderPath,
			});

			dbDispatch({
				type: "IMPORT_SUCCESS",
				payload: { inserted, total },
			});
		} catch (error) {
			console.error("Import failed:", error);
			dbDispatch({
				type: "IMPORT_FAILURE",
				payload: error,
			});
		} finally {
			unlisten();
		}
	}, []);

	const startRemove = useCallback(async (item, itemType) => {
		try {
			await invoke("remove", { item, itemType });
			dbDispatch({ type: "REMOVE_SUCCESS", payload: { item, itemType } });
			return true;
		} catch (error) {
			console.error("DB remove failed:", error);
			dbDispatch({ type: "REMOVE_FAILURE", payload: error });
			return false;
		}
	}, []);

	const startNukeDb = useCallback(async () => {
		dbDispatch({ type: "NUKE_START" });
		try {
			await invoke("nuke_db");
			dbDispatch({ type: "NUKE_SUCCESS" });
		} catch (error) {
			console.error("DB nuke failed:", error);
			dbDispatch({ type: "NUKE_FAILURE", payload: error });
		}
	}, []);

	const value = useMemo(
		() => ({
			dbState,
			dbDispatch,
			dbRef,
			startImport,
			startRemove,
			startNukeDb,
		}),
		[dbState, startImport, startRemove, startNukeDb],
	);

	return <DBContext.Provider value={value}>{children}</DBContext.Provider>;
}

export function DFMVProvider({ children }) {
	const [dfmvState, dfmvDispatch] = useReducer(
		dfmvReducer,
		dfmvReducerInitialState,
	);

	useEffect(() => {
		const initDrives = async () => {
			const allDrives = await invoke("get_all_drives");
			dfmvDispatch({
				type: "SET_DRIVES",
				payload: allDrives,
			});
		};
		initDrives();
	}, []);

	return (
		<DFMVDispatchContext.Provider value={dfmvDispatch}>
			<DFMVStateContext.Provider value={dfmvState}>
				{children}
			</DFMVStateContext.Provider>
		</DFMVDispatchContext.Provider>
	);
}

export function useDBContext() {
	return useContext(DBContext);
}

export function useDFMVContext() {
	return {
		dfmvState: useContext(DFMVStateContext),
		dfmvDispatch: useContext(DFMVDispatchContext),
		IMAGE_TYPES,
		AUDIO_TYPES,
		VIDEO_TYPES,
	};
}
