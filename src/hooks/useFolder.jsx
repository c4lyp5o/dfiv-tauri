import { invoke } from "@tauri-apps/api/core";
import useSWR from "swr";

const fetchFolder = async (dir) => {
	if (!dir) return [];
	return await invoke("read_folder", { dir });
};

const useFolder = (dir, refreshInterval = 5000) => {
	return useSWR(dir, fetchFolder, { refreshInterval });
};

export default useFolder;
