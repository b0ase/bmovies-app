import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { character } = await request.json()

    if (!character) {
      return NextResponse.json(
        { error: 'Character data is required' },
        { status: 400 }
      )
    }

    // Generate script based on character
    const script = generateScript(character)

    return NextResponse.json({
      success: true,
      script,
      title: `${character.codename}: Origin Story`,
      genre: 'Action/Cyberpunk',
      duration: '15 minutes',
      scenes: 5,
      message: 'Script generated successfully'
    })

  } catch (error) {
    console.error('Script generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate script' },
      { status: 500 }
    )
  }
}

function generateScript(character: any) {
  const locations = [
    'NEO-TOKYO ROOFTOP',
    'CORPORATE TOWER',
    'UNDERGROUND HIDEOUT',
    'CYBER DISTRICT',
    'ABANDONED WAREHOUSE'
  ]

  const selectedLocation = locations[Math.floor(Math.random() * locations.length)]
  
  return `FADE IN:

EXT. ${selectedLocation} - NIGHT

The city sprawls below, neon lights painting the darkness in electric hues. ${character.name.toUpperCase()} stands silhouetted against the skyline, their ${character.attributes?.hair?.toLowerCase() || 'dark hair'} whipping in the wind.

${character.name.toUpperCase()}
(into comm device)
Target acquired. Moving to intercept.

${character.name} leaps from the rooftop, their ${character.attributes?.element?.toLowerCase() || 'mysterious'} powers crackling around them as they descend toward the corporate tower below.

INT. CORPORATE TOWER - CONTINUOUS

Guards patrol the hallway, unaware of the approaching threat. ${character.name} phases through the window, landing silently behind them.

GUARD 1
Did you hear something?

Before Guard 1 can turn around, ${character.name} strikes with lightning speed, their ${character.attributes?.element?.toLowerCase() || 'deadly'} abilities overwhelming the security systems.

${character.name.toUpperCase()}
(whispers)
Justice comes for those who hide in the shadows.

GUARD 2 rushes in, weapon drawn.

GUARD 2
Freeze! You're surrounded!

${character.name} smirks, their ${character.attributes?.eyes?.toLowerCase() || 'piercing eyes'} glowing with power.

${character.name.toUpperCase()}
I don't think so.

${character.name} unleashes their full ${character.attributes?.element?.toLowerCase() || 'hidden'} power. The room fills with energy as the guards are overwhelmed by the display of strength.

CORPORATE EXECUTIVE (O.S.)
(over intercom)
${character.codename}... we meet at last.

${character.name.toUpperCase()}
Your reign of terror ends tonight.

The ${character.codename?.toLowerCase() || 'warrior'} vanishes into the darkness, leaving only the echo of their words and the scent of ozone in the air.

EXT. CITY SKYLINE - DAWN

${character.name} stands atop the highest building, the city awakening below. Their mission is complete, but the war for justice continues.

${character.name.toUpperCase()}
(voice-over)
They call me ${character.codename}. In a world where corruption runs deep, someone has to stand for what's right. That someone... is me.

FADE TO BLACK.

TITLE CARD: "${character.codename?.toUpperCase() || 'THE LEGEND'}"

FADE OUT.

END SCENE

---

ADDITIONAL SCENES:

SCENE 2: THE ORIGIN
FLASHBACK - ${character.name}'s tragic past that led them to become ${character.codename}.

SCENE 3: THE TRAINING
Montage of ${character.name} mastering their ${character.attributes?.element?.toLowerCase() || 'unique'} abilities.

SCENE 4: THE BETRAYAL
A trusted ally reveals themselves as an enemy, testing ${character.name}'s resolve.

SCENE 5: THE FINAL CONFRONTATION
${character.name} faces their greatest enemy in an epic battle that will determine the fate of the city.

CHARACTER NOTES:
- ${character.name} is ${character.personality?.join(', ').toLowerCase() || 'brave, determined, and skilled'}
- Signature weapon/ability: ${character.attributes?.element || 'Advanced combat skills'}
- Motivation: ${character.backstory || 'To protect the innocent and fight corruption'}
- Weakness: Their compassion for others can be exploited by enemies

VISUAL STYLE:
- Dark, neon-lit cyberpunk aesthetic
- High-contrast lighting
- Fluid action sequences showcasing ${character.attributes?.element?.toLowerCase() || 'combat'} abilities
- Emphasis on ${character.attributes?.style?.toLowerCase() || 'tactical'} movements and stealth

THEMES:
- Justice vs. Corruption
- Individual vs. System
- Power and Responsibility
- Redemption and Sacrifice`
} 