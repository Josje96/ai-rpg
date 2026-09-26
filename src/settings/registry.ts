import { scpFoundationSetting } from "./scp/index.js";
import type { ScenarioModule, SettingModule } from "./types.js";

const settings: readonly SettingModule[] = [scpFoundationSetting];

export function listSettingModules(): readonly SettingModule[] {
  return settings;
}

export function getSettingModule(id: string): SettingModule | undefined {
  return settings.find((setting) => setting.id === id);
}

export function getScenario(settingId: string, scenarioId: string): ScenarioModule | undefined {
  return getSettingModule(settingId)?.scenarios.find((scenario) => scenario.id === scenarioId);
}
