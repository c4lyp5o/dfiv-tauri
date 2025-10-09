import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

const icons = {
	success: <CheckCircle size={14} className="text-green-500 shrink-0" />,
	error: <XCircle size={14} className="text-red-500 shrink-0" />,
	warning: <AlertTriangle size={14} className="text-yellow-500 shrink-0" />,
	info: <Info size={14} className="text-slate-500 shrink-0" />,
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

	const removeToast = (id) => {
		setToasts((prev) =>
			prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
		);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 300);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: false
	const showToast = useCallback((message, type = "info", duration = 2500) => {
		const id = Date.now();
		setToasts((prev) => [...prev, { id, message, type, exiting: false }]);
		setTimeout(() => removeToast(id), duration);
	}, []);

	const placementClass =
		placementClasses[placement] || placementClasses["top-right"];

	return (
		<ToastContext.Provider value={{ showToast }}>
			{children}
			<div
				className={`fixed z-50 flex flex-col gap-2 ${placementClass} transition-transform`}
			>
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm shadow-md border transition-all duration-300 ${
							toast.exiting
								? "opacity-0 translate-x-5"
								: "opacity-100 translate-x-0"
						} ${
							toast.type === "success"
								? "border-green-200 bg-green-50 text-green-700"
								: toast.type === "error"
									? "border-red-200 bg-red-50 text-red-700"
									: toast.type === "warning"
										? "border-yellow-200 bg-yellow-50 text-yellow-700"
										: "border-slate-200 bg-white text-slate-700"
						}`}
					>
						{icons[toast.type] ?? icons.info}
						<span className="flex-1 leading-tight">{toast.message}</span>
						<button
							type="button"
							onClick={() => removeToast(toast.id)}
							className="text-slate-400 hover:text-slate-600 transition-colors"
						>
							<X size={12} />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};
