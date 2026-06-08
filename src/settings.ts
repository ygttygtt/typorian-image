export interface TyporianSettings {
  namingStrategy: 'original' | 'timestamp';
  autoRenameOnConflict: boolean;
  assetFolderPath: string;
  interceptImagePath: boolean;
  enableWikiLinkConversion: boolean;
  scanCodeBlocks: boolean;
  showRestructureTool: boolean;
  manualAttachmentFolder: string;
  iconImageAudit: string;
  iconShare: string;
  iconRestructure: string;
  openFolderAfterExport: boolean;
}

export const DEFAULT_SETTINGS: TyporianSettings = {
  namingStrategy: 'original',
  autoRenameOnConflict: true,
  assetFolderPath: './${notename}.assets/',
  interceptImagePath: true,
  enableWikiLinkConversion: false,
  scanCodeBlocks: false,
  showRestructureTool: false,
  manualAttachmentFolder: '',
  iconImageAudit: 'trash-2',
  iconShare: 'share-2',
  iconRestructure: 'git-fork',
  openFolderAfterExport: false,
};
