export interface TyporianSettings {
  namingStrategy: 'original' | 'timestamp';
  autoRenameOnConflict: boolean;
}

export const DEFAULT_SETTINGS: TyporianSettings = {
  namingStrategy: 'original',
  autoRenameOnConflict: true,
};
