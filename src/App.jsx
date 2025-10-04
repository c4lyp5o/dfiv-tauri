import { FileListProvider } from "./context/FileListContext";
import Main from "./views/Main";
import "./App.css";

export default function App() {
	return (
		<FileListProvider>
			<Main />
		</FileListProvider>
	);
}
