export type ScenarioModule = {
  id: string;
  title: string;
  briefing: string;
  objectives: readonly string[];
  procedures: readonly string[];
  clues: readonly string[];
  complications: readonly string[];
};

export type SettingModule = {
  id: string;
  name: string;
  description: string;
  scenarios: readonly ScenarioModule[];
};
