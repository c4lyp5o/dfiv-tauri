import { DMFVProvider } from "./context/DMFVContext";
import Main from "./views/Main";
import "./App.css";

export default function App() {
	return (
		<DMFVProvider>
			<Main />
		</DMFVProvider>
	);
}
