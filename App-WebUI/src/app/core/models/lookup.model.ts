/** One choice of an address dropdown (GET /lookups/...): its id (to ask for the next list), its code, if it has one, and its name. */
export interface LookupItem {
  id: number;
  name: string;
  code: string | null;
}
