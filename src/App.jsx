import Sidebar from "./components/Sidebar";
import Viewer from "./components/Viewer";
import { FileListProvider } from "./context/FileListContext";
import "./App.css";

export default function App() {
	return (
		<FileListProvider>
			<div className="flex h-screen">
				<Sidebar />
				<Viewer />
			</div>
		</FileListProvider>
	);
}
