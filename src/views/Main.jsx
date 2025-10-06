import FileSidebar from "../components/FileExplorer/Sidebar";
import MediaSidebar from "../components/MediaManager/Sidebar";
import Viewer from "../components/Viewer";
import Settings from "../components/Settings";
import BottomButtons from "../components/BottomButtons";
import { useDMFVContext } from "../context/DMFVContext";

export default function Main() {
	const { appMode, showSettings } = useDMFVContext();

	return (
		<div className="flex h-screen">
			<div className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-50 outline-0">
				<div className="flex-1 overflow-y-auto">
					{!appMode && <FileSidebar />}
					{appMode && <MediaSidebar />}
				</div>
				<BottomButtons />
			</div>
			{showSettings ? <Settings /> : <Viewer />}
		</div>
	);
}
