export async function logAction(prisma, { actorId, action, entity, entityId, metadata }) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId, metadata } });
}
