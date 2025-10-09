import {
	createContext,
	useContext,
	useEffect,
	useReducer,
	useRef,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";
import DbWorker from "../utils/dbWorker?worker";

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
				message: `Imported ${action.payload.inserted}/${action.payload.total} files`,
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
				status: "error",
				message: `Import failed: ${action.payload}`,
			};
		case "NUKE_DB":
			return {
				...state,
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

const DFMVContext = createContext();

export function DFMVProvider({ children }) {
	const [dbState, dbDispatch] = useReducer(dbReducer, dbReducerInitialState);
	const [dfmvState, dfmvDispatch] = useReducer(
		dfmvReducer,
		dfmvReducerInitialState,
	);

	const dbRef = useRef(null);
	const dbWorkerRef = useRef(null);

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
				await db.execute("PRAGMA journal_mode = WAL");
				dbRef.current = db;
				const allDrives = await invoke("get_all_drives");
				dfmvDispatch({
					type: "SET_DRIVES",
					payload: allDrives,
				});
				dbWorkerRef.current = new DbWorker();
				dbWorkerRef.current.onmessage = async (e) => {
					const { type, payload } = e.data;

					if (type === "NEED_DB_EXECUTE") {
						const { query, params } = payload;
						console.log("query", query);
						console.log("params", params);
						await dbRef.current.execute(query, params);
						dbWorkerRef.current.postMessage({ type: "EXECUTE_DONE" });
					}

					if (type === "PROGRESS") {
						dbDispatch({
							type: "IMPORT_PROGRESS",
							payload,
						});
					}

					if (type === "COMPLETE") {
						dbDispatch({
							type: "IMPORT_SUCCESS",
							payload,
						});
					}

					if (type === "ERROR") {
						dbDispatch({
							type: "IMPORT_FAILURE",
							payload: payload.error,
						});
					}

					if (type === "NEED_NUKE_DB") {
						await dbRef.current.execute("DELETE FROM media");
						dbDispatch({ type: "NUKE_DB" });
					}
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

	const startImport = (files) => {
		dbDispatch({ type: "START_IMPORT" });
		dbWorkerRef.current.postMessage({
			type: "START_IMPORT",
			payload: { files },
		});
	};

	const startRemove = (item, type) => {
		dbWorkerRef.current.postMessage({
			type: "START_REMOVE",
			payload: { item, type },
		});
	};
	const startNukeDb = async () => {
		dbDispatch({ type: "NUKE_DB" });
		setTimeout(
			() => dbWorkerRef.current.postMessage({ type: "NUKE_DB" }),
			5000,
		);
	};

	return (
		<DFMVContext.Provider
			value={{
				// reducers
				dbState,
				dbDispatch,
				dfmvState,
				dfmvDispatch,
				// refs
				dbRef,
				dbWorkerRef,
				// commands
				startImport,
				startRemove,
				startNukeDb,
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

export function useDFMVContext() {
	return useContext(DFMVContext);
}
