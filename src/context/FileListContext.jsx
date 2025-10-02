import { createContext, useContext, useState } from "react";

const FileListContext = createContext();

export function FileListProvider({ children }) {
	const [currentFiles, setCurrentFiles] = useState([]);
	const [currentDir, setCurrentDir] = useState("");
	const [prevDir, setPrevDir] = useState([]);
	const [selectedIdx, setSelectedIdx] = useState(0);
	const [selectedImage, setSelectedImage] = useState("");
	const [imgSrc, setImgSrc] = useState(null);

	return (
		<FileListContext.Provider
			value={{
				currentFiles,
				setCurrentFiles,
				currentDir,
				setCurrentDir,
				prevDir,
				setPrevDir,
				selectedIdx,
				setSelectedIdx,
				selectedImage,
				setSelectedImage,
				imgSrc,
				setImgSrc,
			}}
		>
			{children}
		</FileListContext.Provider>
	);
}

export function useFileList() {
	return useContext(FileListContext);
}
