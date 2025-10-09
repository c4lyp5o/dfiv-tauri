import { DFMVProvider } from "./context/DFMVContext";
import Main from "./views/Main";
import "./App.css";

export default function App() {
	return (
		<DFMVProvider>
			<Main />
		</DFMVProvider>
	);
}
