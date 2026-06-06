export interface TyporianSettings {
  namingStrategy: 'original' | 'timestamp';
  autoRenameOnConflict: boolean;
  assetFolderPath: string;
}

export const DEFAULT_SETTINGS: TyporianSettings = {
  namingStrategy: 'original',
  autoRenameOnConflict: true,
  assetFolderPath: './${notename}.assets/',
};
