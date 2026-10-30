import {
	File,
	Film,
	Folder,
	Image as ImageIcon,
	LoaderCircle,
	Music,
} from "lucide-react";

import { mediaKind } from "../context/DFMVContext";

const KIND_ICONS = {
	image: { Icon: ImageIcon, color: "text-sky-400" },
	audio: { Icon: Music, color: "text-violet-400" },
	video: { Icon: Film, color: "text-rose-400" },
};

export function IconButton({ label, className = "", children, ...props }) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-35 ${className}`}
			{...props}
		>
			{children}
		</button>
	);
}

export function FileTypeIcon({ type, isDirectory = false, size = 16 }) {
	if (isDirectory) {
		return (
			<Folder
				size={size}
				className="shrink-0 text-accent"
				fill="currentColor"
				fillOpacity={0.18}
			/>
		);
	}
	const kind = KIND_ICONS[mediaKind(type)];
	if (!kind) return <File size={size} className="shrink-0 text-fg-subtle" />;
	const { Icon, color } = kind;
	return <Icon size={size} className={`shrink-0 ${color}`} />;
}

export function FileRow({
	name,
	type,
	isDirectory = false,
	meta,
	title,
	index,
	isSelected,
	onClick,
	onContextMenu,
	style,
}) {
	return (
		<li style={style} data-index={index}>
			<button
				type="button"
				title={title ?? name}
				onClick={onClick}
				onContextMenu={onContextMenu}
				className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors ${
					isSelected
						? "bg-accent/15 text-fg ring-1 ring-inset ring-accent/30"
						: "text-fg-muted hover:bg-surface-3 hover:text-fg"
				}`}
			>
				<FileTypeIcon type={type} isDirectory={isDirectory} />
				<span className="flex-1 truncate">{name}</span>
				{meta && (
					<span className="shrink-0 text-[11px] tabular-nums text-fg-subtle">
						{meta}
					</span>
				)}
			</button>
		</li>
	);
}

export function Spinner({ label = "Loading…" }) {
	return (
		<div
			role="status"
			className="flex items-center justify-center gap-2 py-10 text-sm text-fg-muted"
		>
			<LoaderCircle size={16} className="animate-spin text-accent" />
			{label}
		</div>
	);
}

export function EmptyState({ icon: Icon, title, hint }) {
	return (
		<div className="flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center">
			{Icon && (
				<div className="mb-2 rounded-xl border border-line bg-surface-2 p-3 text-fg-subtle">
					<Icon size={20} />
				</div>
			)}
			<p className="text-sm font-medium text-fg-muted">{title}</p>
			{hint && <p className="text-xs leading-relaxed text-fg-subtle">{hint}</p>}
		</div>
	);
}

export function Kbd({ children }) {
	return (
		<kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
			{children}
		</kbd>
	);
}
