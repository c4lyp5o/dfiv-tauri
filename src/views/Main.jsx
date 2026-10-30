import { memo } from "react";

import { useDFMVContext } from "../context/DFMVContext";

import FileSidebar from "../components/FileExplorer/Sidebar";
import MediaSidebar from "../components/MediaManager/Sidebar";
import Viewer from "../components/Viewer";
import Settings from "../components/Settings";
import BottomButtons from "../components/BottomButtons";

const MemoedViewer = memo(Viewer);
const MemoedSettings = memo(Settings);
const MemoedFileSidebar = memo(FileSidebar);
const MemoedMediaSidebar = memo(MediaSidebar);
const MemoedBottomButtons = memo(BottomButtons);

function SidebarSwitch() {
	const { dfmvState } = useDFMVContext();
	return dfmvState.appMode ? <MemoedMediaSidebar /> : <MemoedFileSidebar />;
}

function ContentSwitch() {
	const { dfmvState } = useDFMVContext();
	return dfmvState.showSettings ? <MemoedSettings /> : <MemoedViewer />;
}

export default function Main() {
	return (
		<div className="flex h-screen">
			<div className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-50 outline-0">
				<div className="flex-1 overflow-y-auto">
					<SidebarSwitch />
				</div>
				<MemoedBottomButtons />
			</div>
			<ContentSwitch />
		</div>
	);
}
