import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";

export function useMediaStats() {
	return useSWR("media-stats", () => invoke("get_media_stats"), {
		refreshInterval: 5000,
		dedupingInterval: 4000,
	});
}

export function useMediaByType(types, enabled = true) {
	return useSWR(
		enabled ? ["media-by-type", ...types] : null,
		() => invoke("get_media_by_type", { types }),
		{ refreshInterval: 5000, dedupingInterval: 4000 },
	);
}

export function useMediaSearch(types, query, enabled = true) {
	return useSWR(
		enabled && query ? ["media-search", query, ...types] : null,
		() => invoke("search_media", { query, types }),
		{ dedupingInterval: 300 },
	);
}

/** Revalidates every library query (lists, searches and stats) after a change. */
export function useRevalidateMedia() {
	const { mutate } = useSWRConfig();
	return useCallback(
		() =>
			mutate(
				(key) =>
					key === "media-stats" ||
					(Array.isArray(key) && key[0]?.startsWith?.("media-")),
			),
		[mutate],
	);
}
