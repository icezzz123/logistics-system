export type AccessRule = {
  allowedRoles?: number[]
  requiredPermissions?: string[]
}

export function hasAccess(
  rule: AccessRule | undefined,
  role: number | undefined,
  permissions: string[] | undefined,
) {
  if (!rule) {
    return true
  }

  if (Array.isArray(rule.allowedRoles) && rule.allowedRoles.length > 0) {
    if (!role || !rule.allowedRoles.includes(role)) {
      return false
    }
  }

  if (Array.isArray(rule.requiredPermissions) && rule.requiredPermissions.length > 0) {
    const userPermissions = permissions || []
    if (!rule.requiredPermissions.some((item) => userPermissions.includes(item))) {
      return false
    }
  }

  return true
}
