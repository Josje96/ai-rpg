import type { SettingModule } from "../types.js";

/** Original system-neutral containment-horror starter case. */
export const scpFoundationSetting = {
  id: "scp-foundation",
  name: "SCP Foundation",
  description: "Collaborative containment-horror setting module; keep rules in a separate RPG adapter.",
  scenarios: [
    {
      id: "quiet-annex-001",
      title: "Case 001: Quiet Annex",
      briefing:
        "At 01:13 on three consecutive nights, an unlisted steel door appeared in a sealed records wing. Night archivist Mara Venn entered during the latest appearance and has not returned. Your team has one hour before the door is expected to appear again.",
      objectives: [
        "Locate the missing archivist if possible.",
        "Document how the door and corridor behave without splitting the team.",
        "Secure the threshold before the next appearance cycle.",
      ],
      procedures: [
        "Maintain a two-person buddy line; one team member remains at the threshold.",
        "Use call signs and an analog log; do not rely on clocks or radio timestamps inside the corridor.",
        "Do not force an interior door until the team has recorded its label and the time shown outside.",
      ],
      clues: [
        "The corridor measures 21 metres on a tape, but the far door is visible from the entrance at every distance.",
        "A paper inventory slip is dated tomorrow and bears the missing archivist's handwriting.",
        "The wall clock outside advances normally; the corridor's clock loses one minute each time the team returns.",
      ],
      complications: [
        "The analog tether gains an extra knot while no one is watching it.",
        "A familiar voice answers over the intercom from behind a door that is not on the floor plan.",
      ],
    },
  ],
} satisfies SettingModule;
