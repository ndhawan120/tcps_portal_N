export type AccaExam = {
  code: string;
  name: string;
  level: "Applied Knowledge" | "Applied Skills" | "Strategic Professional";
  optional: boolean; // Strategic Professional Options — choose 2 of 4
};

export const ACCA_EXAMS: AccaExam[] = [
  // Applied Knowledge — 3 papers, all required
  { code: "BT", name: "Business and Technology", level: "Applied Knowledge", optional: false },
  { code: "MA", name: "Management Accounting", level: "Applied Knowledge", optional: false },
  { code: "FA", name: "Financial Accounting", level: "Applied Knowledge", optional: false },

  // Applied Skills — 6 papers, all required
  { code: "LW", name: "Corporate and Business Law", level: "Applied Skills", optional: false },
  { code: "PM", name: "Performance Management", level: "Applied Skills", optional: false },
  { code: "TX", name: "Taxation", level: "Applied Skills", optional: false },
  { code: "FR", name: "Financial Reporting", level: "Applied Skills", optional: false },
  { code: "AA", name: "Audit and Assurance", level: "Applied Skills", optional: false },
  { code: "FM", name: "Financial Management", level: "Applied Skills", optional: false },

  // Strategic Professional — Essentials, both required
  { code: "SBL", name: "Strategic Business Leader", level: "Strategic Professional", optional: false },
  { code: "SBR", name: "Strategic Business Reporting", level: "Strategic Professional", optional: false },

  // Strategic Professional — Options, choose 2 of 4
  { code: "AFM", name: "Advanced Financial Management", level: "Strategic Professional", optional: true },
  { code: "APM", name: "Advanced Performance Management", level: "Strategic Professional", optional: true },
  { code: "ATX", name: "Advanced Taxation", level: "Strategic Professional", optional: true },
  { code: "AAA", name: "Advanced Audit and Assurance", level: "Strategic Professional", optional: true },
];
