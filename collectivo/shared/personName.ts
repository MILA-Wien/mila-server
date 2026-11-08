/**
 * Mirrors Keycloak's validation of the firstName / lastName user attributes.
 *
 * Directus `username` / `username_last` are synced to Keycloak `firstName` / `lastName`
 * (see server/api/user_sync_keycloak.post.ts), and the realm's user profile validates
 * those with `person-name-prohibited-characters` and `length: { max: 255 }`
 * (see keycloak/import/collectivo-realm.json). A name that passes our forms but not
 * Keycloak makes the sync fail, so the same rules are checked here.
 *
 * Keycloak 26.7.2 (PersonNameProhibitedCharactersValidator) uses the Java regex
 *   ^[^<>&"\v$%!#?§;*~/\\|^=\[\]{}()\p{Cntrl}]+$
 * Java's `\v` is vertical whitespace [\n\x0B\f\r\x85\u2028\u2029] and `\p{Cntrl}` is
 * [\x00-\x1F\x7F]; JS gives both a narrower meaning, so they are spelled out below.
 */

/** Characters users can type that Keycloak rejects (shown in error messages). */
export const PERSON_NAME_PROHIBITED_CHARACTERS = '< > & " $ % ! # ? § ; * ~ / \\ | ^ = [ ] { } ( )';

const PERSON_NAME_PATTERN =
  /^[^<>&"$%!#?§;*~\/\\|^=\[\]{}()\x00-\x1F\x7F\x85\u2028\u2029]+$/;

export const PERSON_NAME_MAX_LENGTH = 255;

/** Empty values pass, like in Keycloak; use a separate required check for those. */
export function isValidPersonName(value?: string | null): boolean {
  return !value || PERSON_NAME_PATTERN.test(value);
}
