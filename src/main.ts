import { Plugin, TAbstractFile } from "obsidian";

import { FileTreeView } from "./FileTreeView";
import { SettingTab } from "./SettingTab";
import { AppleStyleNotesPluginSettings } from "./settings";
import {
	SettingsChangeEventName,
	VaultChangeEventName,
	VaultChangeType,
} from "./assets/constants";
import { getSettingsFromLocalStorage } from "./utils";

export default class AppleStyleNotesPlugin extends Plugin {
	settings: AppleStyleNotesPluginSettings;

	VIEW_TYPE = "asn-plugin-file-tree-view";
	VIEW_DISPLAY_TEXT = "Apple Style Notes Plugin File Tree";
	ICON = "dock";

	async onload() {
		console.log("Apple Styled Notes Plugin onload");

		this.addSettingTab(new SettingTab(this.app, this));

		this.registerView(
			this.VIEW_TYPE,
			(leaf) => new FileTreeView(leaf, this)
		);

		await this.loadSettings();

		this.addCommand({
			id: "open-file-tree-view",
			name: "Open File Tree View",
			callback: async () => await this.openFileTreeLeaf(true),
		});

		this.app.workspace.onLayoutReady(async () => {
			await this.openFileTreeLeaf(true);
		});

		this.app.vault.on("create", this.onCreate);
		this.app.vault.on("modify", this.onModify);
		this.app.vault.on("delete", this.onDelete);
		this.app.vault.on("rename", this.onRename);
	}

	triggerVaultChangeEvent = (
		file: TAbstractFile,
		changeType: VaultChangeType
	) => {
		const event = new CustomEvent(VaultChangeEventName, {
			detail: {
				file,
				changeType,
			},
		});
		window.dispatchEvent(event);
	};

	onCreate: (file: TAbstractFile) => void = (file) => {
		this.triggerVaultChangeEvent(file, "create");
	};

	onModify: (file: TAbstractFile) => void = (file) => {
		this.triggerVaultChangeEvent(file, "modify");
	};

	onDelete: (file: TAbstractFile) => void = (file) => {
		this.triggerVaultChangeEvent(file, "delete");
	};

	onRename: (file: TAbstractFile) => void = (file) => {
		this.triggerVaultChangeEvent(file, "rename");
	};

	triggerSettingsChangeEvent = <
		K extends keyof AppleStyleNotesPluginSettings
	>(
		changeKey: K,
		changeValue: AppleStyleNotesPluginSettings[K]
	) => {
		const event = new CustomEvent(SettingsChangeEventName, {
			detail: {
				changeKey,
				changeValue,
			},
		});
		window.dispatchEvent(event);
	};

	onunload() {
		this.detachFileTreeLeafs();
		this.app.vault.off("create", this.onCreate);
		this.app.vault.off("modify", this.onModify);
		this.app.vault.off("delete", this.onDelete);
		this.app.vault.off("rename", this.onRename);
	}

	openFileTreeLeaf = async (showAfterAttach: boolean) => {
		const leafs = this.app.workspace.getLeavesOfType(this.VIEW_TYPE);
		if (leafs.length == 0) {
			const leaf = this.app.workspace.getLeftLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: this.VIEW_TYPE });
			if (showAfterAttach) this.app.workspace.revealLeaf(leaf);
		} else {
			if (showAfterAttach) {
				leafs.forEach((leaf) => this.app.workspace.revealLeaf(leaf));
			}
		}
	};

	async loadSettings() {
		const settings = getSettingsFromLocalStorage();
		this.settings = Object.assign({}, settings, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	detachFileTreeLeafs = () => {
		const leafs = this.app.workspace.getLeavesOfType(this.VIEW_TYPE);
		for (const leaf of leafs) {
			(leaf.view as FileTreeView).destroy();
			leaf.detach();
		}
	};

	refreshTreeLeafs = (showAfterAttach: boolean) => {
		this.detachFileTreeLeafs();
		this.openFileTreeLeaf(showAfterAttach);
	};
}
