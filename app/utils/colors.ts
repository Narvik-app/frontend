export interface Color {
  name: ColorName,
  value: string
}

export enum ColorName {
  Primary = 'primary',
  Success = 'success',
  Warning = 'warning',
  Error   = 'error',
  Neutral = 'neutral',
  Orange  = 'orange',
  Purple  = 'purple',
}

export function getColors(): Color[] {
  if (import.meta.server) {
    // Return default colors on server side
    return [
      { name: ColorName.Primary, value: '' },
      { name: ColorName.Error, value: '' },
      { name: ColorName.Success, value: '' },
      { name: ColorName.Warning, value: '' },
      { name: ColorName.Orange, value: '' },
      { name: ColorName.Purple, value: '' },
      { name: ColorName.Neutral, value: '' },
    ]
  }
  
  return [
    { name: ColorName.Primary, value: getComputedStyle(document.documentElement).getPropertyValue('--ui-primary') },
    { name: ColorName.Error, value: getComputedStyle(document.documentElement).getPropertyValue('--ui-error') },
    { name: ColorName.Success, value: getComputedStyle(document.documentElement).getPropertyValue('--ui-success') },
    { name: ColorName.Warning, value: getComputedStyle(document.documentElement).getPropertyValue('--ui-warning') },
    { name: ColorName.Orange, value: getComputedStyle(document.documentElement).getPropertyValue('--ui-orange') },
    { name: ColorName.Purple, value: getComputedStyle(document.documentElement).getPropertyValue('--ui-purple') },
    { name: ColorName.Neutral, value: getComputedStyle(document.documentElement).getPropertyValue('--ui-neutral') },
  ]
}

export function getColor(name: ColorName): Color {
  const color = getColors().find(c => c.name === name)

  if (color === undefined) {
    throw new Error('Color not found')
  }

  return color
}

export function getColorByIndex(index?: number): Color {
  const colors = getColors()
  let color = undefined

  if (index === undefined) {
    color = colors[Math.floor(Math.random() * colors.length)]
  } else {
    color = colors[index % colors.length]
  }

  if (color === undefined) {
    throw new Error('Color not found')
  }

  return color
}
