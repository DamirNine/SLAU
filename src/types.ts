export type SegmentType = 'number' | 'variable' | 'parameter' | 'operator' | 'equals' | 'whitespace' | 'unknown';

export interface Segment {
  type: SegmentType;
  value: string;
  id: string;
  sub: string;
  sup: string;
}

export interface EquationRow {
  id: string;
  segments: Segment[];
  rawText: string;
}

export interface GaussStep {
  desc: string;
  matrix: string[][];
}

export interface SolveResult {
  status: 'ok' | 'underdetermined' | 'inconsistent' | 'too_many_vars' | 'parse_error';
  errorMessage?: string;
  variables: string[];
  answer: Record<string, string>;
  initialMatrix?: string[][];
  steps?: GaussStep[];
  backSubstitution?: string[];
  mirroredPairs?: Array<{ canonical: string; mirrored: string }>;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  equations: EquationRow[];
  result: SolveResult;
  preview: string;
}
