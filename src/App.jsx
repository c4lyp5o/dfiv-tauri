import { useState } from "react";
import FileSidebar from "./components/FileExplorer/Sidebar";
import MediaSidebar from "./components/MediaManager/Sidebar";
import Viewer from "./components/Viewer";
import { FileListProvider } from "./context/FileListContext";
import "./App.css";

export default function App() {
	const [appMode, setAppMode] = useState(false);

	const props = {
		appMode,
		setAppMode,
	};

	return (
		<FileListProvider>
			<div className="flex h-screen">
				{!appMode && <FileSidebar {...props} />}
				{appMode && <MediaSidebar {...props} />}
				<Viewer />
			</div>
		</FileListProvider>
	);
}
