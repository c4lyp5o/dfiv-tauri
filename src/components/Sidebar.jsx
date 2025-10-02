import { useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileList } from "../context/FileListContext";

const Sidebar = () => {
	const {
		currentFiles,
		setCurrentFiles,
		currentDir,
		setCurrentDir,
		prevDir,
		setPrevDir,
		selectedIdx,
		setSelectedIdx,
		setSelectedImage,
	} = useFileList();

	const listRef = useRef();

	// biome-ignore lint/correctness/useExhaustiveDependencies: only once
	useEffect(() => {
		(async () => {
			const home = await invoke("get_home_dir");
			setCurrentDir(home);
			const folder = await invoke("read_folder", { dir: home });
			setCurrentFiles(folder);
		})();
	}, []);

	const openFolder = async (dir) => {
		setPrevDir([...prevDir, dir]);
		setCurrentDir(dir);
		const folder = await invoke("read_folder", { dir: dir });
		setCurrentFiles(folder);
		setSelectedIdx(0);
	};

	// Keyboard navigation
	const imageExtensions = [
		".jpg",
		".jpeg",
		".png",
		".gif",
		".bmp",
		".webp",
		".svg",
	];
	const isImage = (file) =>
		!file.is_directory &&
		imageExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

	const handleKeyDown = (e) => {
		if (!currentFiles.length) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setSelectedIdx((idx) => {
				const nextIdx = Math.min(idx + 1, currentFiles.length - 1);
				// If current is image, and next is image, select next image
				if (isImage(currentFiles[idx])) {
					for (let i = idx + 1; i < currentFiles.length; i++) {
						if (isImage(currentFiles[i])) {
							setSelectedImage(currentFiles[i].path);
							return i;
						}
					}
					return idx; // No next image
				}
				return nextIdx;
			});
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setSelectedIdx((idx) => {
				const prevIdx = Math.max(idx - 1, 0);
				// If current is image, and previous is image, select previous image
				if (isImage(currentFiles[idx])) {
					for (let i = idx - 1; i >= 0; i--) {
						if (isImage(currentFiles[i])) {
							setSelectedImage(currentFiles[i].path);
							return i;
						}
					}
					return idx; // No previous image
				}
				return prevIdx;
			});
		} else if (e.key === "Enter") {
			const f = currentFiles[selectedIdx];
			if (f) {
				if (f.is_directory) openFolder(f.path);
				else setSelectedImage(f.path);
			}
		}
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: false
		<section
			className="w-64 bg-gray-100 border-r p-2 h-full overflow-y-auto outline-0"
			// biome-ignore lint/a11y/noNoninteractiveTabindex: false
			tabIndex={0}
			onKeyDown={handleKeyDown}
		>
			<div className="mb-2 flex gap-2">
				{prevDir.length > 0 && (
					<button
						type="button"
						className="p-2 rounded hover:bg-gray-200 text-blue-500 flex items-center justify-center"
						title="Back"
						onClick={async () => {
							setSelectedImage("");
							const folder = await invoke("read_folder", {
								dir: prevDir[prevDir.length - 1],
							});
							setCurrentFiles(folder);
							setCurrentDir(prevDir[prevDir.length - 1]);
							if (prevDir.length === 1) {
								setCurrentDir(prevDir[0]);
								setPrevDir([]);
								return;
							}
							const backDir = prevDir[prevDir.length - 1];
							console.log("Going back to:", backDir);
							const sliced = prevDir.slice(0, -1);
							console.log("New prevDir:", sliced);
							setPrevDir(sliced);
						}}
					>
						<span role="img" aria-label="Back">
							🔙
						</span>
					</button>
				)}
				<button
					type="button"
					className="p-2 rounded hover:bg-gray-200 text-blue-500 flex items-center justify-center"
					title="Refresh"
					onClick={async () => {
						setSelectedImage("");
						const folder = await invoke("read_folder", { dir: currentDir });
						setCurrentFiles(folder);
					}}
				>
					<span role="img" aria-label="Refresh">
						🔄
					</span>
				</button>
			</div>
			<h2 className="text-sm font-bold mb-2">{currentDir}</h2>
			<ul ref={listRef}>
				{currentFiles
					.sort((a, b) => {
						if (a.is_directory && !b.is_directory) return -1;
						if (!a.is_directory && b.is_directory) return 1;
						return a.name.localeCompare(b.name);
					})
					.map((f, idx) => (
						<li key={f.path}>
							<button
								type="button"
								className={`w-full text-left text-sm cursor-pointer hover:bg-gray-200 p-1 rounded ${selectedIdx === idx ? "bg-blue-200" : ""}`}
								onClick={() => {
									if (f.is_directory) {
										openFolder(f.path);
									} else {
										setSelectedIdx(idx);
										setSelectedImage(f.path);
									}
								}}
								tabIndex={-1}
							>
								{f.is_directory ? "📁 " : "🖼️ "}
								{f.name}
							</button>
						</li>
					))}
			</ul>
		</section>
	);
};

export default Sidebar;
