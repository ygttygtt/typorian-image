import { TFile } from 'obsidian';

export type CheckScope = 'current' | 'all';
export type IssueStatus = 'candidate' | 'ambiguous' | 'missing' | 'incompatible';
export interface ImageIssue {
  id: string;
  note: TFile;
  from: number;
  to: number;
  line: number;
  excerpt: string;
  raw: string;
  path: string;
  syntax: 'markdown' | 'wiki';
  alt: string;
  title: string;
  status: IssueStatus;
  candidates: TFile[];
  target: TFile | null;
  content: string;
}
export interface IssueScan {
  issues: ImageIssue[];
  externalCount: number;
  scannedNotes: number;
}
export interface UnusedImage {
  file: TFile;
  relatedIssues: ImageIssue[];
}
export interface UnusedScan {
  images: UnusedImage[];
  folders: string[];
}
export interface CheckActionResult {
  repaired: number;
  deleted: number;
  notes: number;
  copies: number;
  changed: number;
}
export interface TrashResult { files: number; bytes: number; changed: number; }
