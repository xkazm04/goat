/**
 * The goat, as paths in a 300 by 260 local space with the hooves on y = 250,
 * facing right. One drawing, reused by every piece of brand art so the
 * silhouette is the same on the landing page, an empty state or a card.
 */

export const GOAT_SIZE = { width: 300, height: 260, ground: 250 } as const;

/** The near-side body, head and legs, as one closed silhouette. */
export const BODY =
  'M44 94C66 80 116 72 164 74C196 75 214 66 226 48C233 38 236 30 243 24C253 17 265 22 275 38C283 48 295 52 298 62C299 71 290 76 280 76C278 88 280 102 274 116C266 106 258 94 250 88C244 102 242 116 240 132C239 160 234 186 232 214L230 250L210 250L212 214C212 190 210 164 202 140C178 144 152 144 132 144C126 172 116 204 108 232L104 250L82 250L80 232C74 214 66 198 62 182C56 160 42 134 38 112C35 104 38 96 44 94Z';

/** The far-side legs, a step darker, which gives the standing figure depth. */
export const FAR_LEGS =
  'M200 140L196 200L198 250L180 250L182 200L176 142ZM146 144L134 190L128 250L110 250L114 194L122 146Z';

export const HORN_NEAR =
  'M246 27C241 -3 221 -25 193 -33C169 -39 151 -31 143 -19C163 -25 183 -21 201 -9C217 3 225 21 231 41Z';
export const HORN_FAR =
  'M250 23C254 -3 242 -27 216 -43C200 -53 180 -53 170 -45C188 -45 202 -39 216 -27C232 -13 240 7 242 29Z';
export const EAR = 'M239 35L211 39L237 45Z';
export const TAIL = 'M44 94L28 74L42 100Z';

/** Short strokes across the near horn, for the growth rings. */
export const HORN_RINGS = ['M234 13l-10 3', 'M226 -3l-9 7', 'M211 -15l-6 9', 'M195 -23l-4 9', 'M177 -27l-2 8'];

/** The upper edge only (back, neck, forehead, nose): where the rim light sits. */
export const RIM =
  'M46 92C68 78 116 70 164 72C196 73 214 64 226 46C233 36 236 28 243 22C253 15 265 20 275 36C283 46 295 50 298 60';

/** The upper edge of the near horn, for its rim light. */
export const HORN_RIM = 'M246 27C241 -3 221 -25 193 -33C169 -39 151 -31 143 -19';

export const EYE = { x: 269, y: 38 } as const;
