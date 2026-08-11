export type AccaObjective = {
  number: number;
  title: string;
  category: string;
  essential: boolean;
};

export const ACCA_OBJECTIVES: AccaObjective[] = [
  // Essentials — all 5 required
  { number: 1, title: "Ethics and professionalism", category: "Essentials", essential: true },
  { number: 2, title: "Stakeholder relationship management", category: "Essentials", essential: true },
  { number: 3, title: "Strategy, innovation and sustainable value creation", category: "Essentials", essential: true },
  { number: 4, title: "Governance, risk and control", category: "Essentials", essential: true },
  { number: 5, title: "Leadership and management", category: "Essentials", essential: true },

  // Technical — choose any 4 of 17
  { number: 6, title: "Record and process transactions and events", category: "Corporate and business reporting", essential: false },
  { number: 7, title: "Prepare external financial reports", category: "Corporate and business reporting", essential: false },
  { number: 8, title: "Analyse and interpret financial reports", category: "Corporate and business reporting", essential: false },

  { number: 9, title: "Evaluate investment and financing decisions", category: "Financial management", essential: false },
  { number: 10, title: "Manage and control working capital", category: "Financial management", essential: false },
  { number: 11, title: "Identify and manage financial risk", category: "Financial management", essential: false },

  { number: 12, title: "Evaluate management accounting systems", category: "Management accounting", essential: false },
  { number: 13, title: "Plan and control performance", category: "Management accounting", essential: false },
  { number: 14, title: "Monitor performance", category: "Management accounting", essential: false },

  { number: 15, title: "Tax computations and assessments", category: "Taxation", essential: false },
  { number: 16, title: "Tax compliance and verification", category: "Taxation", essential: false },
  { number: 17, title: "Tax planning and advice", category: "Taxation", essential: false },

  { number: 18, title: "Prepare for and plan the audit and assurance process", category: "Audit and assurance", essential: false },
  { number: 19, title: "Collect and evaluate evidence for an audit or assurance engagement", category: "Audit and assurance", essential: false },
  { number: 20, title: "Review and report on the findings of an audit or assurance engagement", category: "Audit and assurance", essential: false },

  { number: 21, title: "Business advisory", category: "Advisory and consultancy", essential: false },

  { number: 22, title: "Data analysis and decision support", category: "Data, digital and technology", essential: false },
];
