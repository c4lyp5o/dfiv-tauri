import { describe, expect, test } from "vitest";

import { mediaKind } from "../context/DFMVContext";
import { baseName, dirName, formatBytes, formatCount } from "./format";

describe("formatBytes", () => {
	test.each([
		[0, "0 B"],
		[undefined, "0 B"],
		[512, "512 B"],
		[1536, "1.5 KB"],
		[5 * 1024 ** 3, "5 GB"],
		[3 * 1024 ** 5, "3072 TB"],
	])("%s -> %s", (bytes, expected) => {
		expect(formatBytes(bytes)).toBe(expected);
	});
});

describe("formatCount", () => {
	test("treats missing counts as zero", () => {
		expect(formatCount(undefined)).toBe("0");
	});

	test("groups digits", () => {
		expect(formatCount(1240)).toBe(new Intl.NumberFormat().format(1240));
	});
});

describe("baseName / dirName", () => {
	test.each([
		["C:\\Users\\me\\Pictures", "Pictures", "C:\\Users\\me"],
		["/home/me/Music/", "Music", "/home/me"],
		["/Volumes/Data/clip.mkv", "clip.mkv", "/Volumes/Data"],
	])("%s", (path, base, dir) => {
		expect(baseName(path)).toBe(base);
		expect(dirName(path.replace(/[\\/]$/, ""))).toBe(dir);
	});

	test("roots keep their name", () => {
		expect(baseName("C:\\")).toBe("C:");
		expect(baseName("/")).toBe("/");
	});
});

describe("mediaKind", () => {
	test.each([
		["jpg", "image"],
		["flac", "audio"],
		["mkv", "video"],
		["txt", null],
		["directory", null],
	])("%s -> %s", (type, expected) => {
		expect(mediaKind(type)).toBe(expected);
	});
});
