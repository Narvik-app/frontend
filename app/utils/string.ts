export function formatMonetary(value?: string|number): string {
  if (typeof value !== 'number' && value !== undefined) {
    value = Number(value)
  }

  return value !== undefined ? value.toLocaleString('fr-FR', { style: "currency", currency: 'EUR' }) : 'Non défini'
}

export function getMemberDisplayName(member: {fullName?: string; firstname?: string; lastname?: string}): string {
  return member.fullName ?? `${member.firstname ?? ''} ${member.lastname ?? ''}`.trim()
}
