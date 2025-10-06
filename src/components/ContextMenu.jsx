export default function ContextMenu({
	appMode,
	x,
	y,
	onClose,
	onAdd,
	onRemove,
}) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: false
		// biome-ignore lint/a11y/useKeyWithClickEvents: false
		<div
			className="absolute z-50 w-48 rounded-md border border-slate-300 bg-white shadow-lg"
			style={{ top: y, left: x }}
			onClick={onClose} // close when clicking inside
		>
			{!appMode && (
				<button
					type="button"
					className="block w-full px-4 py-2 text-left text-xs hover:bg-slate-100"
					onClick={onAdd}
				>
					➕ Add to Media Collection
				</button>
			)}
			<button
				type="button"
				className="block w-full px-4 py-2 text-left text-xs hover:bg-slate-100"
				onClick={onRemove}
			>
				❌ Remove from Media Collection
			</button>
		</div>
	);
}
