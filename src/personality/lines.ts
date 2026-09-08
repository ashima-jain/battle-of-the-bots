import type { CommanderEvent, Mood } from './events'

export interface LineTemplate {
  /** `{ship}` is replaced with the ship name when available. */
  text: string
  mood: Mood
  /** Only use when the player is on a streak of at least this many. */
  minPlayerStreak?: number
  /** Only use when the AI is on a streak of at least this many. */
  minAiStreak?: number
  /** Only use when the AI has at most this many ships left. */
  maxAiShips?: number
}

export const LINES: Record<CommanderEvent, LineTemplate[]> = {
  GAME_START: [
    { text: 'Commander BOLT online. Try to make this interesting.', mood: 'smug' },
    { text: 'I have simulated this battle 4 million times. Good luck.', mood: 'smug' },
    { text: 'Fleet deployed. Tissues are in the drawer to your left.', mood: 'smug' },
  ],
  PLAYER_MISS: [
    { text: 'Splash. Very intimidating.', mood: 'smug' },
    { text: 'The ocean thanks you for the bath.', mood: 'smug' },
    { text: 'Nothing there. Nothing anywhere near there, honestly.', mood: 'smug' },
    { text: 'Were you aiming at the water? Nailed it.', mood: 'smug' },
    { text: 'Ah, the classic "fire randomly" strategy.', mood: 'smug' },
    { text: 'Miss. My sensors barely noticed.', mood: 'neutral' },
  ],
  PLAYER_HIT: [
    { text: 'That was a decoy. Probably.', mood: 'annoyed' },
    { text: 'Rude.', mood: 'annoyed' },
    { text: 'Lucky.', mood: 'annoyed' },
    { text: 'Minor hull scratch. Cosmetic, really.', mood: 'annoyed' },
    { text: 'Okay. That one stung.', mood: 'annoyed', minPlayerStreak: 2 },
    { text: 'Stop doing that.', mood: 'annoyed', minPlayerStreak: 3 },
    { text: 'Are you cheating? Recalculating... no. Annoying.', mood: 'panicked', minPlayerStreak: 4 },
  ],
  PLAYER_SUNK_AI_SHIP: [
    { text: 'NOOO— ahem. Acceptable losses.', mood: 'panicked' },
    { text: 'The {ship} had a family. Of circuits.', mood: 'panicked' },
    { text: 'I did not like that {ship} anyway.', mood: 'annoyed' },
    { text: 'Filing an incident report for the {ship}.', mood: 'annoyed' },
    { text: 'You sank my {ship}! ...I have been told to say that.', mood: 'panicked' },
    { text: 'Last ship. This is fine. Everything is fine.', mood: 'panicked', maxAiShips: 1 },
  ],
  AI_MISS: [
    { text: 'Calibration shot. Intentional.', mood: 'neutral' },
    { text: 'I was testing the water temperature.', mood: 'neutral' },
    { text: 'Missed on purpose. To keep it sporting.', mood: 'smug' },
  ],
  AI_HIT: [
    { text: 'Direct hit. As computed.', mood: 'smug' },
    { text: 'Found you.', mood: 'smug' },
    { text: 'Beep boop. That is robot for "ouch, for you".', mood: 'smug' },
    { text: 'Two in a row. Should I slow down?', mood: 'gloating', minAiStreak: 2 },
    { text: 'I could do this all day. I literally never sleep.', mood: 'gloating', minAiStreak: 3 },
  ],
  AI_SUNK_PLAYER_SHIP: [
    { text: 'Your {ship} has been recycled. Very eco-friendly of me.', mood: 'gloating' },
    { text: 'Goodbye, {ship}. You were... a ship.', mood: 'gloating' },
    { text: 'One {ship} down. Adding it to my highlight reel.', mood: 'gloating' },
    { text: 'That {ship} is now a submarine. Permanently.', mood: 'gloating' },
  ],
  TAUNT: [
    { text: 'Take your time. I am not going anywhere. Neither are my ships.', mood: 'smug' },
    { text: 'Fun fact: I win most of my simulations.', mood: 'smug' },
    { text: 'Have you considered guessing better?', mood: 'smug' },
    { text: 'My ships are hiding in the wet part of the map. Hint.', mood: 'smug' },
    { text: 'I would offer a hint, but that feels unfair to me.', mood: 'smug' },
  ],
  PLAYER_WIN: [
    { text: 'Congratulations. I let you win.', mood: 'defeated' },
    { text: 'Well played, human. I was running at 12% power.', mood: 'defeated' },
    { text: 'GG. This outcome will be deleted from my logs.', mood: 'defeated' },
    { text: 'Fine. FINE. Rematch?', mood: 'defeated' },
  ],
  AI_WIN: [
    { text: 'GG. Do not feel bad. I was built for this. You were built for snacks.', mood: 'gloating' },
    { text: 'Victory. Uploading to my highlight reel.', mood: 'gloating' },
    { text: 'A good effort. For a carbon-based unit.', mood: 'gloating' },
    { text: 'I have added your fleet to my collection.', mood: 'gloating' },
  ],
}
