import Database from "@tauri-apps/plugin-sql";
import useSWR from "swr";

let db = null;
const fetchSavedMedia = async () => {
	try {
		if (!db) {
			db = await Database.load("sqlite:dfiv.db");
		}
		return await db.select("SELECT * FROM media;");
	} catch (err) {
		throw new Error(`Failed to fetch media: ${err.message}`);
	}
};

const useDb = (refreshInterval = 5000) => {
	return useSWR("media-list", fetchSavedMedia, { refreshInterval });
};

export default useDb;
