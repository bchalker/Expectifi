/**
 * Merges *_why narrative fields into expat-info.json and demographics.json.
 * Uses hand-crafted overrides first, then warm factual fallbacks.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXPAT_JSON_PATH = path.join(__dirname, "../client/src/data/expat-info.json")
const DEMO_JSON_PATH = path.join(__dirname, "../client/src/data/demographics.json")

const REQUIRED_EXPAT_COUNTRIES = [
  "Portugal",
  "Spain",
  "Italy",
  "Greece",
  "France",
  "Mexico",
  "Colombia",
  "Panama",
  "Costa Rica",
  "Thailand",
  "Malaysia",
  "Vietnam",
  "Philippines",
  "Indonesia",
  "Georgia",
  "Japan",
  "South Korea",
  "Uruguay",
  "Ecuador",
  "Malta",
  "Cyprus",
  "Argentina",
  "United Arab Emirates",
  "United Kingdom",
  "Germany",
  "Australia",
  "New Zealand",
  "Oman",
  "Canada",
  "United States",
]

const REQUIRED_DEMO_OVERRIDE_COUNTRIES = [
  "Portugal",
  "Spain",
  "Mexico",
  "Colombia",
  "Thailand",
  "France",
  "Italy",
  "Greece",
  "Panama",
  "Costa Rica",
  "Philippines",
  "Malaysia",
  "Vietnam",
  "Japan",
  "United Arab Emirates",
  "United Kingdom",
  "Germany",
  "Australia",
]

/** @type {Record<string, { community_why: string, expat_vibe_why: string, language_barrier_why: string, healthcare_expat_why: string, cost_note_why: string }>} */
const EXPAT_WHY_OVERRIDES = {
  Portugal: {
    community_why: "You will not feel alone here because there is already a deep American and international support network. The downside is that the most expat-friendly neighborhoods now move fast and can feel crowded.",
    expat_vibe_why: "You get a social, walkable lifestyle with plenty of people in the same life stage. If you only stay in expat circles, your world can shrink faster than you expect.",
    language_barrier_why: "You can handle daily life in English in Lisbon, Porto, and much of the Algarve. Your quality of life drops in local offices and small towns unless you learn practical Portuguese.",
    healthcare_expat_why: "Private care is reliable and usually easier to navigate than the US system for routine needs. Wait times and paperwork still show up, so expect some friction when you first arrive.",
    cost_note_why: "Portugal can still work on a retiree budget, but top coastal markets are not cheap anymore. You need to price in post-2020 rent inflation instead of relying on old expat blog numbers.",
  },
  Spain: {
    community_why: "You will find huge established expat hubs quickly, especially in Madrid, Barcelona, Valencia, and the Costa zones. The tradeoff is that popular expat districts can feel transient and expensive.",
    expat_vibe_why: "Your social options are excellent and it is easy to build a routine around food, walking, and public life. If you avoid local Spanish life, it can feel like long-term tourism instead of a real home.",
    language_barrier_why: "You can get by in English in tourist-heavy areas, but daily admin still expects Spanish. Your stress level drops a lot once you can manage appointments and paperwork in Spanish.",
    healthcare_expat_why: "Care quality is strong, and private insurance gives you a smoother early landing. You still need to budget for policy requirements tied to visa renewals.",
    cost_note_why: "Outside headline cities, value is still strong for Europe. In Barcelona and Madrid, housing pressure can erase the \"cheap Spain\" assumption quickly.",
  },
  Italy: {
    community_why: "You will find strong American and international communities in Rome, Florence, and parts of the south. The catch is that official processes often take patience and repeat visits.",
    expat_vibe_why: "Life can feel deeply rewarding if you care about food culture and slower daily rhythms. It becomes frustrating fast if you expect US-style speed from institutions.",
    language_barrier_why: "English helps in tourist-heavy zones, but daily life still leans hard on Italian. Even basic Italian dramatically improves your housing and bureaucracy outcomes.",
    healthcare_expat_why: "Healthcare quality is generally very good, and many expats are happy once settled. The hard part is learning where to go and how to navigate regional systems.",
    cost_note_why: "You can keep costs reasonable outside Milan and central Rome. Prime historic areas and top destinations now price more like major international cities.",
  },
  Greece: {
    community_why: "You will find welcoming expat pockets in Athens, Crete, and major islands. Smaller communities mean fewer hand-holding resources once you leave popular areas.",
    expat_vibe_why: "You get a laid-back Mediterranean pace with genuinely warm local hospitality. Seasonal island dynamics can make social and practical life swing wildly during the year.",
    language_barrier_why: "English is common in tourism and city centers, so early transition is manageable. Everyday problem-solving still gets easier when you learn basic Greek.",
    healthcare_expat_why: "Private clinics in major centers are a practical path for most expats. On smaller islands, specialist access can be limited and may require travel.",
    cost_note_why: "Good value is still possible compared with much of Western Europe. Island popularity and summer demand can push housing and services much higher than expected.",
  },
  France: {
    community_why: "You will find long-standing expat infrastructure, especially in Paris and popular regional hubs. The downside is that easy-entry neighborhoods are often the most expensive and competitive.",
    expat_vibe_why: "You can build a high-quality daily routine with great transit, food, and culture. If you resist local norms, France can feel colder than it actually is.",
    language_barrier_why: "You can survive in English in parts of Paris and big cities, but administration runs in French. Your experience improves sharply once you can handle French phone calls and forms.",
    healthcare_expat_why: "Healthcare quality is a major strength and often a reason retirees stay long term. Early setup can be document-heavy, so expect a slower onboarding phase.",
    cost_note_why: "France can be very manageable outside elite city centers and peak tourist zones. Paris and premium southern markets can burn through budget faster than planned.",
  },
  Mexico: {
    community_why: "You will find one of the largest American retiree networks in the world, so setup help is easy to find. The downside is that popular expat towns can feel saturated and less local each year.",
    expat_vibe_why: "You can choose between beach, colonial, and urban lifestyles without losing access to familiar expat services. Some areas feel like bubbles, so intentional local integration matters.",
    language_barrier_why: "You can live comfortably in English in major expat hubs. Spanish still becomes essential when you deal with government offices or local healthcare systems.",
    healthcare_expat_why: "Private healthcare is a real advantage for cost and access compared with the US. Quality varies by city, so choose location with healthcare depth in mind.",
    cost_note_why: "Mexico can still deliver strong value, especially outside premium enclaves. In high-demand expat markets, housing costs now look closer to mid-tier US metros.",
  },
  Colombia: {
    community_why: "You will find active expat scenes in Medellin and Bogota with strong peer support. Outside those hubs, practical support can thin out quickly.",
    expat_vibe_why: "You get high energy, social cities, and a younger international mix than many retiree destinations. Some neighborhoods are changing fast, so vibe and safety can vary block by block.",
    language_barrier_why: "English works in some expat-heavy zones but not reliably in daily life. Functional Spanish is one of the biggest quality-of-life upgrades you can make here.",
    healthcare_expat_why: "Private healthcare in major cities is often excellent value and a core reason expats stay. You still need to be selective about providers and insurance coverage.",
    cost_note_why: "Costs remain attractive compared with many North American cities. Prime expat neighborhoods have risen enough that you need current local pricing, not old guides.",
  },
  Panama: {
    community_why: "You will find a mature retiree ecosystem built around the Pensionado pathway and long-time expat hubs. The same hotspots can feel insular if you want deeper local integration.",
    expat_vibe_why: "Life is straightforward for US retirees because of the dollar economy and familiar services. You can end up in a comfort bubble unless you make deliberate local connections.",
    language_barrier_why: "English works well in many expat and business areas, especially in Panama City. Spanish still matters for smoother day-to-day life outside those zones.",
    healthcare_expat_why: "Panama City offers strong private care with good specialist depth for the region. Quality and convenience drop in smaller towns, so location choice is key.",
    cost_note_why: "Panama can be good value if you use interior or secondary markets. Prime city and beach areas can be much pricier than people assume from older retiree writeups.",
  },
  "Costa Rica": {
    community_why: "You will find a long-established American retiree community with abundant relocation resources. Popular expat corridors can feel less local and more competitive than expected.",
    expat_vibe_why: "The pace is calmer and wellness-focused, which many retirees love. If you expect US-level service speed everywhere, daily errands can test your patience.",
    language_barrier_why: "English is common in tourist and expat zones, so transition is usually gentle. Spanish becomes important once you move beyond expat infrastructure.",
    healthcare_expat_why: "Healthcare access is a major plus, with both public and private pathways used by expats. Specialist timelines and logistics can still vary by region.",
    cost_note_why: "Costa Rica is no longer \"cheap tropical living\" in many high-demand areas. You can still control costs, but location choice matters more than ever.",
  },
  Thailand: {
    community_why: "You will find large, active expat communities in Bangkok, Chiang Mai, and coastal retiree hubs. In very expat-heavy zones, turnover can make deeper friendships harder.",
    expat_vibe_why: "Daily life is convenient, social, and often very comfortable on a retiree budget. Visa rules and policy shifts can create background uncertainty you should plan for.",
    language_barrier_why: "You can manage a lot in English in core expat and tourism areas. Outside those zones, language gaps can slow down healthcare, housing, and official tasks.",
    healthcare_expat_why: "Private hospitals are a real strength and often deliver excellent value for quality. Long-term peace of mind still depends on insurance and a clear serious-care plan.",
    cost_note_why: "Thailand can deliver strong value, especially away from luxury districts. Premium neighborhoods and island hotspots can run much higher than headline averages.",
  },
  Malaysia: {
    community_why: "You will find a diverse expat mix and strong long-stay culture, especially in Kuala Lumpur and Penang. Some districts are so expat-focused that local integration takes extra effort.",
    expat_vibe_why: "Your daily life can be very easy thanks to multilingual services and modern infrastructure. Program rules and tier requirements can shift, so paperwork awareness matters.",
    language_barrier_why: "English usage is a major advantage and lowers transition friction immediately. You still benefit from basic local language familiarity outside expat-heavy settings.",
    healthcare_expat_why: "Private healthcare quality is consistently strong and widely cited by retirees. You still need a disciplined insurance strategy for long-term certainty.",
    cost_note_why: "Malaysia remains strong value relative to many developed markets. Top condo zones in KL can creep up enough to surprise first-time movers.",
  },
  Vietnam: {
    community_why: "You will find growing expat clusters in Ho Chi Minh City, Hanoi, Da Nang, and Hoi An. Outside major hubs, support networks are still thinner than in older retiree markets.",
    expat_vibe_why: "You get energetic cities, strong food culture, and a relatively low day-to-day burn rate. Rapid urban change can make neighborhoods feel unstable from year to year.",
    language_barrier_why: "English works in many expat-facing businesses, especially in major districts. Daily tasks still get much easier when you learn key Vietnamese basics.",
    healthcare_expat_why: "Major-city international hospitals can handle most needs reasonably well. For complex cases, many expats still keep regional backup options in mind.",
    cost_note_why: "Vietnam can be very cost-effective if you choose neighborhoods carefully. Premium expat districts have risen enough that \"ultra-cheap\" assumptions can miss reality.",
  },
  Philippines: {
    community_why: "You will find a large American-linked retiree community and culturally familiar social environment. In some hotspots, infrastructure and service consistency can lag behind demand.",
    expat_vibe_why: "The social transition is often easier here than almost anywhere in Asia because of language and cultural overlap. Your experience varies a lot by city quality and local logistics.",
    language_barrier_why: "English fluency is a major strength and reduces daily friction quickly. Regional differences still matter, so local context can affect communication quality.",
    healthcare_expat_why: "Major urban centers provide practical private-care options for many retirees. Outside top cities, provider depth can narrow, so location planning is critical.",
    cost_note_why: "The Philippines can still be budget-friendly, especially outside premium districts. Manila high-end zones can erase much of the expected savings.",
  },
  Indonesia: {
    community_why: "You will find very strong expat density in Bali and selected urban hubs. Outside those clusters, expat support is thinner and processes can feel harder to navigate.",
    expat_vibe_why: "You can build an appealing lifestyle with strong wellness and social scenes, especially in Bali. Popular areas can become crowded and trend-driven quickly.",
    language_barrier_why: "English is common in major expat zones but not universal beyond them. Basic Bahasa skills help a lot when you handle local services and contracts.",
    healthcare_expat_why: "Routine private care can work well in key centers used by expats. For higher-complexity care, many residents still maintain regional contingency plans.",
    cost_note_why: "Indonesia can be inexpensive outside top expat enclaves. In Bali hotspots, rents and service prices have climbed sharply with demand.",
  },
  Georgia: {
    community_why: "You will find a fast-growing international crowd, especially in Tbilisi. Rapid growth means community depth varies and the scene can feel temporary.",
    expat_vibe_why: "Georgia gives you a low-cost, high-flexibility lifestyle with a creative social mix. Systems are still maturing, so consistency is not always there yet.",
    language_barrier_why: "English is improving quickly in expat-facing areas, but it is not universal. Daily life outside central districts gets easier with even basic Georgian or Russian awareness.",
    healthcare_expat_why: "Private care access has improved and can cover routine needs at reasonable cost. For complex care, many expats still plan for treatment abroad.",
    cost_note_why: "Georgia can still be excellent value compared with most European alternatives. Since 2022, top neighborhoods are no longer as cheap as older guides suggest.",
  },
  Japan: {
    community_why: "You will find established expat communities in Tokyo and other major metros, but social circles can take time to build. Outside big cities, finding your people may feel slower.",
    expat_vibe_why: "You get safety, reliability, and world-class urban infrastructure. The lifestyle is rewarding, but cultural and procedural expectations can feel rigid at first.",
    language_barrier_why: "You can navigate some city life in English, especially in major hubs. Long-term comfort rises dramatically if you can handle everyday Japanese interactions.",
    healthcare_expat_why: "Healthcare quality is excellent and a major long-term advantage once you are integrated. Early navigation can be challenging without language support.",
    cost_note_why: "Japan is not uniformly expensive, and many cities are manageable on a disciplined budget. Prime central Tokyo living can still rival major global capitals.",
  },
  "South Korea": {
    community_why: "You will find active expat pockets in Seoul and selected cities, with younger international communities growing. Outside those pockets, support resources can be more limited.",
    expat_vibe_why: "Life can be highly convenient and modern with strong transit and service infrastructure. Social integration can feel hard if you stay only in foreigner-heavy enclaves.",
    language_barrier_why: "English access is improving, especially in urban professional areas. Daily errands still get much easier if you can handle basic Korean.",
    healthcare_expat_why: "Healthcare quality is excellent and usually efficient in major cities. Communication comfort can vary by provider unless you use expat-oriented clinics.",
    cost_note_why: "Seoul can be expensive depending on district and housing expectations. Outside premium neighborhoods, value is usually much better.",
  },
  Uruguay: {
    community_why: "You will find a smaller but stable expat network, especially around Montevideo and coastal areas. Because the community is smaller, specialized expat services can be less abundant.",
    expat_vibe_why: "You get a calmer pace and strong institutional stability that many retirees value. If you want nonstop social energy, it can feel quieter than larger expat markets.",
    language_barrier_why: "English support exists but is limited outside expat-friendly circles. Spanish is important for smoother healthcare, housing, and everyday life.",
    healthcare_expat_why: "Private healthcare options are generally solid and practical for retirees. As in any smaller market, provider choice can be narrower than in giant capitals.",
    cost_note_why: "Uruguay costs more than many Latin American peers, but that often reflects stability and services. You need to budget accordingly rather than assuming regional pricing.",
  },
  Ecuador: {
    community_why: "You will find long-running expat communities, especially in Cuenca, with lots of peer guidance. In less established towns, support can drop off quickly.",
    expat_vibe_why: "Daily life can be comfortable and community-oriented at a slower pace. Local conditions and infrastructure vary more by city than newcomers expect.",
    language_barrier_why: "English support is decent in key expat hubs. Spanish still becomes essential once you move beyond those neighborhoods.",
    healthcare_expat_why: "Private care in core expat cities can be a strong value proposition. Quality and specialty access become less predictable in smaller markets.",
    cost_note_why: "Ecuador can still be one of the better value options in the region. Rising demand in top expat zones means current local rent data matters a lot.",
  },
  Malta: {
    community_why: "You will find a very international population relative to island size, so social entry is easy. The small market means everyone competes for similar housing and services.",
    expat_vibe_why: "The lifestyle is convenient, English-friendly, and socially active. Island scale can feel limiting if you want more space or variety.",
    language_barrier_why: "English is a major advantage, so your transition friction is low from day one. Local nuances still matter in long-term relationships and bureaucracy.",
    healthcare_expat_why: "Healthcare quality is generally strong and communication is easy in English. Capacity is finite on a small island, so timing can matter.",
    cost_note_why: "Malta often costs more than people expect for its size, especially for housing. You can keep value high by being strategic on neighborhood and seasonality.",
  },
  Cyprus: {
    community_why: "You will find a mature expat ecosystem with long-standing British and international communities. In peak expat zones, housing competition can be intense.",
    expat_vibe_why: "Life is relaxed and climate-driven, with plenty of familiar social options. Some areas can feel seasonal, so rhythm changes across the year.",
    language_barrier_why: "English is widely used, making transition relatively smooth for retirees. You still benefit from local language basics when dealing with official matters.",
    healthcare_expat_why: "Private healthcare is accessible and generally dependable for routine care. Specialist access may vary by region, so city choice matters.",
    cost_note_why: "Cyprus can offer good value compared with parts of Western Europe. Prime coastal and expat-heavy towns can still price much higher than expected.",
  },
  Argentina: {
    community_why: "You will find active international communities, especially in Buenos Aires. Economic instability means expat planning conversations can shift quickly.",
    expat_vibe_why: "The lifestyle can be rich, social, and culturally rewarding at a favorable dollar cost. Volatility is the real downside, so flexibility is part of the package.",
    language_barrier_why: "You can find English-speaking circles in core expat neighborhoods. Daily life quality improves significantly once you can operate in Spanish.",
    healthcare_expat_why: "Private healthcare in major cities is a consistent strength for value and quality. You still need to verify provider reliability in your specific area.",
    cost_note_why: "Argentina can deliver strong purchasing power for dollar-based retirees. Currency and policy swings mean your budget assumptions need regular updates.",
  },
  "United Arab Emirates": {
    community_why: "You will find one of the world's most international resident mixes, so building an expat network is easy. The community can be transient, so relationships sometimes cycle quickly.",
    expat_vibe_why: "Daily life is convenient, modern, and highly service-oriented. The pace can feel intense, and long-term belonging can be harder than short-term comfort.",
    language_barrier_why: "English works almost everywhere in day-to-day expat life. Arabic still helps for deeper cultural integration and some official interactions.",
    healthcare_expat_why: "Healthcare quality is high with strong private infrastructure. The downside is cost, so robust insurance is not optional.",
    cost_note_why: "You trade tax advantages for a high housing and service baseline. Budget misses usually come from underestimating lifestyle inflation in Dubai or Abu Dhabi.",
  },
  "United Kingdom": {
    community_why: "You will find a large and established American community, especially in London and major cities. The biggest downside is that prime areas can be financially brutal.",
    expat_vibe_why: "Cultural familiarity makes day one easier than many alternatives. That comfort can hide the need to adapt to different systems and cost structures.",
    language_barrier_why: "Language transition is straightforward for most US retirees. Regional accents and administrative language can still take adjustment.",
    healthcare_expat_why: "Healthcare access is a core quality-of-life anchor once residency is in place. Many expats still choose supplemental private options for speed.",
    cost_note_why: "Outside London, the UK can be much more manageable than people assume. In London and nearby commuter belts, housing can dominate your budget.",
  },
  Germany: {
    community_why: "You will find major expat communities in Berlin, Munich, Hamburg, and Frankfurt. In smaller cities, social entry can be slower and more local-language dependent.",
    expat_vibe_why: "Life is organized, efficient, and practical, which many retirees appreciate. If you prefer loose systems, the structure can feel rigid.",
    language_barrier_why: "English is common in large cities and international workplaces. Administrative life still gets easier once you can handle basic German.",
    healthcare_expat_why: "Healthcare quality is consistently strong and usually a major plus. Insurance rules and paperwork can feel complex at first.",
    cost_note_why: "Germany can offer good value outside the most in-demand neighborhoods. Munich and top-tier city centers can be expensive by European standards.",
  },
  Australia: {
    community_why: "You will find very established international communities in major coastal cities. The challenge is less social and more visa pathway complexity for long-term stays.",
    expat_vibe_why: "Lifestyle quality is high with strong outdoor culture and familiar norms for Americans. Distance from family and long travel times can become a real emotional cost.",
    language_barrier_why: "Language transition is essentially seamless for US retirees. Local terminology and systems still require a short adjustment period.",
    healthcare_expat_why: "Healthcare quality is excellent and dependable in major population centers. Eligibility and private cover choices need early planning based on your status.",
    cost_note_why: "Australia is a high-cost destination in core cities, especially for housing. Value improves outside top metro neighborhoods, but it is rarely a bargain market.",
  },
  "New Zealand": {
    community_why: "You will find welcoming expat communities in Auckland, Wellington, and selected regional hubs. Smaller population means fewer niche services than larger countries.",
    expat_vibe_why: "The lifestyle is calm, outdoors-focused, and often excellent for quality of life. Geographic remoteness can feel isolating over time for some retirees.",
    language_barrier_why: "Language transition is very easy for English-speaking retirees. Practical adaptation is more about systems and location tradeoffs than communication.",
    healthcare_expat_why: "Healthcare standards are strong, with dependable care in major centers. In smaller areas, specialist access can require more travel and patience.",
    cost_note_why: "New Zealand is not cheap, especially in housing-constrained cities. Budget discipline matters more here than the laid-back reputation suggests.",
  },
  Oman: {
    community_why: "You will find a smaller but friendly expat community, especially in Muscat. The smaller network means fewer ready-made retiree support channels.",
    expat_vibe_why: "Life is calmer than some Gulf alternatives and often feels safer and less rushed. Entertainment and social variety can feel limited if you want big-city pace.",
    language_barrier_why: "English is usable in many expat-facing settings in Muscat. Arabic becomes important once you move beyond core expat routines.",
    healthcare_expat_why: "Private healthcare in Muscat can cover routine needs well. Serious-care planning still requires good insurance and provider mapping.",
    cost_note_why: "Oman can be better value than neighboring Gulf hotspots. Housing and imported lifestyle costs can still surprise first-time movers.",
  },
  Canada: {
    community_why: "You will find one of the easiest social transitions from the US with large American communities in major metros. Top markets can feel crowded and expensive quickly.",
    expat_vibe_why: "Daily life feels familiar but with different healthcare and tax realities. Climate and winter duration can be a bigger lifestyle factor than many expect.",
    language_barrier_why: "Language is straightforward in most provinces, so transition friction is low. In Quebec, French can become important for full integration.",
    healthcare_expat_why: "Healthcare quality is strong and long-term coverage is a major draw once eligibility is in place. Wait times for non-urgent care are a real planning factor.",
    cost_note_why: "Canada can be expensive in housing-heavy metros like Vancouver and Toronto. Mid-size cities can offer a much better balance for retirees.",
  },
  "United States": {
    community_why: "You already have full domestic support networks, institutions, and familiar systems. The downside is that cost and policy outcomes vary dramatically by state.",
    expat_vibe_why: "Staying in the US removes immigration friction and keeps family access simple. You still need to choose location carefully because lifestyle quality differs widely.",
    language_barrier_why: "Language is not a barrier, so your transition burden is minimal. Regional systems and local bureaucracy can still feel very different across states.",
    healthcare_expat_why: "You keep full continuity with Medicare and existing provider ecosystems. Out-of-pocket risk still requires careful plan design and state-level comparison.",
    cost_note_why: "US retirement costs can range from very manageable to very high depending on state and metro. Your location decision is the single biggest lever.",
  },
}

/** @type {Record<string, { religion: { expat_worship_why: string }, demographics: { expat_population_why: string, common_languages_why: string } }>} */
const DEMO_WHY_OVERRIDES = {
  Portugal: {
    religion: {
      expat_worship_why: "If faith community matters to you, Portugal is easy to navigate because Catholic institutions are everywhere and international services exist in major hubs. Outside Lisbon and Porto, your options narrow and are more local-language first.",
    },
    demographics: {
      expat_population_why: "The expat base is already large enough that you can get practical relocation guidance quickly. That popularity also means more competition in the same neighborhoods and services.",
      common_languages_why: "English usage in major expat areas lowers your startup friction a lot. Portuguese still matters for deeper integration and smoother admin life.",
    },
  },
  Spain: {
    religion: {
      expat_worship_why: "You can usually find both traditional Catholic and international worship options in big expat cities. In smaller towns, options are less diverse and usually Spanish-led.",
    },
    demographics: {
      expat_population_why: "Spain's large foreign resident base makes it easier to build a social circle fast. In high-demand expat zones, popularity can push costs and crowding.",
      common_languages_why: "English works in many tourist and expat districts, but bureaucracy still runs in Spanish. Functional Spanish gives you much better control over daily decisions.",
    },
  },
  Mexico: {
    religion: {
      expat_worship_why: "If worship access matters, Mexico is straightforward because Catholic churches are everywhere and English-language options are common in expat hubs. In less expat-heavy cities, service language becomes more Spanish-dependent.",
    },
    demographics: {
      expat_population_why: "The huge American expat population means there is a playbook for almost every relocation step. In major enclaves, that same demand can reshape neighborhoods and pricing.",
      common_languages_why: "You can function in English in many retiree destinations early on. Your independence rises quickly once you can handle daily Spanish interactions.",
    },
  },
  Colombia: {
    religion: {
      expat_worship_why: "You will find strong Christian infrastructure and growing expat-oriented congregations in major cities. Outside those centers, English-language worship can be limited.",
    },
    demographics: {
      expat_population_why: "Medellin and Bogota now have enough expat depth to support newcomers well. Concentration in a few areas means your city choice has outsized impact.",
      common_languages_why: "English support exists in specific neighborhoods, but Spanish still drives most daily life. Language investment is one of the fastest ways to reduce friction.",
    },
  },
  Thailand: {
    religion: {
      expat_worship_why: "You can keep religious continuity through international churches in major expat hubs while living in a predominantly Buddhist culture. Outside those hubs, options can thin out quickly.",
    },
    demographics: {
      expat_population_why: "Large expat numbers mean you can find peer communities at many budget levels. Fast-moving expat neighborhoods can feel transient instead of rooted.",
      common_languages_why: "English works in core tourism and expat zones, so transition is manageable. For long-term ease, basic Thai helps with healthcare and local services.",
    },
  },
  France: {
    religion: {
      expat_worship_why: "France gives you broad worship access in major cities, including established international congregations. In rural areas, options can be fewer and more language-dependent.",
    },
    demographics: {
      expat_population_why: "A large, mature expat presence gives you plenty of practical support if you choose common destinations. In top hubs, the same demand can compress housing options.",
      common_languages_why: "English can get you started in major cities, especially Paris. French remains essential for durable day-to-day control and administrative confidence.",
    },
  },
  Italy: {
    religion: {
      expat_worship_why: "Catholic infrastructure is abundant, and larger cities offer international congregations. In smaller towns, options are typically local-language and less varied.",
    },
    demographics: {
      expat_population_why: "Italy's established expat nodes make initial settlement easier in the right cities. Outside those nodes, support networks can feel sparse.",
      common_languages_why: "English is useful in tourism-heavy areas but limited for many practical tasks. Basic Italian often determines how smooth your first year feels.",
    },
  },
  Greece: {
    religion: {
      expat_worship_why: "Orthodox institutions are deeply present, and major expat centers add more diverse options. On smaller islands, worship choices are often narrower and local.",
    },
    demographics: {
      expat_population_why: "Greece's growing expat population gives you social momentum without feeling overwhelmingly crowded. The community is still uneven by region, so location matters.",
      common_languages_why: "English helps a lot in tourism-oriented places and early setup. Greek basics still improve everyday confidence and problem-solving.",
    },
  },
  Panama: {
    religion: {
      expat_worship_why: "You can find familiar Christian options easily, including English-language services in key expat hubs. Outside major centers, religious life is more local-language.",
    },
    demographics: {
      expat_population_why: "Panama's retiree-focused expat base makes practical onboarding unusually straightforward. Popularity also concentrates demand in a handful of areas.",
      common_languages_why: "English is widely workable in many expat and business zones. Spanish skills still improve healthcare and everyday independence.",
    },
  },
  "Costa Rica": {
    religion: {
      expat_worship_why: "You will find broad Christian worship access and active English-language communities in key retiree regions. In less expat-heavy towns, options are fewer and more local-language.",
    },
    demographics: {
      expat_population_why: "Large relative expat density means support networks are strong for newcomers. In top retirement corridors, demand pressure can affect housing and services.",
      common_languages_why: "English usage in tourism-heavy zones lowers transition stress quickly. Spanish still gives you more control outside those zones.",
    },
  },
  Philippines: {
    religion: {
      expat_worship_why: "You can keep familiar Christian worship practices very easily because church infrastructure is extensive and culturally central. Regional quality and style still vary by city.",
    },
    demographics: {
      expat_population_why: "The large American-linked expat base makes social and practical onboarding easier than in many Asian markets. Concentration in a few cities means local conditions can differ sharply.",
      common_languages_why: "High English usage is a major transition advantage and reduces daily friction. Local language awareness still helps outside metro expat bubbles.",
    },
  },
  Malaysia: {
    religion: {
      expat_worship_why: "Malaysia's multi-faith landscape gives you broad worship choice in major urban centers. Local legal and cultural norms still matter, so context awareness is important.",
    },
    demographics: {
      expat_population_why: "Large foreign-resident communities create practical support and social depth for retirees. Community distribution is uneven, so city selection is everything.",
      common_languages_why: "Widespread English usage makes first-year adaptation much easier. Learning local language basics still helps in non-expat daily interactions.",
    },
  },
  Vietnam: {
    religion: {
      expat_worship_why: "You can access a mix of worship options in major cities, including English-friendly congregations. Outside those cities, options can be more limited and locally oriented.",
    },
    demographics: {
      expat_population_why: "Vietnam's expat communities are large enough to offer real support in key hubs. The network is still concentrated, so city choice drives your experience.",
      common_languages_why: "English is improving in expat-facing neighborhoods and among younger residents. Practical Vietnamese still helps significantly for long-term comfort.",
    },
  },
  Japan: {
    religion: {
      expat_worship_why: "Major Japanese cities offer international congregations even though the broader culture is not institutionally religion-forward. Outside metro centers, your options can narrow quickly.",
    },
    demographics: {
      expat_population_why: "The expat base in top cities is substantial enough for community support, but integration still takes effort. Outside major hubs, social onboarding can be slower.",
      common_languages_why: "English helps in selected urban contexts but is not enough for full daily independence. Basic Japanese is one of the best investments you can make.",
    },
  },
  "United Arab Emirates": {
    religion: {
      expat_worship_why: "You can find worship options across major faiths because of the country's highly international resident mix. Local norms still set boundaries, so staying informed matters.",
    },
    demographics: {
      expat_population_why: "With an overwhelmingly foreign-born population, expat social entry is usually fast. Communities can be transient, so continuity takes effort.",
      common_languages_why: "English is the practical default for most business and day-to-day interactions. Arabic remains important for deeper cultural fluency and some official settings.",
    },
  },
  "United Kingdom": {
    religion: {
      expat_worship_why: "You can access broad worship options in essentially every major UK city. In smaller areas, variety can narrow, but language is rarely a barrier.",
    },
    demographics: {
      expat_population_why: "A large American expat footprint makes social and professional integration relatively straightforward. In top global cities, demand pressure is the bigger challenge than access.",
      common_languages_why: "Shared language removes a huge chunk of transition risk. Local terminology and systems still take a little adjustment time.",
    },
  },
  Germany: {
    religion: {
      expat_worship_why: "Germany offers broad Christian infrastructure plus international congregations in major cities. Smaller cities usually have fewer English-language options.",
    },
    demographics: {
      expat_population_why: "Large expat populations in key metros make onboarding more practical and social. Beyond those metros, integration can feel more language-dependent.",
      common_languages_why: "English works well in many urban settings and among younger residents. German remains important for administration and long-term autonomy.",
    },
  },
  Australia: {
    religion: {
      expat_worship_why: "Worship access is broad and familiar in major Australian cities, with strong English-language continuity. Practical differences are more regional than structural.",
    },
    demographics: {
      expat_population_why: "Australia's large international communities make social entry easier for US retirees. Visa eligibility, not community availability, is usually the harder part.",
      common_languages_why: "Shared language removes most communication friction from day one. Regional service access and distance matter more than language for lifestyle quality.",
    },
  },
}

function assertCoverage() {
  const missingExpat = REQUIRED_EXPAT_COUNTRIES.filter((name) => !EXPAT_WHY_OVERRIDES[name])
  if (missingExpat.length) {
    throw new Error(`Missing expat overrides for: ${missingExpat.join(", ")}`)
  }

  const missingDemo = REQUIRED_DEMO_OVERRIDE_COUNTRIES.filter((name) => !DEMO_WHY_OVERRIDES[name])
  if (missingDemo.length) {
    throw new Error(`Missing demo overrides for: ${missingDemo.join(", ")}`)
  }
}

function fallbackExpatWhy(name, c) {
  const community = (c.community_size || "a developing").toLowerCase()
  const languageBarrier = (c.language_barrier || "").toLowerCase()
  const costNote = c.cost_note || ""

  const languageEase = languageBarrier.includes("none") || languageBarrier.includes("very low")
    ? "Language friction is low in day-to-day life, so you can settle quickly."
    : languageBarrier.includes("low")
      ? "English will cover a lot at first, but your life gets smoother once you add local language basics."
      : languageBarrier.includes("moderate")
        ? "You can start in expat-friendly zones, but regular errands and admin usually require local language effort."
        : "Language is a real planning factor here, especially outside major expat neighborhoods."

  const affordability = /expensive|rising|high|pric/i.test(costNote)
    ? "Costs are climbing in the most popular areas, so real local pricing matters."
    : "Costs can still be manageable if you pick your neighborhood carefully."

  return {
    community_why: `${name} has ${community} expat base, so you can usually find people who have already solved the same relocation problems. Outside established hubs, your support network may be thinner.`,
    expat_vibe_why: "You can build your own rhythm here, but your experience depends heavily on the neighborhood you choose. Visiting for a longer trial stay helps you avoid committing to the wrong micro-market.",
    language_barrier_why: languageEase,
    healthcare_expat_why: "Private care quality and access vary by city, so choose location with healthcare depth instead of assuming national averages. Strong insurance still gives you the best downside protection.",
    cost_note_why: affordability,
  }
}

function fallbackDemoWhy(name, d) {
  const dominant = d?.religion?.dominant || "the local religious landscape"
  const expatPopulation = d?.demographics?.expat_population || "a mixed expat footprint"
  const commonLanguages = d?.demographics?.common_languages || "local and regional languages"

  return {
    religion: {
      expat_worship_why: `${name}'s dominant context is ${dominant}, so you can usually find a path that fits your worship style with some local research. English-language options are typically strongest in larger cities.`,
    },
    demographics: {
      expat_population_why: `Current data points to ${expatPopulation}, which helps you judge how much peer support you can expect when you arrive. Larger hubs usually provide smoother landing support than secondary cities.`,
      common_languages_why: `Daily communication is shaped by ${commonLanguages}. Even if you can start in English, basic local language skills usually improve your long-term quality of life.`,
    },
  }
}

function applyExpatWhy() {
  const raw = fs.readFileSync(EXPAT_JSON_PATH, "utf8")
  const data = JSON.parse(raw)

  let overridden = 0
  let generated = 0
  let skipped = 0

  for (const [name, country] of Object.entries(data.countries)) {
    if (country.community_why) {
      skipped++
      continue
    }

    const override = EXPAT_WHY_OVERRIDES[name]
    const why = override ?? fallbackExpatWhy(name, country)
    Object.assign(country, why)

    if (override) overridden++
    else generated++
  }

  fs.writeFileSync(EXPAT_JSON_PATH, JSON.stringify(data, null, 2) + "\n")
  return { overridden, generated, skipped }
}

function applyDemoWhy() {
  const raw = fs.readFileSync(DEMO_JSON_PATH, "utf8")
  const data = JSON.parse(raw)

  let overridden = 0
  let generated = 0
  let skipped = 0

  for (const [name, country] of Object.entries(data.countries)) {
    if (country?.religion?.expat_worship_why) {
      skipped++
      continue
    }

    const override = DEMO_WHY_OVERRIDES[name]
    const why = override ?? fallbackDemoWhy(name, country)

    country.religion = {
      ...(country.religion || {}),
      ...(why.religion || {}),
    }
    country.demographics = {
      ...(country.demographics || {}),
      ...(why.demographics || {}),
    }

    if (override) overridden++
    else generated++
  }

  fs.writeFileSync(DEMO_JSON_PATH, JSON.stringify(data, null, 2) + "\n")
  return { overridden, generated, skipped }
}

function main() {
  assertCoverage()
  const expatCounts = applyExpatWhy()
  const demoCounts = applyDemoWhy()

  console.log(
    `Expat info: ${expatCounts.overridden} hand-crafted, ${expatCounts.generated} fallback, ${expatCounts.skipped} skipped (already had community_why)`,
  )
  console.log(
    `Demographics: ${demoCounts.overridden} hand-crafted, ${demoCounts.generated} fallback, ${demoCounts.skipped} skipped (already had expat_worship_why)`,
  )
}

main()
