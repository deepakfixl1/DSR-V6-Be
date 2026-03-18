import mongoose from "mongoose";
import { dbConfig } from "#api/config/db.config.js";
import { connectMongo, disconnectMongo } from "#db/connection/mongoose.js";
import { Task, WeekCycle, WorkGoal } from "#db/models/index.js";

const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

const parseArgs = () => {
  const args = process.argv.slice(2);
  const map = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
    map[key] = value;
  }
  return map;
};

const getWeekBounds = (dateInput) => {
  const date = new Date(dateInput);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const mapTaskStatus = (status) => {
  switch (status) {
    case "done":
      return "COMPLETED";
    case "in_progress":
      return "IN_PROGRESS";
    case "cancelled":
      return "CARRIED_FORWARD";
    default:
      return "NOT_STARTED";
  }
};

const mapProgress = (status) => {
  switch (status) {
    case "done":
      return 100;
    case "in_progress":
      return 50;
    default:
      return 0;
  }
};

const ensureWeekCycle = async ({ tenantId, employeeMemberId, dateRef }) => {
  const { start, end } = getWeekBounds(dateRef);
  let cycle = await WeekCycle.findOne({ tenantId, employeeMemberId, weekStartDate: start });
  if (!cycle) {
    cycle = await WeekCycle.create({
      tenantId,
      employeeMemberId,
      weekStartDate: start,
      weekEndDate: end,
      workingDays: [1, 2, 3, 4, 5, 6],
      goalSlotCount: 6,
      metadata: { migratedFromTasks: true },
    });
  }
  return cycle;
};

async function run() {
  const args = parseArgs();
  const tenantId = args.tenantId;
  const managerUserId = args.managerUserId;
  const dryRun = String(args.dryRun || "false") === "true";

  if (!tenantId || !managerUserId) {
    throw new Error("Usage: node apps/api/src/scripts/migrate.tasks-to-work-goals.js --tenantId <id> --managerUserId <id> [--dryRun true]");
  }

  await connectMongo(dbConfig);

  const taskFilter = {
    tenantId: toObjectId(tenantId),
    assigneeId: { $ne: null },
    deletedAt: null,
  };

  const tasks = await Task.find(taskFilter).lean();
  let converted = 0;
  let skipped = 0;

  for (const task of tasks) {
    if (!task.assigneeId) {
      skipped += 1;
      continue;
    }

    const refDate = task.dueAt || task.createdAt || new Date();
    const cycle = await ensureWeekCycle({
      tenantId: toObjectId(tenantId),
      employeeMemberId: task.assigneeId,
      dateRef: refDate,
    });

    const timelineStart = new Date(refDate);
    timelineStart.setHours(0, 0, 0, 0);
    const timelineDue = task.dueAt ? new Date(task.dueAt) : new Date(cycle.weekEndDate);

    const payload = {
      tenantId: toObjectId(tenantId),
      weekCycleId: cycle._id,
      title: task.title,
      description: task.description,
      assignedToMemberId: task.assigneeId,
      parentGoalId: null,
      status: mapTaskStatus(task.status),
      managerApprovedProgressPct: mapProgress(task.status),
      timeline: {
        startDate: timelineStart < cycle.weekStartDate ? cycle.weekStartDate : timelineStart,
        dueDate: timelineDue > cycle.weekEndDate ? cycle.weekEndDate : timelineDue,
        dueDayOfWeek: 6,
      },
      createdByManagerId: toObjectId(managerUserId),
      updatedByManagerId: toObjectId(managerUserId),
      originGoalId: null,
      isCarriedForward: false,
      metadata: {
        migratedFromTask: true,
        sourceTaskId: task._id,
      },
    };

    if (!dryRun) {
      await WorkGoal.create(payload);
    }

    converted += 1;
  }

  console.log(JSON.stringify({ tenantId, dryRun, totalTasks: tasks.length, converted, skipped }, null, 2));
  await disconnectMongo();
}

run()
  .catch(async (error) => {
    console.error(error);
    await disconnectMongo();
    process.exit(1);
  });
