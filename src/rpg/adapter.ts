/** Game-specific rules and state belong behind this boundary. */
export interface RpgSystemAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}
