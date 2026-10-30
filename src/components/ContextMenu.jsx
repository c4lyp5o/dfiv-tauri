import { useEffect, useRef } from "react";
import { FolderMinus, FolderPlus } from "lucide-react";

const MENU_WIDTH = 208;
const MENU_HEIGHT = 110;
const VIEWPORT_MARGIN = 8;

function MenuItem({ icon: Icon, isDanger = false, onClick, children }) {
	return (
		<button
			type="button"
			role="menuitem"
			onClick={onClick}
			className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
				isDanger
					? "text-red-300 hover:bg-red-500/15"
					: "text-fg hover:bg-surface-3"
			}`}
		>
			<Icon size={14} className="shrink-0" />
			{children}
		</button>
	);
}

export default function ContextMenu({ x, y, title, onClose, onAdd, onRemove }) {
	const menuRef = useRef(null);

	useEffect(() => {
		const handlePointerDown = (e) => {
			if (!menuRef.current?.contains(e.target)) onClose();
		};
		const handleKeyDown = (e) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [onClose]);

	// Keep the menu on screen near the window edges
	const left = Math.min(x, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN);
	const top = Math.min(y, window.innerHeight - MENU_HEIGHT - VIEWPORT_MARGIN);

	return (
		<div
			ref={menuRef}
			role="menu"
			className="fixed z-50 overflow-hidden rounded-lg border border-line bg-surface-2/95 p-1 shadow-2xl shadow-black/50 backdrop-blur"
			style={{ left, top, width: MENU_WIDTH }}
		>
			{title && (
				<div className="truncate px-2.5 pt-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
					{title}
				</div>
			)}
			{onAdd && (
				<MenuItem icon={FolderPlus} onClick={onAdd}>
					Add to library
				</MenuItem>
			)}
			<MenuItem icon={FolderMinus} isDanger onClick={onRemove}>
				Remove from library
			</MenuItem>
		</div>
	);
}
