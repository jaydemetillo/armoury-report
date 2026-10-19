type ClassValue = string | false | null | undefined

/** Joins truthy class names. Swapped for the clsx + tailwind-merge version when shadcn components are added. */
export function cn(...classes: ClassValue[]) {
  return classes.filter(Boolean).join(' ')
}
