import { Fragment, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { StoreApi, UseBoundStore } from "zustand";
import { TFolder } from "obsidian";

import AppleStyleNotesPlugin from "src/main";
import { FileTreeStore } from "src/store";
import Folder from "./Folder";
import {
	SettingsChangeEventName,
	VaultChangeEvent,
	VaultChangeEventName,
} from "src/assets/constants";
import { isFolder } from "src/utils";

type Props = {
	useFileTreeStore: UseBoundStore<StoreApi<FileTreeStore>>;
	plugin: AppleStyleNotesPlugin;
};
const Folders = ({ useFileTreeStore, plugin }: Props) => {
	const {
		rootFolder,
		folderSortRule,
		getTopLevelFolders,
		hasFolderChildren,
		getFoldersByParent,
		sortFolders,
		expandedFolderPaths,
		restoreExpandedFolderPaths,
		restoreLastFocusedFolder,
	} = useFileTreeStore(
		useShallow((store: FileTreeStore) => ({
			rootFolder: store.rootFolder,
			folderSortRule: store.folderSortRule,
			hasFolderChildren: store.hasFolderChildren,
			getTopLevelFolders: store.getTopLevelFolders,
			getFoldersByParent: store.getFoldersByParent,
			sortFolders: store.sortFolders,
			expandedFolderPaths: store.expandedFolderPaths,
			restoreExpandedFolderPaths: store.restoreExpandedFolderPaths,
			restoreLastFocusedFolder: store.restoreLastFocusedFolder,
		}))
	);

	const topLevelFolders = getTopLevelFolders();
	const [topFolders, setTopFolders] = useState<TFolder[]>([]);
	const [showHierarchyLines, setShowHierarchyLines] = useState(
		plugin.settings.showFolderHierarchyLines
	);

	useEffect(() => {
		restoreLastFocusedFolder();
		restoreExpandedFolderPaths();
		setTopFolders(topLevelFolders);
	}, []);

	useEffect(() => {
		window.addEventListener(VaultChangeEventName, onHandleVaultChange);
		window.addEventListener(
			SettingsChangeEventName,
			onHandleSettingsChange
		);
		return () => {
			window.removeEventListener(
				VaultChangeEventName,
				onHandleVaultChange
			);
			window.removeEventListener(
				SettingsChangeEventName,
				onHandleSettingsChange
			);
		};
	}, []);

	const onHandleVaultChange = (event: VaultChangeEvent) => {
		const { file, changeType } = event.detail;
		if (!isFolder(file)) return;
		restoreExpandedFolderPaths();

		switch (changeType) {
			case "create":
				if (file.parent?.isRoot()) {
					setTopFolders((prevFolders) => [...prevFolders, file]);
				}
				break;
			case "delete":
				setTopFolders((prevFolders) =>
					prevFolders.filter(
						(prevFolder) => prevFolder.path !== file.path
					)
				);
				break;
			case "rename":
				setTopFolders((prevFolders) =>
					prevFolders.map((prevFolder) =>
						prevFolder.path === file.path ? file : prevFolder
					)
				);
				break;
			case "modify":
				setTopFolders((prevFolders) =>
					prevFolders.map((prevFolder) =>
						prevFolder.path === file.path ? file : prevFolder
					)
				);
		}
	};

	const onHandleSettingsChange = (event: CustomEvent) => {
		const { changeKey, changeValue } = event.detail;
		if (changeKey === "showFolderHierarchyLines") {
			setShowHierarchyLines(changeValue);
		}
	};

	const renderFolders = (folders: TFolder[]) => {
		const sortedFolders = sortFolders(
			folders,
			folderSortRule,
			plugin.settings.includeSubfolderFilesCount
		);
		return sortedFolders.map((folder) => (
			<div key={folder.name}>
				<Folder
					folder={folder}
					useFileTreeStore={useFileTreeStore}
					plugin={plugin}
				/>
				{expandedFolderPaths.includes(folder.path) &&
					hasFolderChildren(folder) && (
						<div className="asn-sub-folders-section asn-folder-wrapper">
							{showHierarchyLines && (
								<div className="asn-hierarchy-line"></div>
							)}
							{renderFolders(getFoldersByParent(folder))}
						</div>
					)}
			</div>
		));
	};

	const renderRootFolder = () => {
		if (!rootFolder) return null;

		return (
			<div className="asn-folder-wrapper">
				{showHierarchyLines && (
					<div className="asn-hierarchy-line"></div>
				)}
				<Folder
					folder={rootFolder}
					useFileTreeStore={useFileTreeStore}
					plugin={plugin}
					isRoot
				/>
			</div>
		);
	};

	return (
		<Fragment>
			{renderRootFolder()}
			{renderFolders(topFolders)}
		</Fragment>
	);
};

export default Folders;
