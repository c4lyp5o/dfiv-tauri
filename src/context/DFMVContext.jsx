import {
	createContext,
	useContext,
	useEffect,
	useReducer,
	useRef,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import Database from "@tauri-apps/plugin-sql";

const dbReducerInitialState = {
	status: "Idle",
	message: "",
	progress: 0,
	isNuking: false,
};

const dbReducer = (state, action) => {
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
				message: `Import complete (${action.payload.inserted}/${action.payload.total})`,
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
		case "NUKE_DB":
			return {
				...state,
				status: !state.isNuking ? "Nuking" : "Nuked",
				message: !state.isNuking ? "Nuking the database..." : "Database nuked",
				isNuking: !state.isNuking,
			};
		default:
			return state;
	}
};

const dfmvReducerInitialState = {
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

const dfmvReducer = (state, action) => {
	console.log(action);
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

const DBContext = createContext();
const DFMVContext = createContext();

export function DBProvider({ children }) {
	const [dbState, dbDispatch] = useReducer(dbReducer, dbReducerInitialState);
	const dbRef = useRef(null);

	useEffect(() => {
		const initDb = async () => {
			try {
				const db = await Database.load("sqlite:dfiv.db");
				await db.execute("PRAGMA journal_mode = WAL");
				dbRef.current = db;
			} catch (err) {
				console.error("DB init failed ❌:", err);
			}
		};
		initDb();

		return () => {
			if (dbRef.current) {
				dbRef.current.close().catch(console.error);
			}
		};
	}, []);

	const startImport = async (folderPath) => {
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
			const totalImported = await invoke("import_directory", {
				path: folderPath,
			});

			dbDispatch({
				type: "IMPORT_SUCCESS",
				payload: { inserted: totalImported, total: totalImported },
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
	};

	const startRemove = async (item, itemType) => {
		try {
			await invoke("remove", { item, itemType });
			dbDispatch({ type: "REMOVE_SUCCESS", payload: { item, itemType } });
		} catch (error) {
			console.error("DB remove failed:", err);
			dbDispatch({ type: "REMOVE_FAILURE", payload: error });
		}
	};

	const startNukeDb = async () => {
		try {
			dbDispatch({ type: "NUKE_DB" });
			await invoke("nuke_db");
			await new Promise((resolve) => setTimeout(resolve, 5000));
		} catch (error) {
			console.error("DB nuke failed:", error);
		} finally {
			dbDispatch({ type: "NUKE_DB" });
		}
	};

	return (
		<DBContext.Provider
			value={{
				// reducers
				dbState,
				dbDispatch,
				// refs
				dbRef,
				// commands
				startImport,
				startRemove,
				startNukeDb,
			}}
		>
			{children}
		</DBContext.Provider>
	);
}

export function DFMVProvider({ children }) {
	const [dfmvState, dfmvDispatch] = useReducer(
		dfmvReducer,
		dfmvReducerInitialState,
	);

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
		<DFMVContext.Provider
			value={{
				// reducers
				dfmvState,
				dfmvDispatch,
				// constants
				IMAGE_TYPES,
				AUDIO_TYPES,
				VIDEO_TYPES,
			}}
		>
			{children}
		</DFMVContext.Provider>
	);
}

export function useDBContext() {
	return useContext(DBContext);
}

export function useDFMVContext() {
	return useContext(DFMVContext);
}
