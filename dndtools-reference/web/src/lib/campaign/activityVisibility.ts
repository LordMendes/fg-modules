/** Pure activity visibility (no Prisma / hub imports). */

export function canViewerSeeActivity(
  viewer: { userId: string; isDm: boolean },
  activity: { actorUserId: string; subjectUserId: string | null },
): boolean {
  if (viewer.isDm) return true;
  if (activity.actorUserId === viewer.userId) return true;
  if (activity.subjectUserId && activity.subjectUserId === viewer.userId) {
    return true;
  }
  return false;
}
