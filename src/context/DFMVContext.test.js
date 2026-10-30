import { describe, expect, test } from "vitest";

import {
	dbReducer,
	dbReducerInitialState,
	dfmvReducer,
	dfmvReducerInitialState,
} from "./DFMVContext";

const EMPTY_SELECTION = { name: "", path: "", type: "", index: 0 };

describe("dbReducer", () => {
	test("START_IMPORT resets progress and marks importing", () => {
		const state = dbReducer(
			{ ...dbReducerInitialState, progress: 80 },
			{ type: "START_IMPORT" },
		);

		expect(state.status).toBe("Importing");
		expect(state.progress).toBe(0);
	});

	test("IMPORT_PROGRESS reports processed count and percent", () => {
		const state = dbReducer(dbReducerInitialState, {
			type: "IMPORT_PROGRESS",
			payload: { inserted: 50, total: 200, percent: 25 },
		});

		expect(state.message).toBe("Importing 50/200 files");
		expect(state.progress).toBe(25);
	});

	test("IMPORT_SUCCESS reports new files out of files found", () => {
		const state = dbReducer(dbReducerInitialState, {
			type: "IMPORT_SUCCESS",
			payload: { inserted: 0, total: 1240 },
		});

		expect(state.status).toBe("Imported");
		expect(state.message).toBe("Import complete: added 0 of 1240 files");
		expect(state.progress).toBe(100);
	});

	test("nuke actions set and clear isNuking", () => {
		const started = dbReducer(dbReducerInitialState, { type: "NUKE_START" });
		expect(started).toMatchObject({ status: "Nuking", isNuking: true });

		const done = dbReducer(started, { type: "NUKE_SUCCESS" });
		expect(done).toMatchObject({ status: "Nuked", isNuking: false });

		const failed = dbReducer(started, {
			type: "NUKE_FAILURE",
			payload: "disk full",
		});
		expect(failed).toMatchObject({
			status: "Error",
			message: "Nuke failed: disk full",
			isNuking: false,
		});
	});

	test("unknown actions return the same state", () => {
		expect(dbReducer(dbReducerInitialState, { type: "NOPE" })).toBe(
			dbReducerInitialState,
		);
	});
});

describe("dfmvReducer", () => {
	const withSelection = {
		...dfmvReducerInitialState,
		currentDrive: "C:\\",
		currentDir: "C:\\photos",
		prevDir: ["C:\\"],
		selectedMedia: "asset://a.jpg",
		selectedMediaFilename: { name: "a.jpg", path: "C:\\a.jpg", type: "jpg", index: 3 },
		infoBox: { visible: true, content: "info" },
	};

	test("TOGGLE_APP_MODE flips between explorer and library", () => {
		const library = dfmvReducer(dfmvReducerInitialState, {
			type: "TOGGLE_APP_MODE",
		});
		expect(library.appMode).toBe(true);
		expect(dfmvReducer(library, { type: "TOGGLE_APP_MODE" }).appMode).toBe(false);
	});

	test("TOGGLE_SETTINGS clears the current selection", () => {
		const state = dfmvReducer(withSelection, { type: "TOGGLE_SETTINGS" });

		expect(state.showSettings).toBe(true);
		expect(state.selectedMedia).toBeNull();
		expect(state.selectedMediaFilename).toEqual(EMPTY_SELECTION);
		expect(state.infoBox.visible).toBe(false);
		expect(state.currentDir).toBe("C:\\photos");
	});

	test("RESET_ALL clears navigation and selection", () => {
		const state = dfmvReducer(withSelection, { type: "RESET_ALL" });

		expect(state).toMatchObject({
			currentDrive: "",
			currentDir: "",
			prevDir: [],
			nextDir: [],
			selectedMedia: null,
			selectedMediaFilename: EMPTY_SELECTION,
		});
	});

	test("does not mutate the previous state", () => {
		const before = structuredClone(withSelection);
		dfmvReducer(withSelection, { type: "RESET_ALL" });
		expect(withSelection).toEqual(before);
	});
});
