/**
 * Terminal art for key moments. Each piece comes in two sizes: small (at most 40 columns, a phone held upright)
 * and large (at most 72 columns, in art-large.ts). The terminal shows the largest that fits, centered.
 * Plain ASCII; no backticks inside String.raw templates.
 */
import {
  COUNTY_FAIR_LARGE, GENERIC_LARGE, LOW_SIGNAL_LARGE, MANNEQUIN_SEASON_LARGE, MERCY_LAKE_LARGE, SILVER_THREADS_LARGE,
  SWEETWATER_LARGE,
} from "./art-large.js";
import { theme } from "../../session/theme.js";

export const ART_KEYS = ["title", "monster", "weakness", "won", "lost"] as const;
export type ArtKey = (typeof ART_KEYS)[number];
/** One size of every piece: title (hunt starts), monster (first clear sighting), weakness (how to stop it), won, lost. */
export type ArtSet = Record<ArtKey, string>;
/** Largest first. */
export type ArtVariants = readonly string[];
export type MysteryArt = Record<ArtKey, ArtVariants>;

export const SMALL_WIDTH = 40;
export const LARGE_WIDTH = 72;

function sized(large: ArtSet, small: ArtSet): MysteryArt {
  return Object.fromEntries(ART_KEYS.map((k) => [k, [large[k], small[k]]])) as unknown as MysteryArt;
}

const MERCY_LAKE_SMALL: ArtSet = {
  title: String.raw`
               _
              (_)
             _/ \_
            |  *  |
            | *** |
            |__*__|
              | |
   ~    ~   ~  ~~~  ~   ~    ~
 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ~~    ~   ~~~~   ~    ~~
`,
  monster: String.raw`
              .---.
             ( o o )
              \ ~ /        _
           ___/   \___    (_)
          /  OILSKIN  \__/ \_
          |  |     |  | |*|
          |  |     |  |  ~
   ~   ~  |__|_____|__|   ~   ~
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       the Lantern Keeper
`,
  weakness: String.raw`
             _
            (_)
           _/ \_
          | *** |     the lantern
          |__*__|     goes home
        ___________
       |   ABEL    |
       |   CRANE   |
       |   1911    |
    ___|___________|___
`,
  won: String.raw`
           \    |    /
         '.  \  |  /  .'
       -----   \|/   -----
         .'    /|\    '.
   ____________________________
     ~    ~      ~     ~    ~
     the lake is only a lake
`,
  lost: String.raw`
                |\
                | \
                |  \
           _____|___\____
           \  .  .  .  . /
   ~~~~~~~~~\___________/~~~~~~~~
     ~~   ~     ~~~    ~     ~~
    the ferry crosses at dawn
`,
};

const MANNEQUIN_SEASON_SMALL: ArtSet = {
  title: String.raw`
  ______________________________
 |      DELACROIX  &  SONS      |
 |______________________________|
 |   ___        O         ___   |
 |  |   |      /|\       |   |  |
 |  |   |       |        |   |  |
 |  |___|      / \       |___|  |
 |_____________|________________|
     EVERYTHING  MUST  GO
`,
  monster: String.raw`
              ___
             (o o)
              \-/
           ___/ \___
          /  | . |  \
         /|  | . |  |\
        / |  |___|  | \    8<
           \  | |  /
            | | | |
            |_| |_|
       the Window Dresser
`,
  weakness: String.raw`
        ___         ___
       /   \       /   \
      |  O  |     |  O  |
       \___/\     /\___/
             \   /
              \ /
               X
              / \
             /   \
            V     V
       the brass shears
`,
  won: String.raw`
  ______________________________
 |                              |
 |        C L O S E D           |
 |   thank you for forty years  |
 |                              |
 |______________________________|
      the mannequins are only
      wood again
`,
  lost: String.raw`
  ______________________________
 |  O   O   O   O   O   O   O   |
 | /|\ /|\ /|\ /|\ /|\ /|\ /|\  |
 | / \ / \ / \ / \ / \ / \ / \  |
 |______________________________|
      NOW OPEN  --  FOREVER
`,
};

const SILVER_THREADS_SMALL: ArtSet = {
  title: String.raw`
      \  \    |    /  /
       \  \   |   /  /
        '-.\  |  /.-'
            (o.o)
        .-'/  |  \'-.
       /  /   |   \  \
    __/__/____|____\__\__
   /                     \
  |   HOLLISTER  &  SONS  |
   \_____________________/
`,
  monster: String.raw`
     \   \   \    |    /   /   /
      '.  '.  \   |   /  .'  .'
        '-._'. \  |  / .'_.-'
             ( O  .  O )
         .-''/ / /|\ \ \''-.
        /   / / / | \ \ \   \
       /   /  the brood  \   \
            mother wakes
`,
  weakness: String.raw`
                 )
                ) \
               / ) (
               \(_)/
                |=|
                | |
                | |
                |_|
        burn her, and burn her
        before she runs
`,
  won: String.raw`
          (   )    (   )
           ) (      ) (
          (   )    (   )
       _______________________
      /        P E L L        \
     |    _________________    |
     |   |                 |   |
     |___|_________________|___|
        the threads go still
`,
  lost: String.raw`
    ____________________________
   |  PELL'S CROSSING, KY       |
   |  pop. 2,114                |
   |       [ SANITIZED ]        |
   |____________________________|
               ||
               ||
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`,
};

const LOW_SIGNAL_SMALL: ArtSet = {
  title: String.raw`
        _____
       |  *  |
       '-----'
          |               O
          |              /|\
          |              / \
     _____|______________________
     ..##..
    .#####.    the shadow walks
     /   \     on its own
`,
  monster: String.raw`
          ############
         ##############
         ####  ##  ####
         ##############
          ############
            ########
       ####################
      ######################
     the Penumbra, flat as ink
`,
  weakness: String.raw`
       \    \    |    /    /
        \    \   |   /    /
         '----.--+--.----'
              / ___ \
             | (   ) |
              \ --- /
               '---'
         the lens, fully lit
`,
  won: String.raw`
     _____              _____
    |  *  |            |  *  |
    '-----'            '-----'
       |        O         |
       |       /|\        |
       |       / \        |
    ___|_______|_|________|___
               ##
              ####   shadows home
`,
  lost: String.raw`
      .   .        .   .
                            .   .
          .   .
                    .   .
    .   .
  ______________________________
   Marrow Falls, after midnight
`,
};

const SWEETWATER_SMALL: ArtSet = {
  title: String.raw`
             +
             |
            / \
           /   \
   ~~~~~~~/_____\~~~~~~~~~~~~~~~
  ~~  ~~   |   |  ~~   (o)(o) ~~
 ~   ~~    |___|   ~~   \__/   ~
 ================================
 |  |  |  SWEETWATER DAM  |  |  |
`,
  monster: String.raw`
           .-"""""-.
          /  O   O  \
         |    ___    |
         |   \___/   |
          \_________/
           /|  +  |\
          / |  +  | \
         (  |_____|  )
            /     \
          _/       \_
      Deacon Amos Marlowe
`,
  weakness: String.raw`
      .-----.
     /  .-.  \_____________________
     |  '-'   _____________  _  _  |
     \       /             || || |_|
      '-----'              '' ''
          the founders' key
             OLD SLUICE
`,
  won: String.raw`
              \   |   /
           '.  \  |  /  .'
        ------    O    ------
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  ~     ~     still water     ~
  ================================
  | [#######  CLOSED  #######]   |
`,
  lost: String.raw`
  ================================
  |  |  | OPEN |  |  |  |  |  |  |
  |__|__|______|__|__|__|__|__|__|
   \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
    \\\\\\\\\ ~~~~~ \\\\\\\\\\\\
   ~~~~~~~~~~ (o)(o) ~~~~~~~~~~~
      the Sleeper turns over
`,
};

const COUNTY_FAIR_SMALL: ArtSet = {
  title: String.raw`
            .-"""-.
          .' \ | / '.
         /  _ \|/ _  \
        |--(_)-O-(_)--|
         \    /|\    /
          '. / | \ .'
            /'-+-'\
           /   |   \
     _____/____|____\_____
        PIKE COUNTY FAIR
             ,   ,
            (o . o)  hee hee
`,
  monster: String.raw`
             .  ^  .
            /|\/ \/|\
           ( o  .  o )
            \  ===  /
         ___/'-----'\___
        /    gremlin    \
       |  ___  KING  ___ |
       | (___)      (___)|
       |_________________|
        hubcaps and bells
`,
  weakness: String.raw`
           .-------.
          /  LUCK   \
         |     *     |
          \  1898   /
           '-------'
              | |
         _____|_|_____
        |~~~~~~~~~~~~~|   hot oil
        |_____________|
`,
  won: String.raw`
      *        .  *    .     *
    .   \|/       *      \|/
       --*--   .       --*--
    *   /|\       .      /|\
            .-"""-.
          .' \ | / '.
         |--(_)-O-(_)--|
      the wheel turns, safely
`,
  lost: String.raw`
              .-"""-.
            .' \ | / '.    ~~>
           |--(_)-O-(_)--|   ~~>
            '. / | \ .'    ~~>
              '-.-.-'
     __________________________
       ,  ,     ,  ,     ,  ,
      (o.o)    (o.o)    (o.o)
     next stop: the next town
`,
};

/** For AI-written mysteries. */
const GENERIC_SMALL: ArtSet = {
  title: String.raw`
                 .-.
                (   )      *
         *       '-'
      /\        /\      /\
     /  \  /\  /  \    /  \
    /    \/  \/    \  /    \
   /  /\  \   \  /\ \/  /\  \
  ------------------------------
     something is out there
`,
  monster: String.raw`
  ##############################
  ###########    ###############
  ####  (o)        (o)  ########
  ###########    ###############
  ######################  ######
     it steps into the light
`,
  weakness: String.raw`
       .--.
      / .. \_____________________
      \ '' /  __   __   __   _   |
       '--'  |__| |__| |__| |_|  |
    now you know how to end it
`,
  won: String.raw`
             \    |    /
          '.  \   |   /  .'
       ------    (O)    ------
   ______________________________
         the night is over
`,
  lost: String.raw`
                 .-.
                (   )
                 '-'
   ______________________________
      it goes on, somewhere
`,
};

function tombstone(name: string, width: number, indent: string): string {
  const label = name.length > width - 2 ? name.slice(0, width - 3) + "." : name;
  const pad = width - label.length;
  const centered = " ".repeat(Math.floor(pad / 2)) + label + " ".repeat(Math.ceil(pad / 2));
  const line = (inner: string) => `${indent}| ${inner.padEnd(width)} |`;
  return [
    "",
    `${indent} ${"_".repeat(width + 2)}`,
    `${indent}/${" ".repeat(width + 2)}\\`,
    line(""),
    line(" ".repeat(Math.floor((width - 11) / 2)) + "OUT  OF"),
    line(" ".repeat(Math.floor((width - 11) / 2)) + " ACTION"),
    line(""),
    `${indent}| ${centered} |`,
    line(""),
    `${indent.slice(0, -1)}_|${"_".repeat(width + 2)}|_`,
    "",
  ].join("\n");
}

/** Shown when a hunter is taken out of action; the name is written on the stone. */
export function outOfActionArt(name: string): ArtVariants {
  return [tombstone(name, 25, "               "), tombstone(name, 13, "        ")];
}

/** e.g. "████░░░░ The Plot Thickens" */
export function countdownMeter(step: number, steps: readonly string[]): string {
  const filled = Math.max(0, Math.min(steps.length, step));
  const label = filled ? (steps[filled - 1] ?? "").split(":")[0] : "not started";
  return `${theme.meterFill("█".repeat(filled))}${theme.meterEmpty("░".repeat(Math.max(0, steps.length - filled)))} ${label}`;
}

export const MERCY_LAKE_ART = sized(MERCY_LAKE_LARGE, MERCY_LAKE_SMALL);
export const MANNEQUIN_SEASON_ART = sized(MANNEQUIN_SEASON_LARGE, MANNEQUIN_SEASON_SMALL);
export const SILVER_THREADS_ART = sized(SILVER_THREADS_LARGE, SILVER_THREADS_SMALL);
export const LOW_SIGNAL_ART = sized(LOW_SIGNAL_LARGE, LOW_SIGNAL_SMALL);
export const SWEETWATER_ART = sized(SWEETWATER_LARGE, SWEETWATER_SMALL);
export const COUNTY_FAIR_ART = sized(COUNTY_FAIR_LARGE, COUNTY_FAIR_SMALL);
export const GENERIC_ART = sized(GENERIC_LARGE, GENERIC_SMALL);
