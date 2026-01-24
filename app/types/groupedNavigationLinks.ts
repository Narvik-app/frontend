export interface NavigationLink {
  to?: string;
  label?: string;
  icon?: string;
  onSelect?: () => void;
  active?: boolean;
}

export interface GroupedNavigationLinks {
  title?: string,
  links: Array<NavigationLink>
}
