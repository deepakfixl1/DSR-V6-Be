export const tasks = [
  {
    id: "task-1",
    title: "Finalize DSR experience",
    status: "In Progress",
    priority: "High",
    timeLogged: "5h 40m",
    owner: "Anita Rao",
    due: "Mar 1"
  },
  {
    id: "task-2",
    title: "Tenant access audit",
    status: "To Do",
    priority: "Medium",
    timeLogged: "1h 20m",
    owner: "Anita Rao",
    due: "Mar 3"
  },
  {
    id: "task-3",
    title: "AI report tuning",
    status: "Done",
    priority: "Low",
    timeLogged: "7h 10m",
    owner: "Anita Rao",
    due: "Feb 20"
  }
];

export const dsrDraft = `Today I shipped the split-view DSR editor and updated the AI insight panel.\n\nBlockers: Awaiting data contracts for weekly report export.\n\nTomorrow: Finalize tenant settings UI and hook up member invites.`;

export const aiInsights = [
  {
    label: "Clarity Score",
    value: "92",
    trend: "+4%"
  },
  {
    label: "Completion Score",
    value: "88",
    trend: "+2%"
  },
  {
    label: "Tone Alignment",
    value: "A-",
    trend: "steady"
  }
];

export const members = [
  { id: "m1", name: "Jules Park", role: "Developer", productivity: 86, status: "Active" },
  { id: "m2", name: "Camille Ortiz", role: "Developer", productivity: 73, status: "At Risk" },
  { id: "m3", name: "Ravi Sharma", role: "Manager", productivity: 91, status: "Active" }
];

export const reports = [
  { id: "r1", title: "Daily Report", cadence: "Daily", score: 84, status: "Ready" },
  { id: "r2", title: "Weekly Report", cadence: "Weekly", score: 89, status: "Ready" },
  { id: "r3", title: "Quarterly Report", cadence: "Quarterly", score: 92, status: "Scheduled" }
];
