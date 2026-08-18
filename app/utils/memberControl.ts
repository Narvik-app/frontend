import type {MemberControl} from "~/types/api/item/clubDependent/memberControl";

/**
 * Colour driven purely by the backend-computed `status` (null when there's nothing to alert on:
 * no date, alert muted, or the type has no alert delay configured).
 */
export function memberControlColor(control: MemberControl): 'error' | 'warning' | 'neutral' {
  if (control.status === 'expired') return 'error';
  if (control.status === 'warning') return 'warning';
  return 'neutral';
}

export function memberControlIsAlerting(control: MemberControl): boolean {
  return control.status === 'expired' || control.status === 'warning';
}
