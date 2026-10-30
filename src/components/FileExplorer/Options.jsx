import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Info, Trash2 } from "lucide-react";

import {
	mediaKind,
	useDBContext,
	useDFMVContext,
} from "../../context/DFMVContext";
import { useToast } from "../../context/ToastContext";

import useFolder from "../../hooks/useFolder";
import { useRevalidateMedia } from "../../hooks/useMediaQuery";
import { dirName } from "../../utils/format";

import { FileTypeIcon } from "../ui";

const CONFIRM_TIMEOUT_MS = 3000;

function ToolbarButton({ label, isActive = false, onClick, children }) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={isActive}
			onClick={onClick}
			className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
				isActive
					? "bg-white/15 text-white"
					: "text-white/75 hover:bg-white/10 hover:text-white"
			}`}
		>
			{children}
		</button>
	);
}

/** Floating top bar over the viewer: file name, zoom level and actions. */
export default function Options({ zoom, onResetZoom }) {
	const { startRemove } = useDBContext();
	const { dfmvState, dfmvDispatch } = useDFMVContext();
	const { showToast } = useToast();
	const revalidateMedia = useRevalidateMedia();
	const { mutate: mutateFolder } = useFolder(dfmvState.currentDir, 5000);

	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

	const { name, path, type } = dfmvState.selectedMediaFilename;
	const { infoBox } = dfmvState;
	const isImage = mediaKind(type) === "image";
	const isLibrary = dfmvState.appMode;
	const deleteLabel = isLibrary ? "Remove from library" : "Delete file";

	// Drop an unconfirmed delete after a few seconds
	useEffect(() => {
		if (!isConfirmingDelete) return;
		const id = setTimeout(() => setIsConfirmingDelete(false), CONFIRM_TIMEOUT_MS);
		return () => clearTimeout(id);
	}, [isConfirmingDelete]);

	const handleDelete = async () => {
		if (!isConfirmingDelete) {
			setIsConfirmingDelete(true);
			return;
		}
		dfmvDispatch({ type: "RESET_MEDIA_AND_INFO" });

		if (isLibrary) {
			const isRemoved = await startRemove(path, "file");
			revalidateMedia();
			if (isRemoved) showToast(`Removed ${name} from library`, "success");
			else showToast(`Couldn't remove ${name}`, "error");
			return;
		}

		try {
			await invoke("delete_file", { path });
			mutateFolder();
			showToast(`Deleted ${name}`, "success");
		} catch (error) {
			showToast(`Couldn't delete ${name}: ${error}`, "error");
		}
	};

	const closeInfo = () =>
		dfmvDispatch({
			type: "SET_INFO_BOX",
			payload: { visible: false, content: "" },
		});

	const showInfo = (rows) =>
		dfmvDispatch({ type: "SET_INFO_BOX", payload: { visible: true, content: rows } });

	const handleInfo = () => {
		if (infoBox.visible) {
			closeInfo();
			return;
		}
		const img = new window.Image();
		img.onload = () =>
			showInfo([
				["Name", name],
				["Dimensions", `${img.naturalWidth} × ${img.naturalHeight}`],
				["Type", type.toUpperCase()],
				["Location", dirName(path)],
			]);
		img.onerror = () => showInfo([["Error", "Couldn't read image details."]]);
		img.src = dfmvState.selectedMedia;
	};

	return (
		<div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 bg-linear-to-b from-black/60 to-transparent p-3">
			<div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-lg bg-black/45 px-3 py-1.5 backdrop-blur-md">
				<FileTypeIcon type={type} size={14} />
				<span className="truncate text-[13px] font-medium text-white" title={path}>
					{name}
				</span>
				<span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
					{type}
				</span>
			</div>

			<div className="pointer-events-auto relative flex shrink-0 items-center gap-0.5 rounded-lg bg-black/45 p-1 backdrop-blur-md">
				{zoom != null && Math.abs(zoom - 1) > 0.01 && (
					<button
						type="button"
						title="Reset zoom (double-click the image)"
						onClick={onResetZoom}
						className="h-7 rounded-md px-2 text-[11px] font-medium tabular-nums text-white/80 hover:bg-white/10 hover:text-white"
					>
						{Math.round(zoom * 100)}%
					</button>
				)}
				{isImage && (
					<ToolbarButton
						label="Image details"
						isActive={infoBox.visible}
						onClick={handleInfo}
					>
						<Info size={15} />
					</ToolbarButton>
				)}
				<button
					type="button"
					title={deleteLabel}
					aria-label={isConfirmingDelete ? `Confirm: ${deleteLabel}` : deleteLabel}
					onClick={handleDelete}
					className={`inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium transition-colors ${
						isConfirmingDelete
							? "bg-red-500 px-2.5 text-white hover:bg-red-600"
							: "text-white/75 hover:bg-red-500/80 hover:text-white"
					}`}
				>
					<Trash2 size={15} />
					{isConfirmingDelete && (isLibrary ? "Remove?" : "Delete?")}
				</button>

				{infoBox.visible && Array.isArray(infoBox.content) && (
					<div className="absolute top-full right-0 mt-2 w-72 rounded-lg border border-line bg-surface-1/95 p-3 shadow-2xl shadow-black/50 backdrop-blur">
						<dl className="space-y-2 text-xs">
							{infoBox.content.map(([label, value]) => (
								<div key={label}>
									<dt className="text-fg-subtle">{label}</dt>
									<dd className="break-all text-fg">{value}</dd>
								</div>
							))}
						</dl>
					</div>
				)}
			</div>
		</div>
	);
}
