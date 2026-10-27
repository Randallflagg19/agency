export interface CaseDeletionResult {
  readonly id: string;
  readonly alreadyAbsent: boolean;
  readonly photoCleanup: 'pending' | 'not_required' | 'unknown';
}
