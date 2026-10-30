import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const EXIT_ANIMATION_MS = 300;

const icons = {
	success: <CircleCheck size={15} className="shrink-0 text-emerald-400" />,
	error: <CircleX size={15} className="shrink-0 text-red-400" />,
	warning: <TriangleAlert size={15} className="shrink-0 text-amber-400" />,
	info: <Info size={15} className="shrink-0 text-sky-400" />,
};

// Map placement prop -> Tailwind positioning classes
const placementClasses = {
	"top-right": "top-4 right-4 items-end",
	"top-left": "top-4 left-4 items-start",
	"top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
	"bottom-right": "bottom-4 right-4 items-end",
	"bottom-left": "bottom-4 left-4 items-start",
	"bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
	center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center",
	"center-bottom": "bottom-12 left-1/2 -translate-x-1/2 items-center",
};

export const ToastProvider = ({ children, placement = "top-right" }) => {
	const [toasts, setToasts] = useState([]);
	const nextId = useRef(0);

	const removeToast = useCallback((id) => {
		setToasts((prev) =>
			prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
		);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, EXIT_ANIMATION_MS);
	}, []);

	const showToast = useCallback(
		(message, type = "info", duration = 2500) => {
			nextId.current += 1;
			const id = nextId.current;
			setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
			setTimeout(() => removeToast(id), duration);
		},
		[removeToast],
	);

	const placementClass =
		placementClasses[placement] || placementClasses["top-right"];

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div
				className={`pointer-events-none fixed z-50 flex flex-col gap-2 ${placementClass}`}
			>
				{toasts.map((toast) => (
					<div
						key={toast.id}
						role="status"
						className={`pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg border border-line bg-surface-2/95 px-3 py-2 text-[13px] text-fg shadow-xl shadow-black/40 backdrop-blur transition-all duration-300 ${
							toast.exiting
								? "translate-x-5 opacity-0"
								: "translate-x-0 opacity-100"
						}`}
					>
						{icons[toast.type] ?? icons.info}
						<span className="flex-1 leading-snug">{toast.message}</span>
						<button
							type="button"
							aria-label="Dismiss"
							onClick={() => removeToast(toast.id)}
							className="rounded p-0.5 text-fg-subtle transition-colors hover:text-fg"
						>
							<X size={12} />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};
