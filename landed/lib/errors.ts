/** An error whose message is safe and useful to show the user (HTTP 400). */
export class UserFacingError extends Error {
  readonly userFacing = true;
}

export function isUserFacing(e: unknown): e is UserFacingError {
  return e instanceof Error && (e as { userFacing?: boolean }).userFacing === true;
}
