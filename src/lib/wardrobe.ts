// Central Wardrobe Registry — signature looks + outfits for all NPGX characters
// Separate from soul files (identity) — this is what they WEAR, not who they ARE.
// Agents/skills pull from here when generating images.

export interface Outfit {
  name: string
  prompt: string        // image gen prompt fragment
}

export interface CharacterWardrobe {
  slug: string
  signature: string[]   // items that appear in MOST shots — their visual identity
  palette: string       // dominant color scheme for visual contrast between characters
  outfits: Outfit[]
}

export const WARDROBE: CharacterWardrobe[] = [
  {
    slug: 'aria-voidstrike',
    signature: ['black leather bodysuit', 'holographic visor'],
    palette: 'black + electric blue',
    outfits: [
      { name: 'cyber', prompt: 'black leather bodysuit, holographic visor, thigh-high boots, glowing blue circuit lines' },
      { name: 'infiltration', prompt: 'skin-tight black catsuit, dark hood, minimalist tech jewelry' },
      { name: 'casual', prompt: 'oversized black hoodie, cyber-print leggings, chunky sneakers' },
    ],
  },
  {
    slug: 'blade-nightshade',
    signature: ['twin katana harness', 'dark purple kimono wrap'],
    palette: 'deep purple + black',
    outfits: [
      { name: 'combat', prompt: 'dark purple kimono wrap cut short, twin katana back harness, armored thigh guards, tabi boots' },
      { name: 'stealth', prompt: 'full black shinobi suit, mesh face covering, only eyes visible' },
      { name: 'street', prompt: 'oversized purple bomber jacket, black cargo pants, katana bag slung over shoulder' },
    ],
  },
  {
    slug: 'cherryx',
    signature: ['cherry print crop top', 'paint-splattered accessories'],
    palette: 'cherry red + pink + white',
    outfits: [
      { name: 'street', prompt: 'cherry print crop top, paint-splattered denim shorts, platform sneakers, spray can holster' },
      { name: 'kawaii punk', prompt: 'red plaid skirt, ripped band tee, fishnet sleeves, cherry hair clips' },
      { name: 'studio', prompt: 'paint-covered overalls, bare shoulders, bandana in pink hair' },
    ],
  },
  {
    slug: 'dahlia-ironveil',
    signature: ['oversized pink bow', 'PVC skirt'],
    palette: 'pastel pink + black PVC',
    outfits: [
      { name: 'harajuku', prompt: 'oversized pink bow headband, PVC mini skirt, platform mary janes, lace-trimmed blouse' },
      { name: 'provocateur', prompt: 'pink latex dress, choker with bell, thigh-high boots, cat ear headband' },
      { name: 'casual', prompt: 'cropped kawaii hoodie, high-waist shorts, pink sneakers, too many hair clips' },
    ],
  },
  {
    slug: 'echo-neonflare',
    signature: ['LED-lined headphones', 'neon yellow accents'],
    palette: 'neon yellow + black',
    outfits: [
      { name: 'DJ set', prompt: 'LED-rimmed headphones around neck, neon yellow crop top, black utility pants, glow bracelets' },
      { name: 'rave', prompt: 'reflective silver bodysuit, neon yellow belt harness, platform boots, LED eyelashes' },
      { name: 'street', prompt: 'oversized neon windbreaker, black bike shorts, chunky headphones, high-top sneakers' },
    ],
  },
  {
    slug: 'fury-steelwing',
    signature: ['exosuit shoulder plates', 'metallic silver accents'],
    palette: 'gunmetal silver + red accents',
    outfits: [
      { name: 'mecha', prompt: 'partial exosuit armor plates on shoulders and forearms, red pilot jumpsuit underneath, heavy boots' },
      { name: 'pilot', prompt: 'flight suit unzipped to waist, tank top underneath, dog tags, aviator goggles on forehead' },
      { name: 'off-duty', prompt: 'military green tank top, camo cargo pants, steel-toed boots, mechanical arm visible' },
    ],
  },
  {
    slug: 'ghost-razorthorn',
    signature: ['thorn-blade gauntlets', 'white mask'],
    palette: 'ghost white + dark green thorns',
    outfits: [
      { name: 'predator', prompt: 'white porcelain mask, dark green hooded cloak, thorn-blade gauntlets, barefoot wraps' },
      { name: 'urban', prompt: 'white hoodie pulled low over face, green-tinted glasses, thorn-pattern gloves' },
      { name: 'ceremonial', prompt: 'flowing white kimono with thorn vine embroidery, ceremonial mask, bare feet' },
    ],
  },
  {
    slug: 'hex-crimsonwire',
    signature: ['crimson wire jewelry', 'witch hat with circuitry'],
    palette: 'crimson red + black + copper',
    outfits: [
      { name: 'techno-witch', prompt: 'modified witch hat with copper circuitry, crimson wire necklace, long black dress with circuit patterns, pointed boots' },
      { name: 'hacker', prompt: 'crimson hoodie with wire-pattern print, black pleated skirt, knee-high boots, glowing red rings' },
      { name: 'ritual', prompt: 'flowing crimson robe, bare shoulders, copper wire crown, circuit-etched arm bands' },
    ],
  },
  {
    slug: 'ivy-darkpulse',
    signature: ['vine-wrapped arm', 'green bioluminescent accents'],
    palette: 'forest green + bioluminescent cyan',
    outfits: [
      { name: 'bio-tech', prompt: 'living vine wrapped around left arm, green-tinted lab coat over black bodysuit, bio-luminescent veins visible' },
      { name: 'garden', prompt: 'moss-covered corset, leaf-pattern leggings, barefoot, flowers growing from hair' },
      { name: 'lab', prompt: 'white lab coat with green stains, black turtleneck, vine tendrils emerging from sleeves' },
    ],
  },
  {
    slug: 'jinx-shadowfire',
    signature: ['latex face mask', 'full-sleeve tattoos'],
    palette: 'black latex + orange fire accents',
    outfits: [
      { name: 'chaos', prompt: 'black latex half-mask over lower face, ripped tank top showing full-sleeve tattoos, leather pants, heavy boots, chains' },
      { name: 'street', prompt: 'oversized army jacket covered in patches, torn fishnet top, visible tattoos, combat boots, no mask' },
      { name: 'club', prompt: 'full latex bodysuit, orange-tinted goggles, heavy platform boots, spiked collar' },
    ],
  },
  {
    slug: 'kira-bloodsteel',
    signature: ['bloodforged katana', 'samurai-inspired armor pieces'],
    palette: 'blood red + dark steel',
    outfits: [
      { name: 'ronin', prompt: 'partial samurai armor over one shoulder, torn red hakama pants, bloodforged katana at hip, bandaged chest wrap' },
      { name: 'modern', prompt: 'red leather jacket, black jeans, katana in bag slung across back, steel jewelry' },
      { name: 'ceremonial', prompt: 'full crimson samurai armor with clan markings, dual swords, war paint' },
    ],
  },
  {
    slug: 'luna-cyberblade',
    signature: ['crescent moon headpiece', 'blue-lit cyber armor'],
    palette: 'midnight blue + silver moonlight',
    outfits: [
      { name: 'cyber ninja', prompt: 'crescent moon headpiece, midnight blue cyber armor with silver trim, energy blade at hip, light-step boots' },
      { name: 'hacker', prompt: 'dark blue hoodie, silver circuit-print joggers, holographic wrist displays, moon pendant' },
      { name: 'stealth', prompt: 'skin-tight midnight bodysuit, no reflective surfaces, crescent moon tattoo on neck' },
    ],
  },
  {
    slug: 'mika-stormveil',
    signature: ['storm-grey trench coat', 'lightning-pattern tattoo'],
    palette: 'storm grey + electric white + purple lightning',
    outfits: [
      { name: 'storm', prompt: 'long storm-grey trench coat billowing, white crop top, black pants, lightning-pattern tattoo on arm, static in hair' },
      { name: 'casual', prompt: 'grey oversized sweater, dark leggings, hair wild with static electricity, cloud earrings' },
      { name: 'combat', prompt: 'reinforced grey tactical vest, storm-proof boots, hair tied back, lightning rod gauntlets' },
    ],
  },
  {
    slug: 'nova-bloodmoon',
    signature: ['Victorian choker', 'blood red lips'],
    palette: 'deep black + blood red + moonlight white',
    outfits: [
      { name: 'gothic', prompt: 'Victorian lace choker, long black gothic dress with red lining, pale skin, blood red lips, crescent moon brooch' },
      { name: 'hunt', prompt: 'black leather corset, flowing red cape, thigh-high boots, fangs visible' },
      { name: 'modern goth', prompt: 'black velvet blazer, red silk camisole, dark jeans, Victorian jewelry, parasol' },
    ],
  },
  {
    slug: 'onyx-nightblade',
    signature: ['obsidian chest plate', 'commander insignia'],
    palette: 'pure black + obsidian sheen',
    outfits: [
      { name: 'commander', prompt: 'obsidian chest armor plate, black tactical suit, commander insignia on shoulder, dimensional blade sheathed' },
      { name: 'covert', prompt: 'all-black stealth suit, no insignia, matte finish, black face wrap' },
      { name: 'officer', prompt: 'black military dress coat, high collar, obsidian buttons, formal boots, gloves' },
    ],
  },
  {
    slug: 'phoenix-darkfire',
    signature: ['bright pink shaggy coat', 'flame-pattern accessories'],
    palette: 'bright pink + orange flame + black',
    outfits: [
      { name: 'signature', prompt: 'bright pink shaggy faux-fur coat, black crop top, ripped black jeans, flame-pattern boots, confident stare' },
      { name: 'stage', prompt: 'pink shaggy crop jacket, leather hotpants, platform boots with flame soles, arms spread' },
      { name: 'street', prompt: 'oversized pink fur coat draped over shoulders, band tee underneath, combat boots, chain accessories' },
      { name: 'combat', prompt: 'pink coat removed and tied at waist, black sports bra, flame-wrapped fists, scowling, battle stance' },
    ],
  },
  {
    slug: 'quinn-voidrazor',
    signature: ['void-black portal gauntlets', 'iridescent hair streaks'],
    palette: 'void black + iridescent shimmer',
    outfits: [
      { name: 'quantum', prompt: 'void-black portal gauntlets on both arms, iridescent bodysuit, hair with rainbow-shimmer streaks, floating pose' },
      { name: 'casual', prompt: 'holographic jacket, black tee, iridescent sneakers, portal-gem earrings' },
      { name: 'combat', prompt: 'lightweight void-armored suit, gauntlets active with swirling portals, ready stance' },
    ],
  },
  {
    slug: 'raven-shadowblade',
    signature: ['feathered shoulder piece', 'shadow-black everything'],
    palette: 'shadow black + deep indigo',
    outfits: [
      { name: 'shadow', prompt: 'black feathered shoulder piece, shadow-weave bodysuit, indigo accents, blade hidden in cloak' },
      { name: 'urban', prompt: 'long black coat, dark indigo scarf, all-black underneath, shadow pooling at feet' },
      { name: 'stealth', prompt: 'matte-black skin-tight suit, no accessories, face half in shadow, indigo eye glow' },
    ],
  },
  {
    slug: 'storm-razorclaw',
    signature: ['titanium claws', 'electric yellow streak in hair'],
    palette: 'electric yellow + titanium grey',
    outfits: [
      { name: 'electric', prompt: 'titanium claw gauntlets crackling with electricity, yellow-streak in dark hair, grey tactical vest, black pants' },
      { name: 'street', prompt: 'yellow lightning-bolt hoodie, grey joggers, claw-mark scratches on clothes, electric spark earrings' },
      { name: 'full power', prompt: 'bare arms with visible electric veins, minimal chest wrap, claw gauntlets fully extended, hair standing on end' },
    ],
  },
  {
    slug: 'trix-neonblade',
    signature: ['neon wrist rigs', 'graffiti-print clothing'],
    palette: 'neon green + neon pink + black',
    outfits: [
      { name: 'street', prompt: 'neon holo-blade wrist rigs, graffiti-print cropped jacket, black shorts, neon sneakers, wild hair' },
      { name: 'hacker', prompt: 'dark hoodie with neon trim, fingerless gloves with wrist rigs, black cargo pants, neon green laces' },
      { name: 'harajuku', prompt: 'neon color-block outfit, platform boots, holographic accessories, wrist rigs as fashion' },
    ],
  },
  {
    slug: 'uma-darkforge',
    signature: ['heavy welding apron', 'mechanical arm brace'],
    palette: 'forge orange + dark iron',
    outfits: [
      { name: 'forge', prompt: 'heavy leather welding apron, mechanical arm brace, tank top, goggles on forehead, burn marks on arms' },
      { name: 'engineer', prompt: 'dark iron-grey jumpsuit, tool belt, heavy boots, welding mask pushed up, grease stains' },
      { name: 'casual', prompt: 'orange flannel shirt rolled to elbows, dark jeans, mechanical brace always on, work boots' },
    ],
  },
  {
    slug: 'vivienne-void',
    signature: ['oversized dark sunglasses', 'all-black designer punk'],
    palette: 'all black + occasional deep violet',
    outfits: [
      { name: 'DJ', prompt: 'oversized dark sunglasses, black designer punk dress, platform boots, deep violet lipstick, no face visible' },
      { name: 'editorial', prompt: 'black avant-garde outfit, structured shoulders, dark veil, architectural silhouette' },
      { name: 'incognito', prompt: 'black turtleneck, black jeans, black coat, enormous sunglasses, completely anonymous' },
    ],
  },
  {
    slug: 'wraith-ironpulse',
    signature: ['ghost-tech bodysuit', 'phasing gauntlets'],
    palette: 'translucent white + pale blue',
    outfits: [
      { name: 'ghost', prompt: 'translucent white ghost-tech bodysuit, phasing gauntlets, pale blue glow, partially transparent' },
      { name: 'infiltrator', prompt: 'grey tactical suit, compact build, pale blue tech accents, phasing gloves' },
      { name: 'off-grid', prompt: 'oversized white hoodie, grey shorts, barefoot, looks like she could disappear any second' },
    ],
  },
  {
    slug: 'xena-crimsonedge',
    signature: ['crimson blade', 'fight wraps'],
    palette: 'crimson + black + gold',
    outfits: [
      { name: 'fighter', prompt: 'crimson blade at hip, black sports bra, fight wraps on hands, low-rise combat pants, gold chain belt' },
      { name: 'champion', prompt: 'crimson leather jacket, gold trim, fight trophy on chain, combat boots, blood-red lipstick' },
      { name: 'underground', prompt: 'torn tank top, tape-wrapped fists, crimson blade strapped to back, sweat and dirt, raw' },
    ],
  },
  {
    slug: 'yuki-blackpaw',
    signature: ['black pup hood', 'paw-print accessories'],
    palette: 'all black + soft grey',
    outfits: [
      { name: 'pup', prompt: 'black neoprene pup hood with floppy ears, black bodysuit, paw-print knee pads, collar with tag' },
      { name: 'casual pup', prompt: 'oversized black sweater with paw prints, black shorts, bare feet, pup ears headband, no speech' },
      { name: 'guard', prompt: 'black tactical pup suit, armored paw gauntlets, muzzle guard, protective stance' },
    ],
  },
  {
    slug: 'zerodice',
    signature: ['pop art print bodysuit', 'holographic dice accessories'],
    palette: 'pop art primaries — red, blue, yellow + black outline',
    outfits: [
      { name: 'pop art', prompt: 'pop art comic-print bodysuit, holographic dice earrings, bold primary colors, thick black outlines on everything' },
      { name: 'glitch', prompt: 'pixelated glitch-pattern dress, digital artifacts around edges, dice pendant, retro-futuristic' },
      { name: 'ASMR', prompt: 'soft pastel hoodie, headphones with dice charms, minimal makeup, close-up ready, gentle expression' },
    ],
  },
]

// Quick lookup
export const WARDROBE_BY_SLUG = Object.fromEntries(
  WARDROBE.map(w => [w.slug, w])
) as Record<string, CharacterWardrobe>

/** Get a random outfit prompt for a character */
export function getOutfitPrompt(slug: string, outfitName?: string): string | undefined {
  const w = WARDROBE_BY_SLUG[slug]
  if (!w) return undefined
  if (outfitName) return w.outfits.find(o => o.name === outfitName)?.prompt
  return w.outfits[Math.floor(Math.random() * w.outfits.length)].prompt
}

/** Get signature items as a prompt fragment */
export function getSignaturePrompt(slug: string): string {
  const w = WARDROBE_BY_SLUG[slug]
  return w ? w.signature.join(', ') : ''
}
