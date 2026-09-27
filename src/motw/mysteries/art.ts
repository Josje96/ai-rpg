/**
 * Terminal art for key moments. Plain ASCII, at most 40 columns so it fits a phone.
 * (No backticks inside String.raw templates.)
 */

export type MysteryArt = {
  /** When the hunt starts. */
  title: string;
  /** The first time the monster is seen clearly. */
  monster: string;
  /** When the hunters learn how to stop it. */
  weakness: string;
  won: string;
  lost: string;
};

export const MERCY_LAKE_ART: MysteryArt = {
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

export const MANNEQUIN_SEASON_ART: MysteryArt = {
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

export const SILVER_THREADS_ART: MysteryArt = {
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

export const LOW_SIGNAL_ART: MysteryArt = {
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

export const SWEETWATER_ART: MysteryArt = {
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

export const COUNTY_FAIR_ART: MysteryArt = {
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
export const GENERIC_ART: MysteryArt = {
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

const TOMBSTONE_WIDTH = 13;

/** Shown when a hunter is taken out of action. */
export function outOfActionArt(name: string): string {
  const label = name.length > TOMBSTONE_WIDTH - 2 ? name.slice(0, TOMBSTONE_WIDTH - 3) + "." : name;
  const pad = TOMBSTONE_WIDTH - label.length;
  const centered = " ".repeat(Math.floor(pad / 2)) + label + " ".repeat(Math.ceil(pad / 2));
  return String.raw`
          _____________
         /             \
        |   OUT  OF     |
        |    ACTION     |
        |               |
        | ${centered} |
       _|_______________|_
`;
}

/** e.g. "[###---] The Plot Thickens" */
export function countdownMeter(step: number, steps: readonly string[]): string {
  const filled = Math.max(0, Math.min(steps.length, step));
  const label = filled ? (steps[filled - 1] ?? "").split(":")[0] : "not started";
  return `[${"#".repeat(filled)}${"-".repeat(steps.length - filled)}] ${label}`;
}
