import FileSidebar from "../components/FileExplorer/Sidebar";
import MediaSidebar from "../components/MediaManager/Sidebar";
import Viewer from "../components/Viewer";
import { useFileList } from "../context/FileListContext";

export default function Main() {
	const { appMode } = useFileList();

	return (
		<div className="flex h-screen">
			{!appMode && <FileSidebar />}
			{appMode && <MediaSidebar />}
			<Viewer />
		</div>
	);
}
