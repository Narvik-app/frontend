import type {MemberControl} from "~/types/api/item/clubDependent/memberControl";

/**
 * Colour driven purely by the backend-computed `status` (null when there's nothing to alert on:
 * no date on a type that doesn't require one, alert muted, or the type has no alert delay configured).
 * A missing date on a required type (`missing`) is shown as an error.
 */
export function memberControlColor(control: MemberControl): 'error' | 'warning' | 'neutral' {
  if (control.status === 'expired' || control.status === 'missing') return 'error';
  if (control.status === 'warning') return 'warning';
  return 'neutral';
}

export function memberControlIsAlerting(control: MemberControl): boolean {
  return control.status === 'expired' || control.status === 'warning' || control.status === 'missing';
}
