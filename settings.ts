/** Characters with path/link semantics in Obsidian or desktop filenames. */
export const IMAGE_FILE_NAME_POLICY = {
  unsupportedCharacters: /[<>:"/\\|?*#\[\]^]/g,
  replacement: '_',
};

export interface TyporianSettings {
  namingStrategy: 'original' | 'timestamp';
  autoRenameOnConflict: boolean;
  assetFolderPath: string;
  hideAssetFolders: boolean;
  interceptImagePath: boolean;
  scanCodeBlocks: boolean;
  showRestructureTool: boolean;
  restructureOutputFolder: string;
  manualAttachmentFolder: string;
  iconImageAudit: string;
  iconShare: string;
  iconRestructure: string;
  openFolderAfterExport: boolean;
  showWikiConverter: boolean;
  iconWikiConverter: string;
}

export const DEFAULT_SETTINGS: TyporianSettings = {
  namingStrategy: 'original',
  autoRenameOnConflict: true,
  assetFolderPath: './${notename}.assets/',
  hideAssetFolders: false,
  interceptImagePath: true,
  scanCodeBlocks: false,
  showRestructureTool: false,
  restructureOutputFolder: '_Restructured_Vault',
  manualAttachmentFolder: '',
  iconImageAudit: 'trash-2',
  iconShare: 'share-2',
  iconRestructure: 'git-fork',
  openFolderAfterExport: false,
  showWikiConverter: false,
  iconWikiConverter: 'repeat-2',
};
