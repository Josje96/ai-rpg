import assert from "node:assert/strict";
import test from "node:test";
import {
  abilityModifier,
  proficiencyBonusForLevel,
  resolveAbilityCheck,
  resolveSkillCheck,
  skillAbility,
} from "../src/rpg/dnd5e-2014.js";

test("derives ability modifiers using floor((score - 10) / 2)", () => {
  assert.equal(abilityModifier(9), -1);
  assert.equal(abilityModifier(10), 0);
  assert.equal(abilityModifier(18), 4);
  assert.throws(() => abilityModifier(0), /between 1 and 30/);
});

test("returns the 2014 proficiency bonus at each level band", () => {
  assert.deepEqual([1, 5, 9, 13, 17, 20].map(proficiencyBonusForLevel), [2, 3, 4, 5, 6, 6]);
  assert.throws(() => proficiencyBonusForLevel(0), /between 1 and 20/);
});

test("resolves a proficient ability check against its DC", () => {
  const result = resolveAbilityCheck({
    ability: "strength",
    abilityScore: 16,
    level: 5,
    dc: 17,
    proficient: true,
    bonus: 1,
  }, () => 10);

  assert.deepEqual(result, {
    ability: "strength",
    rawD20s: [10],
    keptD20: 10,
    abilityModifier: 3,
    proficiencyBonus: 3,
    appliedProficiency: 3,
    bonus: 1,
    total: 17,
    dc: 17,
    success: true,
  });
});

test("advantage keeps the higher d20 and disadvantage keeps the lower", () => {
  const values = [4, 18, 4, 18];
  const next = () => values.shift() ?? 1;
  const base = { ability: "dexterity" as const, abilityScore: 10, level: 1, dc: 12 };

  assert.equal(resolveAbilityCheck({ ...base, advantage: true }, next).keptD20, 18);
  assert.equal(resolveAbilityCheck({ ...base, disadvantage: true }, next).keptD20, 4);
});

test("advantage and disadvantage cancel to one d20", () => {
  let rolls = 0;
  const result = resolveAbilityCheck({
    ability: "wisdom",
    abilityScore: 10,
    level: 1,
    dc: 15,
    advantage: true,
    disadvantage: true,
  }, () => {
    rolls += 1;
    return 18;
  });

  assert.equal(rolls, 1);
  assert.deepEqual(result.rawD20s, [18]);
  assert.equal(result.success, true);
});

test("expertise doubles proficiency and requires proficiency", () => {
  const result = resolveAbilityCheck({
    ability: "intelligence",
    abilityScore: 11,
    level: 5,
    dc: 16,
    proficient: true,
    expertise: true,
  }, () => 10);

  assert.equal(result.appliedProficiency, 6);
  assert.equal(result.total, 16);
  assert.throws(() => resolveAbilityCheck({
    ability: "intelligence",
    abilityScore: 11,
    level: 5,
    dc: 16,
    expertise: true,
  }, () => 10), /requires proficiency/);
});

test("maps skills to abilities and resolves a skill check", () => {
  assert.equal(skillAbility("stealth"), "dexterity");
  assert.equal(skillAbility("persuasion"), "charisma");

  const result = resolveSkillCheck({
    skill: "stealth",
    abilityScore: 16,
    level: 1,
    dc: 14,
    proficient: true,
  }, () => 10);

  assert.equal(result.ability, "dexterity");
  assert.equal(result.total, 15);
  assert.equal(result.success, true);
});

test("natural 20 is not automatic success on an ability check", () => {
  const result = resolveAbilityCheck({
    ability: "strength",
    abilityScore: 1,
    level: 1,
    dc: 30,
  }, () => 20);

  assert.equal(result.total, 15);
  assert.equal(result.success, false);
});
