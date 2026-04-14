// NPGX Magazine data — types + demo issues

export interface MagazinePage {
  type: 'cover' | 'contents' | 'photoshoot' | 'article' | 'ad' | 'back-cover'
  image?: string
  title?: string
  subtitle?: string
  body?: string
  character?: string // slug ref
  shotType?: 'hero' | 'full-body' | 'environmental' | 'intimate' | 'action' | 'night-city'
}

export interface MagazineIssue {
  id: string
  issue: number
  title: string
  subtitle: string
  date: string
  price: number
  coverImage: string
  coverLines: string[]
  characters: string[] // character names featured
  pageCount: number
  pages: MagazinePage[]
  locked: boolean // true = must purchase to view
  previewPages: number // how many pages free
}

// Demo issues using existing images
export const NPGX_MAGAZINES: MagazineIssue[] = [
  {
    id: 'issue-001',
    issue: 1,
    title: 'GENESIS',
    subtitle: 'The First Issue',
    date: 'March 2026',
    price: 10,
    coverImage: '/NPG-X-10/a4e7133a-ba6d-451f-8093-42d7b7264073.jpg',
    coverLines: [
      'ARIA KUROSAWA — Tokyo After Dark',
      'GHOST & JINX — Bangkok Backstage',
      'Fiction: The Neon Motel',
      'City Guide: Neo-Tokyo Underground',
    ],
    characters: ['Aria Voidstrike', 'Dahlia Ironveil', 'Ghost Razorthorn', 'Hex Crimsonwire'],
    pageCount: 24,
    pages: [
      // Cover
      { type: 'cover', image: '/NPG-X-10/a4e7133a-ba6d-451f-8093-42d7b7264073.jpg', title: 'NINJA PUNK GIRLS XXX', subtitle: 'ISSUE 1 — GENESIS — $10' },
      // Contents
      { type: 'contents', title: 'CONTENTS', body: 'Welcome to the first issue of Ninja Punk Girls X Magazine. 26 characters. Infinite chaos. This is where it starts.' },
      // Aria photoshoot (5 pages)
      { type: 'photoshoot', image: '/NPG-X-10/3081b9ea-0cf9-4af0-8528-ab839f3f4c92.jpg', character: 'Aria Voidstrike', shotType: 'hero', title: 'ARIA KUROSAWA VOIDSTRIKE' },
      { type: 'photoshoot', image: '/NPG-X-10/357d11bb-f104-4bca-a5da-54a73129d052.jpg', character: 'Aria Voidstrike', shotType: 'full-body' },
      { type: 'photoshoot', image: '/NPG-X-10/54f46950-33b8-438d-be98-2de7ad08c665.jpg', character: 'Aria Voidstrike', shotType: 'environmental' },
      { type: 'photoshoot', image: '/NPG-X-10/add0c067-bff3-48cc-ad02-b027bd42931b.jpg', character: 'Aria Voidstrike', shotType: 'intimate' },
      { type: 'photoshoot', image: '/NPG-X-10/d1b91933-020f-4b83-8bb4-eb55768ab3cf.jpg', character: 'Aria Voidstrike', shotType: 'action' },
      // Article
      { type: 'article', title: 'TOKYO AFTER DARK', subtitle: 'Aria takes us through the neon-lit back alleys of Kabukicho', body: 'The rain hits the pavement like static. Somewhere between the capsule hotels and the pachinko parlors, Aria Kurosawa Voidstrike adjusts her neural interface and smiles. "Tokyo never sleeps," she says, her red-tinted eyes scanning the crowd. "And neither do I."\n\nWe meet at a converted warehouse in Akihabara that serves as both a hacker collective and an underground fight venue. The walls pulse with projected code — cascading kanji mixed with exploit scripts. Aria built this place three years ago when she got bored of corporate infiltration.\n\n"The system is a game," she explains, pouring two glasses of synthetic sake. "And I always win. But it\'s not about winning anymore. It\'s about showing others how to play."\n\nHer latest project: a distributed network of AI-generated content that funds itself through microtransactions. Each image, each video, each piece of digital art is a node in a larger organism. "We\'re building something that lives and breathes," she says. "Something that can\'t be shut down because it exists everywhere at once."' },
      // Dahlia photoshoot (5 pages)
      { type: 'photoshoot', image: '/NPG-X-10/840965fb-7682-4f0c-a3df-86c14df40983.jpg', character: 'Dahlia Ironveil', shotType: 'hero', title: 'DAHLIA HAGIWARA IRONVEIL' },
      { type: 'photoshoot', image: '/NPG-X-10/70de0ca2-3273-4d3c-9418-2451bddbad1a.jpg', character: 'Dahlia Ironveil', shotType: 'full-body' },
      { type: 'photoshoot', image: '/NPG-X-10/a829f0c9-4f78-465d-a101-27fa7f737f0b.jpg', character: 'Dahlia Ironveil', shotType: 'environmental' },
      { type: 'photoshoot', image: '/NPG-X-10/eecaf389-5b2b-42d7-bd12-141d051e716a.jpg', character: 'Dahlia Ironveil', shotType: 'intimate' },
      { type: 'photoshoot', image: '/NPG-X-10/c768ec7e-7116-4d88-8b41-74ef5afc718b.jpg', character: 'Dahlia Ironveil', shotType: 'action' },
      // Article
      { type: 'article', title: 'THE NEON MOTEL', subtitle: 'Fiction — Chapter 1', body: 'The motel sign flickered between pink and dead. PARADISE MOTOR INN, it read, though half the letters had surrendered to rust years ago. Ghost pulled the van into the lot and killed the engine.\n\n"This is it?" Jinx peeled her face off the window. Drool mark on the glass.\n\n"Room 14. The package is under the mattress." Ghost checked her phone — encrypted, burner, bought with cash from a machine in Osaka that no longer existed. "We have forty minutes before the Syndicate knows we\'re here."\n\nJinx cracked her knuckles. The sound was wet, mechanical — she\'d had the joints replaced with titanium inserts after the Bangkok incident. "Forty minutes is thirty-nine more than I need."\n\nThe motel room smelled like cigarettes and regret. Standard issue. Ghost swept for bugs while Jinx flipped the mattress with one arm. Underneath: a titanium case, biometric lock, covered in dust.\n\n"This thing hasn\'t been touched in years," Jinx said.\n\n"That\'s the point." Ghost pressed her thumb to the sensor. The case clicked open.\n\nInside: twenty-six keys. Each one different. Each one glowing faintly with encrypted data.\n\n"One for each of us," Ghost whispered.\n\nTo be continued in Issue 2...' },
      // Ghost photoshoot (5 pages)
      { type: 'photoshoot', image: '/NPG-X-10/f9de0680-55e1-4df1-a8b9-9d78c8c023bf.jpg', character: 'Ghost Razorthorn', shotType: 'hero', title: 'GHOST KAGEMARU RAZORTHORN' },
      { type: 'photoshoot', image: '/NPG-X-10/e98d6256-da35-4559-a65a-4d2329675848.jpg', character: 'Ghost Razorthorn', shotType: 'full-body' },
      { type: 'photoshoot', image: '/NPG-X-10/aa7ccce4-9230-4b4e-bfd6-b50632de1f3e.jpg', character: 'Ghost Razorthorn', shotType: 'environmental' },
      { type: 'photoshoot', image: '/NPG-X-10/865a055b-3292-4486-b11c-d856069e9262.jpg', character: 'Ghost Razorthorn', shotType: 'intimate' },
      { type: 'photoshoot', image: '/NPG-X-10/08a0da98-6cf9-4d84-86ea-7309e6ddd5d7.jpg', character: 'Ghost Razorthorn', shotType: 'action' },
      // City Guide
      { type: 'article', title: 'CITY GUIDE: NEO-TOKYO UNDERGROUND', subtitle: '48 hours in the electric wasteland', body: 'DRINK: Neon Venom Bar (Shinjuku B3F) — Order the "Red Code" cocktail. Don\'t ask what\'s in it.\n\nEAT: Cyber Ramen ₿ (Akihabara) — 24-hour spot. Pay in crypto. The tonkotsu hits different at 4am when you\'re running from corporate security.\n\nSLEEP: Capsule Zero (Shibuya) — Soundproof pods with neural-link charging. No questions asked. Cash only.\n\nINK: Iron Lotus Studio (Harajuku backstreet) — Ask for Yuki. She does bioluminescent tattoos that glow under UV. 3-month waitlist but worth it.\n\nSHOP: VOID Market (underground, location changes weekly — check the encrypted Telegram) — PVC, leather, custom harnesses, modified tech. Everything the surface world doesn\'t want you to have.\n\nSEE: The Fights (Roppongi warehouse district, Fridays after midnight) — Underground combat with augmented fighters. Betting is encouraged. Losing is permanent.\n\nAVOID: Anything above ground after 2am in Kabukicho. The Syndicate runs facial recognition on every street camera. Wear a mask or don\'t go.' },
      // Hex photoshoot (5 pages — using landscape images as they suit the editorial spread feel)
      { type: 'photoshoot', image: '/NPG-X-10/14c025b9-45de-4504-b3c9-afbdd52a6f0e.jpg', character: 'Hex Crimsonwire', shotType: 'hero', title: 'HEX NAKAMURA CRIMSONWIRE' },
      { type: 'photoshoot', image: '/NPG-X-10/1ef5a2ff-6384-4ab9-b078-17a755e5ae29.jpg', character: 'Hex Crimsonwire', shotType: 'full-body' },
      // Back cover
      { type: 'back-cover', title: 'NEXT ISSUE', subtitle: 'Issue 2 — UNDERGROUND — Coming Soon', body: 'Blade Nightshade goes deep cover in Seoul. Echo Neonflare DJs the rave that never ends. Plus: The Neon Motel Chapter 2, Berlin City Guide, and the One-Shot Generator — create your own girl for $99.' },
    ],
    locked: false, // Issue 1 is free as a teaser
    previewPages: 24,
  },
  {
    id: 'issue-002',
    issue: 2,
    title: 'UNDERGROUND',
    subtitle: 'Going Deeper',
    date: 'March 2026',
    price: 10,
    coverImage: '/NPG-X-10/b4b70ed6-023d-4575-8121-2ac28e7edc92.jpg',
    coverLines: [
      'DAHLIA — The Iron Temple Sessions',
      'BLADE NIGHTSHADE — Seoul After Hours',
      'The Neon Motel Ch. 2',
      'Berlin Underground Guide',
    ],
    characters: ['Dahlia Ironveil', 'Blade Nightshade', 'Echo Neonflare', 'Jinx Shadowfire'],
    pageCount: 24,
    pages: [],
    locked: true,
    previewPages: 3,
  },
  {
    id: 'issue-003',
    issue: 3,
    title: 'RED LIGHT',
    subtitle: 'Bangkok Special',
    date: 'April 2026',
    price: 10,
    coverImage: '/NPG-X-10/f9de0680-55e1-4df1-a8b9-9d78c8c023bf.jpg',
    coverLines: [
      'GHOST & ARIA — Double Trouble in Bangkok',
      'Tattoo Special: 10 Artists You Need',
      'Fiction: Neon Motel Ch. 3',
      'Gear Guide: PVC & Leather',
    ],
    characters: ['Ghost Razorthorn', 'Aria Voidstrike', 'Dahlia Ironveil', 'Hex Crimsonwire'],
    pageCount: 24,
    pages: [],
    locked: true,
    previewPages: 3,
  },
  {
    id: 'issue-004',
    issue: 4,
    title: 'VOLTAGE',
    subtitle: 'Electric Dreams',
    date: 'April 2026',
    price: 10,
    coverImage: '/NPG-X-10/e61093d5-3538-4000-aa99-e596739cde6f.jpg',
    coverLines: [
      'ECHO NEONFLARE — The Rave That Never Ends',
      'JINX Goes Blonde',
      'Los Angeles City Guide',
      'Interview: The 26 Keys',
    ],
    characters: ['Echo Neonflare', 'Jinx Shadowfire', 'Ghost Razorthorn', 'Aria Voidstrike'],
    pageCount: 24,
    pages: [],
    locked: true,
    previewPages: 3,
  },
]
