/**
 * NPGX Card Slots — Equipment categories adapted from NPG's 23-layer system.
 *
 * NPG had: weapons, horns, masks, boots (fantasy combat)
 * NPGX has: outfits, accessories, settings, poses (AI model photography)
 *
 * Each slot has base stats that determine what kind of power it contributes.
 * Cards within each slot inherit and multiply these base stats by rarity.
 */

import type { SlotDefinition, SlotKey, Card, CardStats, Rarity } from './types'
import { RARITY_MULTIPLIERS } from './types'

// ── Slot Definitions ────────────────────────────────────────────────────────

export const SLOTS: Record<SlotKey, SlotDefinition> = {
  hairstyle: {
    key: 'hairstyle',
    name: 'Hairstyle',
    description: 'Hair style, color, and length',
    required: true,
    baseStats: { sty: 3, ste: 1, spe: 1 },
    displayOrder: 1,
  },
  face_accessory: {
    key: 'face_accessory',
    name: 'Face',
    description: 'Masks, visors, goggles, face paint, bandanas',
    required: false,
    baseStats: { ste: 3, sty: 2, ski: 1 },
    displayOrder: 2,
  },
  headpiece: {
    key: 'headpiece',
    name: 'Headpiece',
    description: 'Horns, crowns, halos, antenna, spikes',
    required: false,
    baseStats: { str: 1, spe: 2, ste: 2, sty: 1 },
    displayOrder: 3,
  },
  neckwear: {
    key: 'neckwear',
    name: 'Neckwear',
    description: 'Chokers, collars, chains, pendants, scarves',
    required: false,
    baseStats: { sty: 2, ste: 2, sta: 1 },
    displayOrder: 4,
  },
  top: {
    key: 'top',
    name: 'Top',
    description: 'Crop tops, corsets, jackets, bodysuits, mesh, hoodies',
    required: true,
    baseStats: { sta: 2, sty: 2, ste: 1 },
    displayOrder: 5,
  },
  bottom: {
    key: 'bottom',
    name: 'Bottom',
    description: 'Skirts, shorts, pants, leggings, harnesses',
    required: true,
    baseStats: { spe: 2, sta: 2, sty: 1 },
    displayOrder: 6,
  },
  footwear: {
    key: 'footwear',
    name: 'Footwear',
    description: 'Combat boots, platforms, heels, sneakers, barefoot',
    required: true,
    baseStats: { spe: 3, sta: 2, sty: 1 },
    displayOrder: 7,
  },
  jewellery: {
    key: 'jewellery',
    name: 'Jewellery',
    description: 'Chains, studs, rings, ear cuffs, body chains',
    required: false,
    baseStats: { sty: 3, ski: 2, ste: 1 },
    displayOrder: 8,
  },
  arm_accessory: {
    key: 'arm_accessory',
    name: 'Arms',
    description: 'Gloves, arm warmers, bandages, sleeves, gauntlets',
    required: false,
    baseStats: { str: 3, ski: 2, sta: 1 },
    displayOrder: 9,
  },
  prop_right: {
    key: 'prop_right',
    name: 'Right Hand',
    description: 'Microphone, sword, guitar, spray can, katana, pistol',
    required: false,
    baseStats: { str: 3, spe: 1, ski: 2 },
    displayOrder: 10,
  },
  prop_left: {
    key: 'prop_left',
    name: 'Left Hand',
    description: 'Shield, drink, phone, smoke, chain, second weapon',
    required: false,
    baseStats: { str: 2, spe: 1, ski: 3 },
    displayOrder: 11,
  },
  back_accessory: {
    key: 'back_accessory',
    name: 'Back',
    description: 'Wings, cape, backpack, sword sheath, tail',
    required: false,
    baseStats: { ste: 3, sta: 2, sty: 1 },
    displayOrder: 12,
  },
  setting: {
    key: 'setting',
    name: 'Setting',
    description: 'Location and background environment',
    required: true,
    baseStats: { sta: 1, sty: 1, ste: 1 },
    displayOrder: 13,
  },
  lighting: {
    key: 'lighting',
    name: 'Lighting',
    description: 'Lighting mood and color',
    required: false,
    baseStats: { sty: 3, ste: 3, ski: 2 },
    displayOrder: 14,
  },
  pose: {
    key: 'pose',
    name: 'Pose',
    description: 'Stance, action, expression',
    required: false,
    baseStats: { ski: 2, sty: 2, spe: 1, sta: 1 },
    displayOrder: 15,
  },
}

export const SLOT_ORDER: SlotKey[] = Object.values(SLOTS)
  .sort((a, b) => a.displayOrder - b.displayOrder)
  .map(s => s.key)

export const REQUIRED_SLOTS: SlotKey[] = Object.values(SLOTS)
  .filter(s => s.required)
  .map(s => s.key)

// ── Card Catalogue ──────────────────────────────────────────────────────────
// These are the available cards. Each is a prompt fragment with stats.
// AI generates the actual card image using the character's soul + this fragment.

export const CARD_CATALOGUE: Card[] = [
  // ── Hairstyles ──
  { id: 'hair-twin-tails', slot: 'hairstyle', name: 'Twin Tails', promptFragment: 'hair in twin tails', rarity: 'common', stats: calcStats('hairstyle', 'common'), description: 'Classic anime twin tails' },
  { id: 'hair-mohawk', slot: 'hairstyle', name: 'Spiked Mohawk', promptFragment: 'spiked mohawk hairstyle', rarity: 'uncommon', stats: calcStats('hairstyle', 'uncommon'), description: 'Punk rebellion in hair form' },
  { id: 'hair-shaved-sides', slot: 'hairstyle', name: 'Shaved Sides', promptFragment: 'hair with shaved sides and long top', rarity: 'uncommon', stats: calcStats('hairstyle', 'uncommon') },
  { id: 'hair-braids', slot: 'hairstyle', name: 'Warrior Braids', promptFragment: 'hair in thick warrior braids', rarity: 'rare', stats: calcStats('hairstyle', 'rare') },
  { id: 'hair-flowing-wild', slot: 'hairstyle', name: 'Wild Flow', promptFragment: 'hair flowing wild and untamed', rarity: 'common', stats: calcStats('hairstyle', 'common') },
  { id: 'hair-bob-bangs', slot: 'hairstyle', name: 'Sharp Bob', promptFragment: 'sharp bob cut with straight bangs', rarity: 'common', stats: calcStats('hairstyle', 'common') },
  { id: 'hair-long-straight', slot: 'hairstyle', name: 'Long Straight', promptFragment: 'long straight hair to waist', rarity: 'common', stats: calcStats('hairstyle', 'common') },
  { id: 'hair-space-buns', slot: 'hairstyle', name: 'Space Buns', promptFragment: 'hair in space buns', rarity: 'uncommon', stats: calcStats('hairstyle', 'uncommon') },
  { id: 'hair-cyber-dread', slot: 'hairstyle', name: 'Cyber Dreads', promptFragment: 'neon cyberpunk dreadlocks with fiber optic strands', rarity: 'epic', stats: calcStats('hairstyle', 'epic'), description: 'Hair that glows in the dark' },
  { id: 'hair-holographic', slot: 'hairstyle', name: 'Holographic', promptFragment: 'holographic iridescent hair shifting colors', rarity: 'legendary', stats: calcStats('hairstyle', 'legendary'), description: 'Hair from another dimension' },

  // ── Face Accessories ──
  { id: 'face-gas-mask', slot: 'face_accessory', name: 'Gas Mask', promptFragment: 'wearing industrial gas mask', rarity: 'uncommon', stats: calcStats('face_accessory', 'uncommon') },
  { id: 'face-cyber-visor', slot: 'face_accessory', name: 'Cyber Visor', promptFragment: 'wearing sleek cyber visor across eyes', rarity: 'rare', stats: calcStats('face_accessory', 'rare') },
  { id: 'face-bandana', slot: 'face_accessory', name: 'Skull Bandana', promptFragment: 'skull print bandana over mouth', rarity: 'common', stats: calcStats('face_accessory', 'common') },
  { id: 'face-neon-paint', slot: 'face_accessory', name: 'Neon War Paint', promptFragment: 'neon UV war paint on face', rarity: 'rare', stats: calcStats('face_accessory', 'rare') },
  { id: 'face-led-mask', slot: 'face_accessory', name: 'LED Mask', promptFragment: 'wearing LED light-up mask with patterns', rarity: 'epic', stats: calcStats('face_accessory', 'epic') },
  { id: 'face-holo-visor', slot: 'face_accessory', name: 'Holographic Visor', promptFragment: 'holographic heads-up display visor', rarity: 'legendary', stats: calcStats('face_accessory', 'legendary') },

  // ── Headpieces ──
  { id: 'head-horns', slot: 'headpiece', name: 'Demon Horns', promptFragment: 'demon horns on head', rarity: 'uncommon', stats: calcStats('headpiece', 'uncommon') },
  { id: 'head-crown', slot: 'headpiece', name: 'Spiked Crown', promptFragment: 'black spiked crown', rarity: 'rare', stats: calcStats('headpiece', 'rare') },
  { id: 'head-halo', slot: 'headpiece', name: 'Dark Halo', promptFragment: 'dark metallic halo floating above head', rarity: 'epic', stats: calcStats('headpiece', 'epic') },
  { id: 'head-antenna', slot: 'headpiece', name: 'Neural Antenna', promptFragment: 'cybernetic antenna extending from temple', rarity: 'rare', stats: calcStats('headpiece', 'rare') },
  { id: 'head-cat-ears', slot: 'headpiece', name: 'Cat Ears', promptFragment: 'cyber cat ears on headband', rarity: 'common', stats: calcStats('headpiece', 'common') },

  // ── Neckwear ──
  { id: 'neck-choker', slot: 'neckwear', name: 'Spiked Choker', promptFragment: 'black spiked leather choker', rarity: 'common', stats: calcStats('neckwear', 'common') },
  { id: 'neck-chain', slot: 'neckwear', name: 'Heavy Chain', promptFragment: 'heavy chain necklace', rarity: 'uncommon', stats: calcStats('neckwear', 'uncommon') },
  { id: 'neck-collar', slot: 'neckwear', name: 'Metal Collar', promptFragment: 'industrial metal collar', rarity: 'rare', stats: calcStats('neckwear', 'rare') },
  { id: 'neck-pendant', slot: 'neckwear', name: 'Skull Pendant', promptFragment: 'silver skull pendant on chain', rarity: 'common', stats: calcStats('neckwear', 'common') },
  { id: 'neck-led', slot: 'neckwear', name: 'LED Collar', promptFragment: 'glowing LED collar necklace', rarity: 'epic', stats: calcStats('neckwear', 'epic') },

  // ── Tops ──
  { id: 'top-crop', slot: 'top', name: 'Crop Top', promptFragment: 'black crop top', rarity: 'common', stats: calcStats('top', 'common') },
  { id: 'top-corset', slot: 'top', name: 'PVC Corset', promptFragment: 'black PVC corset laced up', rarity: 'uncommon', stats: calcStats('top', 'uncommon') },
  { id: 'top-leather-jacket', slot: 'top', name: 'Leather Jacket', promptFragment: 'worn leather biker jacket with patches', rarity: 'uncommon', stats: calcStats('top', 'uncommon') },
  { id: 'top-mesh', slot: 'top', name: 'Mesh Top', promptFragment: 'sheer black mesh top', rarity: 'common', stats: calcStats('top', 'common') },
  { id: 'top-bodysuit', slot: 'top', name: 'Latex Bodysuit', promptFragment: 'skin-tight latex bodysuit', rarity: 'rare', stats: calcStats('top', 'rare') },
  { id: 'top-hoodie', slot: 'top', name: 'Oversized Hoodie', promptFragment: 'oversized black hoodie with hood up', rarity: 'common', stats: calcStats('top', 'common') },
  { id: 'top-harness', slot: 'top', name: 'Body Harness', promptFragment: 'leather body harness over top', rarity: 'rare', stats: calcStats('top', 'rare') },
  { id: 'top-cyber-armor', slot: 'top', name: 'Cyber Armor', promptFragment: 'futuristic cyber armor chest plate', rarity: 'epic', stats: calcStats('top', 'epic') },
  { id: 'top-holographic', slot: 'top', name: 'Holographic Top', promptFragment: 'holographic color-shifting top', rarity: 'legendary', stats: calcStats('top', 'legendary') },

  // ── Bottoms ──
  { id: 'bot-mini-skirt', slot: 'bottom', name: 'Mini Skirt', promptFragment: 'black mini skirt', rarity: 'common', stats: calcStats('bottom', 'common') },
  { id: 'bot-cargo', slot: 'bottom', name: 'Cargo Pants', promptFragment: 'black cargo pants with chains', rarity: 'common', stats: calcStats('bottom', 'common') },
  { id: 'bot-pvc-shorts', slot: 'bottom', name: 'PVC Shorts', promptFragment: 'high-waist PVC shorts', rarity: 'uncommon', stats: calcStats('bottom', 'uncommon') },
  { id: 'bot-pleated', slot: 'bottom', name: 'Pleated Skirt', promptFragment: 'plaid pleated school skirt', rarity: 'common', stats: calcStats('bottom', 'common') },
  { id: 'bot-leather-pants', slot: 'bottom', name: 'Leather Pants', promptFragment: 'skin-tight leather pants', rarity: 'uncommon', stats: calcStats('bottom', 'uncommon') },
  { id: 'bot-cyber-leggings', slot: 'bottom', name: 'Cyber Leggings', promptFragment: 'circuit-pattern cyber leggings', rarity: 'rare', stats: calcStats('bottom', 'rare') },

  // ── Footwear ──
  { id: 'foot-combat', slot: 'footwear', name: 'Combat Boots', promptFragment: 'heavy black combat boots', rarity: 'common', stats: calcStats('footwear', 'common') },
  { id: 'foot-platform', slot: 'footwear', name: 'Platform Boots', promptFragment: 'tall platform boots with buckles', rarity: 'uncommon', stats: calcStats('footwear', 'uncommon') },
  { id: 'foot-stiletto', slot: 'footwear', name: 'Blade Heels', promptFragment: 'razor stiletto heels', rarity: 'rare', stats: calcStats('footwear', 'rare') },
  { id: 'foot-sneakers', slot: 'footwear', name: 'Cyberpunk Sneakers', promptFragment: 'neon-accented cyberpunk sneakers', rarity: 'common', stats: calcStats('footwear', 'common') },
  { id: 'foot-thigh-high', slot: 'footwear', name: 'Thigh Highs', promptFragment: 'thigh-high PVC boots', rarity: 'rare', stats: calcStats('footwear', 'rare') },
  { id: 'foot-hover', slot: 'footwear', name: 'Hover Boots', promptFragment: 'levitating hover boots with plasma soles', rarity: 'legendary', stats: calcStats('footwear', 'legendary') },

  // ── Jewellery ──
  { id: 'jew-chains', slot: 'jewellery', name: 'Body Chains', promptFragment: 'silver body chains draped across torso', rarity: 'uncommon', stats: calcStats('jewellery', 'uncommon') },
  { id: 'jew-studs', slot: 'jewellery', name: 'Spike Studs', promptFragment: 'spike stud earrings and lip ring', rarity: 'common', stats: calcStats('jewellery', 'common') },
  { id: 'jew-rings', slot: 'jewellery', name: 'Knuckle Rings', promptFragment: 'heavy knuckle rings on both hands', rarity: 'common', stats: calcStats('jewellery', 'common') },
  { id: 'jew-ear-cuff', slot: 'jewellery', name: 'Cyber Ear Cuff', promptFragment: 'electronic ear cuff with chain to nostril', rarity: 'rare', stats: calcStats('jewellery', 'rare') },
  { id: 'jew-holographic', slot: 'jewellery', name: 'Holo Jewels', promptFragment: 'floating holographic jewelry orbiting body', rarity: 'legendary', stats: calcStats('jewellery', 'legendary') },

  // ── Arms ──
  { id: 'arm-gloves', slot: 'arm_accessory', name: 'Fingerless Gloves', promptFragment: 'black fingerless leather gloves', rarity: 'common', stats: calcStats('arm_accessory', 'common') },
  { id: 'arm-warmers', slot: 'arm_accessory', name: 'Striped Warmers', promptFragment: 'striped arm warmers', rarity: 'common', stats: calcStats('arm_accessory', 'common') },
  { id: 'arm-bandages', slot: 'arm_accessory', name: 'Fight Wraps', promptFragment: 'dirty boxing bandage wraps on hands', rarity: 'uncommon', stats: calcStats('arm_accessory', 'uncommon') },
  { id: 'arm-gauntlet', slot: 'arm_accessory', name: 'Cyber Gauntlet', promptFragment: 'cybernetic gauntlet with built-in screen', rarity: 'epic', stats: calcStats('arm_accessory', 'epic') },
  { id: 'arm-prosthetic', slot: 'arm_accessory', name: 'Prosthetic Arm', promptFragment: 'mechanical prosthetic arm with exposed servos', rarity: 'legendary', stats: calcStats('arm_accessory', 'legendary'), description: 'Wraith pioneered this tech' },

  // ── Props ──
  { id: 'prop-r-katana', slot: 'prop_right', name: 'Katana', promptFragment: 'holding katana sword in right hand', rarity: 'uncommon', stats: calcStats('prop_right', 'uncommon') },
  { id: 'prop-r-mic', slot: 'prop_right', name: 'Microphone', promptFragment: 'holding microphone in right hand', rarity: 'common', stats: calcStats('prop_right', 'common') },
  { id: 'prop-r-guitar', slot: 'prop_right', name: 'Electric Guitar', promptFragment: 'playing electric guitar', rarity: 'rare', stats: calcStats('prop_right', 'rare') },
  { id: 'prop-r-spray', slot: 'prop_right', name: 'Spray Can', promptFragment: 'holding graffiti spray can', rarity: 'common', stats: calcStats('prop_right', 'common') },
  { id: 'prop-r-pistol', slot: 'prop_right', name: 'Neon Pistol', promptFragment: 'neon-lit sci-fi pistol in right hand', rarity: 'rare', stats: calcStats('prop_right', 'rare') },
  { id: 'prop-r-flaming', slot: 'prop_right', name: 'Flaming Sword', promptFragment: 'flaming sword engulfed in fire', rarity: 'legendary', stats: calcStats('prop_right', 'legendary') },
  { id: 'prop-l-shield', slot: 'prop_left', name: 'Riot Shield', promptFragment: 'holding riot shield in left hand', rarity: 'uncommon', stats: calcStats('prop_left', 'uncommon') },
  { id: 'prop-l-drink', slot: 'prop_left', name: 'Neon Cocktail', promptFragment: 'holding glowing neon cocktail', rarity: 'common', stats: calcStats('prop_left', 'common') },
  { id: 'prop-l-phone', slot: 'prop_left', name: 'ClawMiner', promptFragment: 'holding phone with glowing screen', rarity: 'uncommon', stats: calcStats('prop_left', 'uncommon') },
  { id: 'prop-l-chain', slot: 'prop_left', name: 'Chain Whip', promptFragment: 'chain whip wrapped around left arm', rarity: 'rare', stats: calcStats('prop_left', 'rare') },
  { id: 'prop-l-skull', slot: 'prop_left', name: 'Crystal Skull', promptFragment: 'holding glowing crystal skull', rarity: 'epic', stats: calcStats('prop_left', 'epic') },

  // ── Back ──
  { id: 'back-wings', slot: 'back_accessory', name: 'Dark Wings', promptFragment: 'dark feathered wings spread behind', rarity: 'epic', stats: calcStats('back_accessory', 'epic') },
  { id: 'back-cape', slot: 'back_accessory', name: 'Tattered Cape', promptFragment: 'tattered black cape flowing behind', rarity: 'uncommon', stats: calcStats('back_accessory', 'uncommon') },
  { id: 'back-katana-sheath', slot: 'back_accessory', name: 'Katana Sheath', promptFragment: 'katana sheath strapped across back', rarity: 'common', stats: calcStats('back_accessory', 'common') },
  { id: 'back-cyber-wings', slot: 'back_accessory', name: 'Cyber Wings', promptFragment: 'mechanical cyber wings with LED edges', rarity: 'legendary', stats: calcStats('back_accessory', 'legendary') },

  // ── Settings ──
  { id: 'set-tokyo-alley', slot: 'setting', name: 'Tokyo Alley', promptFragment: 'in a dark neon-lit Tokyo alleyway at night', rarity: 'common', stats: calcStats('setting', 'common') },
  { id: 'set-rooftop', slot: 'setting', name: 'Rooftop', promptFragment: 'on a rooftop overlooking neon city skyline at night', rarity: 'uncommon', stats: calcStats('setting', 'uncommon') },
  { id: 'set-studio', slot: 'setting', name: 'Dark Studio', promptFragment: 'in a dark photography studio with dramatic lighting', rarity: 'common', stats: calcStats('setting', 'common') },
  { id: 'set-underground', slot: 'setting', name: 'Underground Club', promptFragment: 'in an underground punk club with graffiti walls', rarity: 'uncommon', stats: calcStats('setting', 'uncommon') },
  { id: 'set-train', slot: 'setting', name: 'Midnight Train', promptFragment: 'inside an empty Tokyo subway car at midnight', rarity: 'rare', stats: calcStats('setting', 'rare') },
  { id: 'set-shrine', slot: 'setting', name: 'Neon Shrine', promptFragment: 'at a Japanese shrine with neon torii gates', rarity: 'rare', stats: calcStats('setting', 'rare') },
  { id: 'set-rain', slot: 'setting', name: 'Rainy Street', promptFragment: 'on rain-slicked street with neon reflections', rarity: 'uncommon', stats: calcStats('setting', 'uncommon') },
  { id: 'set-void', slot: 'setting', name: 'The Void', promptFragment: 'floating in infinite black void with distant stars', rarity: 'legendary', stats: calcStats('setting', 'legendary') },

  // ── Lighting ──
  { id: 'light-neon', slot: 'lighting', name: 'Neon Glow', promptFragment: 'neon pink and blue lighting', rarity: 'common', stats: calcStats('lighting', 'common') },
  { id: 'light-spotlight', slot: 'lighting', name: 'Harsh Spotlight', promptFragment: 'harsh single spotlight from above, deep shadows', rarity: 'uncommon', stats: calcStats('lighting', 'uncommon') },
  { id: 'light-golden', slot: 'lighting', name: 'Golden Hour', promptFragment: 'warm golden hour sunlight', rarity: 'uncommon', stats: calcStats('lighting', 'uncommon') },
  { id: 'light-strobe', slot: 'lighting', name: 'Strobe Flash', promptFragment: 'strobe flash freezing motion', rarity: 'rare', stats: calcStats('lighting', 'rare') },
  { id: 'light-holo', slot: 'lighting', name: 'Holographic', promptFragment: 'holographic prismatic lighting from all angles', rarity: 'legendary', stats: calcStats('lighting', 'legendary') },

  // ── Poses ──
  { id: 'pose-standing', slot: 'pose', name: 'Power Stance', promptFragment: 'standing in confident power stance', rarity: 'common', stats: calcStats('pose', 'common') },
  { id: 'pose-fighting', slot: 'pose', name: 'Fight Ready', promptFragment: 'in martial arts fighting stance', rarity: 'uncommon', stats: calcStats('pose', 'uncommon') },
  { id: 'pose-crouching', slot: 'pose', name: 'Ninja Crouch', promptFragment: 'crouching low in ninja ready position', rarity: 'uncommon', stats: calcStats('pose', 'uncommon') },
  { id: 'pose-leaning', slot: 'pose', name: 'Wall Lean', promptFragment: 'leaning against wall with arms crossed', rarity: 'common', stats: calcStats('pose', 'common') },
  { id: 'pose-action', slot: 'pose', name: 'Mid-Strike', promptFragment: 'in mid-strike action pose with motion blur', rarity: 'rare', stats: calcStats('pose', 'rare') },
  { id: 'pose-floating', slot: 'pose', name: 'Levitation', promptFragment: 'floating in air with energy radiating outward', rarity: 'legendary', stats: calcStats('pose', 'legendary') },
]

// ── Stat Calculation (ported from NPG) ──────────────────────────────────────

function calcStats(slot: SlotKey, rarity: Rarity): CardStats {
  const base = SLOTS[slot].baseStats
  const mult = RARITY_MULTIPLIERS[rarity]
  // Every card has all 6 stats — floor of 1, plus slot bonuses scaled by rarity
  return {
    str: Math.max(1, Math.round((1 + (base.str || 0)) * mult)),
    spe: Math.max(1, Math.round((1 + (base.spe || 0)) * mult)),
    ski: Math.max(1, Math.round((1 + (base.ski || 0)) * mult)),
    sta: Math.max(1, Math.round((1 + (base.sta || 0)) * mult)),
    ste: Math.max(1, Math.round((1 + (base.ste || 0)) * mult)),
    sty: Math.max(1, Math.round((1 + (base.sty || 0)) * mult)),
  }
}

/** Resolve the card image path (generated images live in /cards/{id}.jpg) */
export function getCardImageUrl(cardId: string): string {
  return `/cards/${cardId}.jpg`
}

// ── Catalogue Helpers ───────────────────────────────────────────────────────

export function getCardsBySlot(slot: SlotKey): Card[] {
  return CARD_CATALOGUE.filter(c => c.slot === slot)
}

export function getCardById(id: string): Card | undefined {
  return CARD_CATALOGUE.find(c => c.id === id)
}

export function getCardsByRarity(rarity: Rarity): Card[] {
  return CARD_CATALOGUE.filter(c => c.rarity === rarity)
}

export const CATALOGUE_STATS = {
  totalCards: CARD_CATALOGUE.length,
  bySlot: SLOT_ORDER.reduce((acc, slot) => {
    acc[slot] = getCardsBySlot(slot).length
    return acc
  }, {} as Record<SlotKey, number>),
  byRarity: (['common', 'uncommon', 'rare', 'epic', 'legendary'] as Rarity[]).reduce((acc, r) => {
    acc[r] = getCardsByRarity(r).length
    return acc
  }, {} as Record<Rarity, number>),
}
