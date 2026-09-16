export function formatMonetary(value?: string|number|null): string {
  if (value === undefined || value === null) return 'Non défini'
  if (typeof value !== 'number') {
    value = Number(value)
  }

  return value.toLocaleString('fr-FR', { style: "currency", currency: 'EUR' })
}

export function getMemberDisplayName(member: {fullName?: string; firstname?: string; lastname?: string}): string {
  return member.fullName ?? `${member.firstname ?? ''} ${member.lastname ?? ''}`.trim()
}

/**
 * Blocks keystrokes on a numeric UInput that would type anything but digits and a single decimal dot
 * (browsers otherwise let a `type="number"` input accept e/E/+/- and multiple dots).
 * Use on @keydown: `@keydown="blockNonDecimalKey"`.
 */
export function blockNonDecimalKey(event: KeyboardEvent): void {
  // Never block control/navigation keys or Ctrl/Cmd shortcuts (copy, paste, select-all...)
  if (event.ctrlKey || event.metaKey || event.key.length > 1) return

  const target = event.target as HTMLInputElement
  if (event.key === '.' && !target.value.includes('.')) return
  if (!/^\d$/.test(event.key)) event.preventDefault()
}
