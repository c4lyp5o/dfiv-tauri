import { DFMVProvider } from "./context/DFMVContext";
import { ToastProvider } from "./context/ToastContext";
import Main from "./views/Main";
import "./App.css";

export default function App() {
	return (
		<DFMVProvider>
			<ToastProvider placement="bottom-right">
				<Main />
			</ToastProvider>
		</DFMVProvider>
	);
}
