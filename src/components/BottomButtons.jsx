import { useDMFVContext } from "../context/DMFVContext";

export default function BottomButtons() {
	const { showSettings, setShowSettings } = useDMFVContext();

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: false
		// biome-ignore lint/a11y/useKeyWithClickEvents: false
		<section
			onClick={() => setShowSettings(!showSettings)}
			className="w-64 h-8 bg-neutral-300 flex items-center justify-center gap-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-5 w-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				strokeWidth={2}
			>
				<title>Settings</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.591 1.048c1.518-.878 3.304.908 2.426 2.426a1.724 1.724 0 001.048 2.591c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.048 2.591c.878 1.518-.908 3.304-2.426 2.426a1.724 1.724 0 00-2.591 1.048c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.591-1.048c-1.518.878-3.304-.908-2.426-2.426a1.724 1.724 0 00-1.048-2.591c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.048-2.591c-.878-1.518.908-3.304 2.426-2.426.957.554 2.165.21 2.591-1.048z"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
		</section>
	);
}
