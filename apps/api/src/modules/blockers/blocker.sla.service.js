import Blocker from "#db/models/Blocker.model.js";

export async function checkBlockerSlaBreaches() {
  const now = new Date();
  const blockers = await Blocker.find({
    status: { $in: ["open", "in_progress", "escalated"] },
    "SLA.expectedResolutionHours": { $ne: null },
    "SLA.breached": false,
  }).lean();

  const breachedIds = [];
  for (const blocker of blockers) {
    const expectedHours = blocker.SLA?.expectedResolutionHours;
    if (!expectedHours || !blocker.createdAt) continue;
    const expectedAt = new Date(blocker.createdAt.getTime() + expectedHours * 3600 * 1000);
    if (expectedAt <= now) breachedIds.push(blocker._id);
  }

  if (breachedIds.length) {
    await Blocker.updateMany(
      { _id: { $in: breachedIds } },
      { $set: { "SLA.breached": true } }
    );
  }

  return { breachedCount: breachedIds.length };
}
