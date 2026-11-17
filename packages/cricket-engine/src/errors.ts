export type EngineErrorCode =
  | 'INVALID_SETUP'
  | 'INNINGS_COMPLETED'
  | 'BATTER_REQUIRED'
  | 'BOWLER_REQUIRED'
  | 'NOT_EXPECTED'
  | 'INVALID_STATE'
  | 'STRIKER_MISMATCH'
  | 'BOWLER_MISMATCH'
  | 'EXTRA_NOT_ALLOWED'
  | 'INVALID_WICKET'
  | 'CONSECUTIVE_OVERS'
  | 'BOWLER_QUOTA_EXCEEDED'
  | 'INVALID_BATTER'
  | 'SQUAD_EXHAUSTED'
  | 'NO_REPLACEMENT'
  | 'CANNOT_SWAP'
  | 'INVALID_RETIRE'
  | 'UNDO_INVALID'
  | 'UNDO_NOT_APPLICABLE'
  | 'INVALID_TEAM_COUNT'
  | 'INVALID_DATE'
  | 'INVALID_OUTCOME';

/** All engine failures are EngineError, so callers can map `code` to a 4xx response or a UI message. */
export class EngineError extends Error {
  constructor(
    public readonly code: EngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}
