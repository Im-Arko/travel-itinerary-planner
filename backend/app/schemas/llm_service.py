"""
LLM Service
──────────────────────────────────────────────────────────────
Uses OpenAI to generate personalised day-wise travel itineraries
based on user preferences and matched destinations.

NOTE: This service currently uses a MOCK implementation for testing.
To use real OpenAI, set USE_MOCK_LLM=false in .env and provide a valid
OPENAI_API_KEY.
──────────────────────────────────────────────────────────────
"""

import hashlib
import json
import logging
import os
import random
from typing import Dict, List, Optional

from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Check if we should use mock LLM (for testing without API key)
USE_MOCK_LLM = settings.use_mock_llm

# Only import OpenAI if we're not using mock
if not USE_MOCK_LLM:
    from openai import OpenAI
    # Initialize OpenAI client (new SDK 1.0.0+ interface)
    client = None

    def _get_openai_client() -> OpenAI:
        """Get or create the OpenAI client instance."""
        global client
        if client is None:
            if not settings.openai_api_key:
                raise RuntimeError(
                    "OPENAI_API_KEY is not set. Set it in .env or the environment and restart the backend."
                )
            client = OpenAI(api_key=settings.openai_api_key)
        return client


# ── Output schema for structured LLM response ─────────────────

class DayPlanLLM(BaseModel):
    day_number:     int
    theme:          str    = Field(description="Short evocative theme for the day")
    morning:        str    = Field(description="Morning activities and recommendations")
    afternoon:      str    = Field(description="Afternoon activities and recommendations")
    evening:        str    = Field(description="Evening activities, dining, and nightlife")
    accommodation:  str    = Field(description="Recommended accommodation type or name")
    estimated_cost: float  = Field(description="Estimated total daily spend in USD")
    tips:           str    = Field(description="Insider tips or practical advice for the day")

class ItineraryLLM(BaseModel):
    title:            str            = Field(description="Creative itinerary title")
    destination_name: str
    summary:          str            = Field(description="2-3 sentence overview of the trip")
    days:             List[DayPlanLLM]
    total_budget_est: float          = Field(description="Total estimated budget in USD")
    best_time_to_go:  str
    packing_tips:     List[str]      = Field(description="5 essential packing tips")


# ── Prompt templates ───────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert travel planner with deep knowledge of global destinations.
Generate detailed, practical, and inspiring travel itineraries tailored to the traveller's preferences.
Always respond with valid JSON matching the requested schema. Be specific with activity names, restaurant
recommendations, and accommodation types. Costs should be realistic for the destination and budget level."""

ITINERARY_PROMPT = """Create a personalised {duration}-day travel itinerary for {destination}.

TRAVELLER PROFILE:
- Budget level: {budget} (low=<$100/day, moderate=$100-300/day, luxury=$300+/day)
- Travel style: {travel_style}
- Climate preference: {climate}
- Destination type preference: {dest_type}
- Interests: {interests}
- Dietary needs: {dietary}
- Accessibility requirements: {accessibility}

DESTINATION CONTEXT:
{dest_context}

Generate a complete day-by-day itinerary with morning, afternoon and evening plans.
Be specific about place names, restaurants, and activity costs.
Return the itinerary as a valid JSON object matching this schema:
{format_instructions}"""


# ── OpenAI helpers ─────────────────────────────────────────────

def _get_openai_client():
    """Get or create the OpenAI client instance (only when not using mock)."""
    global client
    if client is None:
        if not settings.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Set it in .env or the environment and restart the backend."
            )
        client = OpenAI(api_key=settings.openai_api_key)
    return client


# ── Mock LLM helpers ───────────────────────────────────────────

MOCK_DESTINATION_HINTS: Dict[str, Dict[str, str]] = {
    "bali": {"vibe": "temple rituals, rice terraces, surf beaches, and Ubud wellness", "best": "April to October", "places": "Ubud Monkey Forest; Tegalalang Rice Terrace; Tirta Empul; Uluwatu Temple; Canggu", "food": "nasi campur; babi guling; Jimbaran seafood"},
    "santorini": {"vibe": "caldera paths, volcanic beaches, Cycladic villages, and Aegean sunsets", "best": "late May, June, September, or early October", "places": "Oia; Fira; Akrotiri; Red Beach; Pyrgos", "food": "assyrtiko wine; tomatokeftedes; Ammoudi Bay seafood"},
    "patagonia": {"vibe": "glacier trails, granite towers, wind-swept steppe, and remote lodges", "best": "November to March", "places": "Torres del Paine; Perito Moreno Glacier; El Chalten; Laguna de los Tres; Puerto Natales", "food": "lamb asado; calafate desserts; lodge hot chocolate"},
    "kyoto": {"vibe": "quiet temples, bamboo groves, tea houses, gardens, and lantern-lit lanes", "best": "March to May or October to November", "places": "Fushimi Inari; Arashiyama; Gion; Kiyomizu-dera; Nishiki Market", "food": "kaiseki; matcha sweets; ramen; tofu cuisine"},
    "marrakech": {"vibe": "souks, palace courtyards, rooftop teas, hammams, and desert edges", "best": "March, April, October, or November", "places": "Jemaa el-Fna; Bahia Palace; Majorelle Garden; Medina souks; Agafay Desert", "food": "tagine; mint tea; msemen; couscous"},
    "banff": {"vibe": "turquoise lakes, alpine trails, wildlife corridors, and mountain lodges", "best": "June to September or December to March", "places": "Lake Louise; Moraine Lake; Banff Gondola; Johnston Canyon; Bow Valley Parkway", "food": "Alberta bison; fondue; lodge breakfasts"},
    "amalfi coast": {"vibe": "cliff villages, lemon groves, boat coves, seafood lunches, and coastal hikes", "best": "May, June, September, or October", "places": "Positano; Ravello; Amalfi; Path of the Gods; Fiordo di Furore", "food": "limoncello; scialatielli seafood pasta; lemon cake"},
    "chiang mai": {"vibe": "temple circuits, mountain villages, night markets, elephants, and northern Thai food", "best": "November to February", "places": "Doi Suthep; Old City temples; Bua Tong Waterfall; Sunday Walking Street; Mae Rim", "food": "khao soi; sai ua sausage; mango sticky rice"},
    "queenstown": {"vibe": "lakefront views, jet boats, alpine roads, wineries, and high-adrenaline days", "best": "December to March or June to August", "places": "Lake Wakatipu; Skyline Queenstown; Glenorchy; Kawarau Bridge; Arrowtown", "food": "pinot noir; lakefront burgers; lamb"},
    "tuscany": {"vibe": "renaissance towns, vineyard roads, hilltop lunches, cypress lanes, and slow evenings", "best": "April to June or September to October", "places": "Florence; Siena; San Gimignano; Val d'Orcia; Chianti", "food": "ribollita; bistecca; pecorino; Chianti"},
    "paris": {"vibe": "museum mornings, market streets, Seine walks, bistros, and neighborhood cafes", "best": "April to June or September to October", "places": "Louvre; Le Marais; Montmartre; Saint-Germain-des-Pres; Seine", "food": "croissants; steak frites; macarons; natural wine"},
    "london": {"vibe": "royal parks, markets, museums, theatre nights, and riverside neighborhoods", "best": "May to September or December", "places": "British Museum; South Bank; Borough Market; Westminster; Shoreditch", "food": "Sunday roast; fish and chips; curry; market pastries"},
    "new york city": {"vibe": "skyline walks, borough food, museums, live shows, and late-night neighborhoods", "best": "April to June or September to early November", "places": "Central Park; Metropolitan Museum of Art; Brooklyn Bridge; High Line; Lower East Side", "food": "pizza; bagels; ramen; deli sandwiches"},
    "rome": {"vibe": "ancient ruins, baroque piazzas, trattorias, fountains, and Vatican art", "best": "April to June or September to October", "places": "Colosseum; Roman Forum; Trastevere; Vatican Museums; Campo de' Fiori", "food": "carbonara; cacio e pepe; gelato; suppli"},
    "barcelona": {"vibe": "Gaudi architecture, beach afternoons, tapas routes, markets, and Gothic lanes", "best": "May, June, September, or October", "places": "Sagrada Familia; Park Guell; Gothic Quarter; Barceloneta; El Born", "food": "tapas; pa amb tomaquet; seafood paella; cava"},
    "lisbon": {"vibe": "tile-covered hills, tram rides, miradouros, seafood, and fado nights", "best": "April to June or September to October", "places": "Alfama; Belem; Bairro Alto; LX Factory; Sintra", "food": "pasteis de nata; bacalhau; grilled sardines; vinho verde"},
    "istanbul": {"vibe": "mosque courtyards, Bosphorus ferries, bazaars, hammams, and layered empires", "best": "April to June or September to November", "places": "Hagia Sophia; Blue Mosque; Grand Bazaar; Karakoy; Kadikoy", "food": "meze; kebab; baklava; Turkish breakfast"},
    "dubai": {"vibe": "futuristic skylines, desert dunes, souks, beach clubs, and ambitious dining", "best": "November to March", "places": "Burj Khalifa; Dubai Creek; Al Fahidi; Jumeirah; Dubai Desert Conservation Reserve", "food": "Emirati machboos; mezze; global fine dining; karak tea"},
    "singapore": {"vibe": "hawker centers, garden domes, heritage quarters, river walks, and efficient city days", "best": "February to April, though it works year-round", "places": "Gardens by the Bay; Chinatown; Kampong Glam; Little India; Marina Bay", "food": "laksa; Hainanese chicken rice; chili crab; kaya toast"},
    "sydney": {"vibe": "harbor icons, coastal walks, surf mornings, ferries, and neighborhood dining", "best": "September to November or March to May", "places": "Sydney Opera House; Bondi; Manly; The Rocks; Blue Mountains", "food": "seafood; flat whites; meat pies; modern Australian plates"},
    "cape town": {"vibe": "Table Mountain trails, wine estates, penguin beaches, coastal roads, and township history", "best": "November to March or September to November", "places": "Table Mountain; Bo-Kaap; Cape Peninsula; Boulders Beach; Stellenbosch", "food": "Cape Malay curry; braai; seafood; pinotage"},
    "rio de janeiro": {"vibe": "beach rhythms, rainforest viewpoints, samba nights, and dramatic granite peaks", "best": "May to October or February for Carnival", "places": "Christ the Redeemer; Sugarloaf Mountain; Ipanema; Santa Teresa; Tijuca Forest", "food": "feijoada; acai; pao de queijo; grilled seafood"},
    "machu picchu": {"vibe": "Inca roads, Sacred Valley villages, cloud forest railways, and high-altitude ruins", "best": "May to September", "places": "Cusco; Ollantaytambo; Sacred Valley; Aguas Calientes; Machu Picchu", "food": "ceviche; lomo saltado; quinoa soup; coca tea"},
    "reykjavik": {"vibe": "geothermal pools, volcanic coasts, waterfalls, northern lights, and Nordic food", "best": "June to August or September to March", "places": "Reykjavik; Golden Circle; Blue Lagoon; South Coast; Snaefellsnes", "food": "Arctic char; lamb soup; rye bread ice cream; skyr"},
    "prague": {"vibe": "castle views, medieval lanes, beer halls, art nouveau cafes, and river bridges", "best": "April to June or September to October", "places": "Charles Bridge; Prague Castle; Old Town Square; Mala Strana; Vinohrady", "food": "goulash; svickova; pilsner; chimney cake"},
    "vienna": {"vibe": "imperial palaces, coffee houses, concert halls, market lunches, and elegant streets", "best": "April to June, September to October, or December", "places": "Schonbrunn Palace; Innere Stadt; Belvedere; Naschmarkt; MuseumsQuartier", "food": "sachertorte; schnitzel; tafelspitz; Austrian wine"},
    "amsterdam": {"vibe": "canals, cycling routes, Dutch masters, markets, brown cafes, and design shops", "best": "April to June or September", "places": "Rijksmuseum; Jordaan; Vondelpark; Anne Frank House; De Pijp", "food": "stroopwafels; herring; rijsttafel; bitterballen"},
    "seoul": {"vibe": "palaces, street food, design districts, mountain viewpoints, and late-night markets", "best": "April to June or September to November", "places": "Gyeongbokgung; Bukchon Hanok Village; Hongdae; Myeongdong; Namsan", "food": "Korean barbecue; tteokbokki; bibimbap; bingsu"},
    "tokyo": {"vibe": "neon crossings, quiet gardens, sushi counters, pop culture, and precise transit days", "best": "March to May or October to November", "places": "Asakusa; Shibuya; Shinjuku; Tsukiji Outer Market; Harajuku", "food": "sushi; yakitori; ramen; wagashi"},
    "hong kong": {"vibe": "harbor ferries, dim sum, ridge hikes, neon markets, and dense city viewpoints", "best": "October to December", "places": "Victoria Peak; Central; Tsim Sha Tsui; Mong Kok; Lantau Island", "food": "dim sum; wonton noodles; egg tarts; roast goose"},
    "hanoi": {"vibe": "old quarter lanes, lakeside rituals, noodle shops, craft villages, and northern day trips", "best": "October to April", "places": "Old Quarter; Hoan Kiem Lake; Temple of Literature; Train Street; West Lake", "food": "pho; bun cha; egg coffee; cha ca"},
    "hoi an": {"vibe": "lantern streets, tailor fittings, river islands, beach breaks, and central Vietnamese cooking", "best": "February to April", "places": "Ancient Town; An Bang Beach; Tra Que Vegetable Village; Thu Bon River; My Son Sanctuary", "food": "cao lau; white rose dumplings; banh mi; coconut coffee"},
    "jaipur": {"vibe": "fort ramparts, pink-city bazaars, block printing, palace rooms, and Rajasthani feasts", "best": "October to March", "places": "Amber Fort; City Palace; Hawa Mahal; Jantar Mantar; Johari Bazaar", "food": "dal baati churma; laal maas; kachori; lassi"},
    "goa": {"vibe": "Portuguese lanes, beach shacks, spice farms, river islands, and relaxed coastal nights", "best": "November to February", "places": "Fontainhas; Anjuna; Palolem; Old Goa; Dudhsagar Falls", "food": "fish thali; vindaloo; xacuti; bebinca"},
    "varanasi": {"vibe": "Ganges rituals, old-city alleys, sunrise boats, silk markets, and spiritual history", "best": "October to March", "places": "Dashashwamedh Ghat; Assi Ghat; Kashi Vishwanath corridor; Sarnath; Banaras Hindu University", "food": "kachori sabzi; chaat; lassi; malaiyyo"},
    "ladakh": {"vibe": "high passes, monasteries, lunar valleys, turquoise lakes, and acclimatized adventure", "best": "June to September", "places": "Leh; Thiksey Monastery; Nubra Valley; Pangong Lake; Khardung La", "food": "thukpa; momos; butter tea; skyu"},
    "maldives": {"vibe": "overwater villas, reef snorkeling, sandbanks, spa rituals, and slow ocean days", "best": "November to April", "places": "North Male Atoll; Baa Atoll; Ari Atoll; local island beaches; house reefs", "food": "reef fish; mas huni; coconut curries; tropical fruit"},
    "zanzibar": {"vibe": "spice farms, dhow sails, Swahili stone lanes, coral beaches, and sunset seafood", "best": "June to October or January to February", "places": "Stone Town; Nungwi; Paje; Jozani Forest; Prison Island", "food": "Swahili seafood curry; Zanzibar pizza; pilau; sugarcane juice"},
    "cairo": {"vibe": "pyramids, Nile views, medieval lanes, museums, and deep pharaonic history", "best": "October to April", "places": "Giza Pyramids; Grand Egyptian Museum; Khan el-Khalili; Coptic Cairo; Nile Corniche", "food": "koshari; ful medames; grilled meats; mint tea"},
    "petra": {"vibe": "rose-red canyons, Nabataean tombs, desert camps, Bedouin tea, and stargazing", "best": "March to May or September to November", "places": "Siq; Treasury; Monastery; Little Petra; Wadi Rum", "food": "zarb; mansaf; Bedouin tea; mezze"},
    "athens": {"vibe": "ancient hills, neighborhood tavernas, island ferries, museums, and rooftop sunsets", "best": "April to June or September to October", "places": "Acropolis; Plaka; Monastiraki; National Archaeological Museum; Sounion", "food": "souvlaki; meze; Greek salad; loukoumades"},
    "edinburgh": {"vibe": "castle rock, literary lanes, whisky rooms, coastal views, and moody medieval streets", "best": "May to September or December", "places": "Edinburgh Castle; Royal Mile; Arthur's Seat; Dean Village; Leith", "food": "haggis; whisky; Cullen skink; shortbread"},
    "dublin": {"vibe": "literary pubs, Georgian squares, coastal villages, live music, and historic libraries", "best": "May to September", "places": "Trinity College; Temple Bar; Kilmainham Gaol; Howth; St Stephen's Green", "food": "Irish stew; seafood chowder; soda bread; stout"},
    "mexico city": {"vibe": "mural halls, market tacos, leafy barrios, pyramids, and contemporary galleries", "best": "March to May or October to November", "places": "Centro Historico; Coyoacan; Roma Norte; Teotihuacan; Xochimilco", "food": "tacos al pastor; tostadas; churros; mezcal"},
    "vancouver": {"vibe": "seawall cycling, mountain bridges, Asian food, island markets, and forest-edge city life", "best": "June to September", "places": "Stanley Park; Granville Island; Gastown; Capilano; Kitsilano", "food": "sushi; salmon; dumplings; craft beer"},
    "san francisco": {"vibe": "bay views, neighborhood food, ferries, redwoods, and foggy hill walks", "best": "September to November", "places": "Golden Gate Bridge; Mission District; Ferry Building; Alcatraz; Muir Woods", "food": "sourdough; burritos; Dungeness crab; farm-to-table plates"},
    "los angeles": {"vibe": "studio culture, beach paths, art museums, canyon hikes, and global food neighborhoods", "best": "March to May or September to November", "places": "Santa Monica; Griffith Observatory; The Getty; Koreatown; Downtown Arts District", "food": "tacos; Korean barbecue; sushi; farmers-market produce"},
    "las vegas": {"vibe": "desert spectacle, resort shows, neon history, canyon day trips, and late-night dining", "best": "March to May or September to November", "places": "The Strip; Fremont Street; Red Rock Canyon; Neon Museum; Hoover Dam", "food": "steakhouses; buffets; chef tasting menus; late-night diners"},
    "yellowstone": {"vibe": "geysers, wildlife valleys, canyon rims, thermal basins, and lodge-to-lodge drives", "best": "May to September", "places": "Old Faithful; Grand Prismatic Spring; Lamar Valley; Grand Canyon of the Yellowstone; Mammoth Hot Springs", "food": "lodge breakfasts; trout; picnic lunches; huckleberry sweets"},
    "grand canyon": {"vibe": "rim walks, desert geology, sunrise viewpoints, mule history, and star-filled nights", "best": "March to May or September to November", "places": "South Rim; Desert View; Bright Angel Trail; Mather Point; Hermit Road", "food": "trail snacks; lodge dinners; Southwestern plates; fry bread"},
    "swiss alps": {"vibe": "cog railways, glacier views, chalet villages, meadow hikes, and fondue evenings", "best": "June to September or December to March", "places": "Zermatt; Jungfraujoch; Interlaken; Lauterbrunnen; Grindelwald", "food": "fondue; raclette; rosti; alpine chocolate"},
    "dubrovnik": {"vibe": "stone walls, Adriatic kayaking, island ferries, marble lanes, and seafood terraces", "best": "May, June, September, or October", "places": "Old Town walls; Lokrum Island; Mount Srd; Stradun; Elafiti Islands", "food": "black risotto; grilled fish; oysters; Croatian wine"},
    "budapest": {"vibe": "thermal baths, ruin bars, Danube bridges, grand cafes, and art nouveau details", "best": "April to June or September to October", "places": "Buda Castle; Szechenyi Baths; Great Market Hall; Jewish Quarter; Parliament", "food": "goulash; chimney cake; paprika chicken; Tokaji"},
    "berlin": {"vibe": "Cold War history, galleries, techno edges, street food, and green neighborhood days", "best": "May to September", "places": "Museum Island; Kreuzberg; East Side Gallery; Prenzlauer Berg; Tempelhofer Feld", "food": "currywurst; doner; beer garden snacks; natural wine"},
    "copenhagen": {"vibe": "harbor swims, design shops, cycling lanes, Nordic food, and colorful canals", "best": "May to September", "places": "Nyhavn; Tivoli Gardens; Norrebro; Christianshavn; Louisiana Museum", "food": "smorrebrod; cardamom buns; seafood; New Nordic menus"},
    "stockholm": {"vibe": "archipelago ferries, old-town lanes, design museums, fika breaks, and island walks", "best": "June to August or December", "places": "Gamla Stan; Vasa Museum; Djurgarden; Sodermalm; Stockholm Archipelago", "food": "cardamom buns; seafood; meatballs; cloudberry desserts"},
    "oslo": {"vibe": "fjord saunas, forest metros, sculpture parks, modern museums, and Nordic waterfronts", "best": "May to September or winter for snow", "places": "Oslo Opera House; Vigeland Park; Aker Brygge; Bygdoy; Nordmarka", "food": "salmon; brown cheese waffles; Nordic pastries; seafood"},
    "kruger national park": {"vibe": "dawn game drives, bushveld lodges, tracking lessons, waterholes, and quiet safari nights", "best": "May to September", "places": "Skukuza; Sabi Sand; Lower Sabie; Olifants; Blyde River Canyon", "food": "braai; biltong; lodge dinners; rooibos"},
    "serengeti": {"vibe": "endless plains, migration routes, acacia sunsets, tented camps, and expert-led drives", "best": "June to October, with migration timing by region", "places": "Seronera; Ngorongoro Crater; Northern Serengeti; Moru Kopjes; Lake Manyara", "food": "camp dinners; chapati; grilled meats; Tanzanian coffee"},
    "nairobi": {"vibe": "urban wildlife, coffee farms, craft markets, national history, and gateway safari energy", "best": "June to October or January to February", "places": "Nairobi National Park; Karen; Giraffe Centre; Kibera social enterprises; Karura Forest", "food": "nyama choma; ugali; samosas; Kenyan coffee"},
    "cartagena": {"vibe": "Caribbean walls, colorful balconies, salsa nights, island boats, and coastal cuisine", "best": "December to April", "places": "Walled City; Getsemani; Rosario Islands; San Felipe Castle; Bocagrande", "food": "ceviche; arepas de huevo; coconut rice; fried fish"},
    "buenos aires": {"vibe": "tango halls, grand avenues, steak dinners, bookshops, and neighborhood cafe culture", "best": "March to May or September to November", "places": "San Telmo; Recoleta; Palermo; La Boca; Teatro Colon", "food": "empanadas; steak; Malbec; dulce de leche"},
    "galapagos": {"vibe": "wildlife landings, lava trails, snorkeling coves, conservation stations, and boat-led days", "best": "December to May or June to November", "places": "Santa Cruz; Isabela; San Cristobal; North Seymour; Bartolome", "food": "fresh fish; ceviche; plantains; Ecuadorian soups"},
    "antarctica": {"vibe": "iceberg landings, penguin colonies, zodiac cruises, expedition lectures, and polar silence", "best": "November to March", "places": "Drake Passage; Antarctic Peninsula; Paradise Bay; Deception Island; Lemaire Channel", "food": "shipboard expedition meals; hot soups; tea between landings"},
    "sri lanka": {"vibe": "tea hills, surf beaches, ancient ruins, safari drives, and fragrant rice-and-curry meals", "best": "December to March for south/west or May to September for east", "places": "Sigiriya; Kandy; Ella; Galle; Yala National Park", "food": "hoppers; rice and curry; kottu; Ceylon tea"},
    "nepal": {"vibe": "Himalayan viewpoints, stupas, trekking villages, momos, and mountain-flight mornings", "best": "October to November or March to April", "places": "Kathmandu; Pokhara; Bhaktapur; Annapurna foothills; Boudhanath", "food": "momos; dal bhat; thukpa; masala tea"},
    "uzbekistan": {"vibe": "Silk Road madrasas, turquoise domes, train journeys, plov, and desert caravan history", "best": "April to May or September to October", "places": "Samarkand; Bukhara; Khiva; Tashkent; Kyzylkum Desert", "food": "plov; non bread; samsa; green tea"},
    "morocco sahara": {"vibe": "dune camps, kasbah roads, camel silhouettes, star fields, and Berber hospitality", "best": "October to April", "places": "Merzouga; Erg Chebbi; Ait Ben Haddou; Dades Valley; Ouarzazate", "food": "tagine; couscous; dates; Berber tea"},
}

MOCK_DESTINATION_ALIASES = {
    "nyc": "new york city",
    "new york": "new york city",
    "amalfi": "amalfi coast",
    "marrakesh": "marrakech",
    "leh": "ladakh",
    "kruger": "kruger national park",
    "serengeti national park": "serengeti",
    "zurich": "swiss alps",
    "interlaken": "swiss alps",
    "zermatt": "swiss alps",
    "samarkand": "uzbekistan",
    "bukhara": "uzbekistan",
    "sahara": "morocco sahara",
}

GENERIC_DESTINATION_HINTS: Dict[str, Dict[str, str]] = {
    "beach": {"vibe": "coastal villages, boat coves, seafood, swimming, and sunset viewpoints", "best": "the local dry or shoulder season", "places": "main beach; old harbor; fish market; nearby island; coastal viewpoint", "food": "grilled seafood; tropical fruit; beach shack snacks"},
    "mountain": {"vibe": "ridge trails, alpine viewpoints, lodge meals, fresh air, and slow scenic transfers", "best": "the clearest local trekking season", "places": "main trailhead; summit viewpoint; mountain village; alpine lake; local lodge", "food": "hearty stews; local cheese; lodge breakfasts"},
    "city": {"vibe": "neighborhood walks, food stops, museums, viewpoints, and nights with local energy", "best": "spring or fall", "places": "old quarter; central market; design district; waterfront; main museum", "food": "market snacks; neighborhood restaurants; classic local desserts"},
    "countryside": {"vibe": "village roads, farms, regional cooking, slow viewpoints, and locally run stays", "best": "harvest or wildflower season", "places": "market town; farm stay; vineyard road; viewpoint village; heritage workshop", "food": "farm lunches; regional wine; seasonal produce"},
    "adventure": {"vibe": "guided active days, wild viewpoints, early starts, recovery meals, and practical logistics", "best": "the main local activity season", "places": "base town; primary trail; river put-in; lookout ridge; guide office", "food": "trail snacks; high-energy dinners; local comfort food"},
    "cultural": {"vibe": "sacred sites, markets, craft traditions, heritage lanes, and food with context", "best": "spring or fall, with attention to festival calendars", "places": "heritage district; main temple or museum; artisan quarter; central market; performance venue", "food": "traditional dinner; market snacks; tea or coffee ritual"},
    "any": {"vibe": "local highlights, food stops, neighborhood walks, viewpoints, and balanced downtime", "best": "spring or fall", "places": "historic center; local market; viewpoint; museum quarter; restaurant street", "food": "signature local dishes; market bites; cafe stops"},
}

MOCK_INTEREST_TIPS = {
    "food": "Add one focused tasting stop and ask vendors what is seasonal.",
    "history": "Use a licensed guide for the main heritage site so the day has real context.",
    "art": "Leave time for a small gallery, studio, or museum wing instead of only the landmark.",
    "nature": "Start outdoor activities early and keep a backup indoor stop in case weather shifts.",
    "adventure": "Confirm operator safety standards, insurance, and pickup details the night before.",
    "wellness": "Protect one slower block for a spa, bathhouse, yoga class, or quiet garden.",
    "nightlife": "Check closing days and dress codes before committing to late-night venues.",
    "shopping": "Compare fixed-price shops with markets before bargaining for crafts or textiles.",
    "photography": "Save sunrise or blue-hour windows for the most visual viewpoint.",
}


def _destination_display_name(destination: str) -> str:
    return destination.split(",")[0].strip() if "," in destination else destination.strip()


def _find_mock_destination_hint(destination: str, dest_type: str) -> Dict[str, str]:
    destination_lower = destination.lower()
    key = _destination_display_name(destination).lower()
    key = MOCK_DESTINATION_ALIASES.get(key, key)
    if key in MOCK_DESTINATION_HINTS:
        return MOCK_DESTINATION_HINTS[key]
    for alias, canonical in MOCK_DESTINATION_ALIASES.items():
        if alias in destination_lower and canonical in MOCK_DESTINATION_HINTS:
            return MOCK_DESTINATION_HINTS[canonical]
    for profile_key, hint in MOCK_DESTINATION_HINTS.items():
        if profile_key in destination_lower or key in profile_key:
            return hint
    return GENERIC_DESTINATION_HINTS.get(dest_type, GENERIC_DESTINATION_HINTS["any"])


def _stable_rng(*parts: object) -> random.Random:
    seed_text = "|".join(str(part) for part in parts)
    seed = int(hashlib.sha256(seed_text.encode("utf-8")).hexdigest()[:16], 16)
    return random.Random(seed)


def _split_hint(hint: Dict[str, str], field: str) -> List[str]:
    return [item.strip() for item in hint[field].split(";") if item.strip()]


def _pick(items: List[str], index: int, rng: random.Random) -> str:
    if not items:
        return ""
    return items[(rng.randrange(len(items)) + index) % len(items)]


def _interest_tip(interests: Optional[List[str]], rng: random.Random) -> str:
    if not interests:
        return "Keep one flexible hour so local recommendations can shape the route."
    normalized = [interest.lower().strip() for interest in interests if interest]
    matching = [
        tip
        for interest, tip in MOCK_INTEREST_TIPS.items()
        if any(interest in item or item in interest for item in normalized)
    ]
    if matching:
        return rng.choice(matching)
    return f"Prioritize {rng.choice(interests)} today, but keep transit time realistic between stops."

def _generate_mock_itinerary(
    destination: str,
    duration: int,
    budget: str,
    travel_style: str,
    **kwargs
) -> dict:
    """Generate a mock itinerary for testing without OpenAI API."""
    logger.info(f"[MOCK] Generating itinerary for {destination} ({duration} days, {budget} budget)")

    interests = kwargs.get("interests") or []
    dest_type = kwargs.get("dest_type") or "any"
    climate = kwargs.get("climate") or "any"
    destination_name = _destination_display_name(destination)
    hint = _find_mock_destination_hint(destination, dest_type)
    places = _split_hint(hint, "places")
    foods = _split_hint(hint, "food")
    rng = _stable_rng(destination, duration, budget, travel_style, climate, dest_type, ",".join(interests))

    budget_costs = {
        "budget": {
            "accommodation": "well-reviewed hostel, homestay, or simple guesthouse near transit",
            "daily_cost": 85,
            "meal_tip": "Favor markets, street food, transit passes, and one paid highlight per day.",
        },
        "moderate": {
            "accommodation": "characterful 3-star hotel, boutique inn, or central apartment",
            "daily_cost": 210,
            "meal_tip": "Mix guided experiences with independent exploring and mid-range restaurants.",
        },
        "luxury": {
            "accommodation": "5-star hotel, heritage property, private lodge, or premium resort",
            "daily_cost": 520,
            "meal_tip": "Pre-book private guides, premium transfers, and destination restaurants.",
        },
    }
    budget_info = budget_costs.get(budget, budget_costs["moderate"])

    themes = [
        "Arrival and Local Orientation",
        "Signature Landmarks with Context",
        "Food, Markets, and Neighborhood Life",
        "Scenic Excursion and Open-Air Time",
        "Craft, Culture, and Hidden Corners",
        "Slow Morning and Memorable Finale",
        "Active Day with Recovery Time",
        "Views, Stories, and Evening Atmosphere",
    ]
    morning_templates = [
        "Start early at {place}, then pause for a local breakfast before the area gets busy.",
        "Meet a local guide around {place} for context, shortcuts, and practical orientation.",
        "Use the cool morning for {place}, keeping the route walkable and unhurried.",
        "Build the morning around {place}, with time for photos, coffee, and a nearby side street.",
    ]
    afternoon_templates = [
        "Continue to {place}, then make lunch the anchor with {food} rather than a rushed snack.",
        "Shift to {place} for a different side of the destination and leave buffer time for transit.",
        "Use the afternoon for {place}, pairing the visit with a hands-on stop or short scenic detour.",
        "Take a slower block around {place}, then recover over {food}.",
    ]
    evening_templates = [
        "End near {place} with {food}, then take a low-pressure walk as the area lights up.",
        "Keep the evening local: dinner built around {food}, followed by a viewpoint or performance.",
        "Book a table or small-group experience near {place}, making this the day's atmospheric close.",
        "Choose a relaxed evening around {place}, with {food} and enough downtime for tomorrow.",
    ]
    packing_tips_pool = [
        "Pack comfortable walking shoes that can handle long sightseeing days.",
        "Bring a universal power adapter and a portable charger.",
        "Carry sunscreen, sunglasses, and a hat for exposed daytime plans.",
        "Pack a light layer for early starts, air conditioning, ferries, or mountain evenings.",
        "Use a small day bag with room for water, tickets, and weather layers.",
        "Keep digital and paper copies of key reservations and entry tickets.",
        "Bring a reusable water bottle where local water guidance allows it.",
        "Pack one smart-casual outfit for better restaurants or performances.",
    ]

    days = []
    for day_num in range(1, duration + 1):
        day_index = day_num - 1
        morning_place = _pick(places, day_index, rng)
        afternoon_place = _pick(places, day_index + 2, rng)
        evening_place = _pick(places, day_index + 4, rng)
        food = _pick(foods, day_index, rng)
        daily_variation = rng.randint(-25, 35) + (day_index % 3) * 12
        days.append({
            "day_number": day_num,
            "theme": f"{themes[day_index % len(themes)]}: {morning_place}",
            "morning": morning_templates[(day_index + rng.randrange(len(morning_templates))) % len(morning_templates)].format(place=morning_place),
            "afternoon": afternoon_templates[(day_index + rng.randrange(len(afternoon_templates))) % len(afternoon_templates)].format(place=afternoon_place, food=food),
            "evening": evening_templates[(day_index + rng.randrange(len(evening_templates))) % len(evening_templates)].format(place=evening_place, food=food),
            "accommodation": f"{budget_info['accommodation']} in a convenient base for {destination_name}",
            "estimated_cost": max(45, budget_info["daily_cost"] + daily_variation),
            "tips": f"{budget_info['meal_tip']} {_interest_tip(interests, rng)}",
        })

    rng.shuffle(packing_tips_pool)
    total_budget = sum(day["estimated_cost"] for day in days)
    return {
        "title": f"{duration} Days in {destination_name}: {hint['vibe'].title()}",
        "destination_name": destination_name,
        "summary": f"This {duration}-day {travel_style} itinerary for {destination_name} is built around {hint['vibe']}. "
                   f"It balances {budget} pacing, destination-specific food stops, and varied days so the trip does not feel templated.",
        "days": days,
        "total_budget_est": total_budget,
        "best_time_to_go": hint["best"],
        "packing_tips": packing_tips_pool[:5],
    }
    
def _generate_mock_destination_summary(dest_context: str, preferences: dict) -> str:
    """Generate a mock destination summary for testing."""
    logger.info("[MOCK] Generating destination summary")
    
    destination = preferences.get("destination", "this destination")
    travel_style = preferences.get("travel_style", "relaxed")
    budget = preferences.get("budget", "moderate")
    
    summaries = [
        f"{destination} is a perfect match for your {travel_style} travel style and {budget} budget. "
        f"You'll love the authentic experiences and warm hospitality that await you!",
        
        f"With your interest in {travel_style} travel, {destination} offers everything you're looking for. "
        f"The {budget} budget will go far here, allowing you to experience the best local culture.",
        
        f"{destination} aligns perfectly with your preferences! "
        f"Your {travel_style} approach to travel will be rewarded with unforgettable moments in this stunning location.",
        
        f"Based on your {travel_style} preferences and {budget} budget, {destination} is an ideal choice. "
        f"Get ready for an adventure filled with local charm and authentic experiences!",
    ]
    
    return random.choice(summaries)


# ── Main generation function ───────────────────────────────────

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def generate_itinerary(
    destination:   str,
    duration:      int,
    budget:        str,
    travel_style:  str,
    climate:       str       = "any",
    dest_type:     str       = "any",
    interests:     List[str] = None,
    dietary:       str       = None,
    accessibility: bool      = False,
    dest_context:  str       = "",
) -> dict:
    """
    Call OpenAI to generate a structured itinerary.
    Returns a dict with keys matching ItineraryLLM schema.
    
    If USE_MOCK_LLM is True, returns a mock itinerary for testing.
    """
    # Use mock LLM if enabled
    if USE_MOCK_LLM:
        return _generate_mock_itinerary(
            destination=destination,
            duration=duration,
            budget=budget,
            travel_style=travel_style,
            climate=climate,
            dest_type=dest_type,
            interests=interests,
            dietary=dietary,
            accessibility=accessibility,
            dest_context=dest_context,
        )
    
    # Real OpenAI API call
    _get_openai_client()

    prompt_text = ITINERARY_PROMPT.format(
        destination     = destination,
        duration        = duration,
        budget          = budget,
        travel_style    = travel_style,
        climate         = climate,
        dest_type       = dest_type,
        interests       = ", ".join(interests) if interests else "general sightseeing",
        dietary         = dietary or "none",
        accessibility   = "yes - please ensure activities are accessible" if accessibility else "no",
        dest_context    = dest_context or f"{destination} is a wonderful travel destination.",
        format_instructions = json.dumps({
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "destination_name": {"type": "string"},
                "summary": {"type": "string"},
                "total_budget_est": {"type": "number"},
                "best_time_to_go": {"type": "string"},
                "packing_tips": {"type": "array", "items": {"type": "string"}},
                "days": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "day_number": {"type": "integer"},
                            "theme": {"type": "string"},
                            "morning": {"type": "string"},
                            "afternoon": {"type": "string"},
                            "evening": {"type": "string"},
                            "accommodation": {"type": "string"},
                            "estimated_cost": {"type": "number"},
                            "tips": {"type": "string"},
                        },
                        "required": ["day_number", "theme", "morning", "afternoon", "evening", "accommodation", "estimated_cost", "tips"],
                    },
                },
            },
            "required": ["title", "destination_name", "summary", "total_budget_est", "best_time_to_go", "packing_tips", "days"],
        }),
    )

    logger.info("Generating itinerary for %s (%d days, %s budget)", destination, duration, budget)
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt_text},
            ],
            temperature=0.7,
            max_tokens=1500,
        )
    except Exception as exc:
        logger.exception("OpenAI request failed")
        raise RuntimeError(f"OpenAI request failed: {exc}") from exc

    # Try to robustly extract the assistant content
    try:
        # Support mapping-like and attribute-style responses
        if hasattr(response, "choices"):
            choices = response.choices
        else:
            choices = response.get("choices", [])
        if not choices:
            raise ValueError("no choices returned from OpenAI")
        first = choices[0]
        # try attribute access then dict access
        if hasattr(first, "message"):
            raw = first.message.get("content") if isinstance(first.message, dict) else getattr(first.message, "content", None)
        else:
            raw = first.get("message", {}).get("content")
        if raw is None:
            # older OpenAI responses might put text in 'text' or 'content'
            raw = getattr(first, "text", None) or first.get("text") if isinstance(first, dict) else None
        if raw is None:
            raise ValueError("could not extract assistant content from OpenAI response")
        raw = raw.strip()
    except Exception as exc:
        logger.exception("Failed to extract content from OpenAI response: %s", exc)
        raise RuntimeError(f"Failed to extract OpenAI response content: {exc}") from exc

    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].split("```")[0].strip()

    try:
        parsed = json.loads(raw)
    except Exception as exc:
        logger.exception("Failed to parse JSON from LLM output: %s", exc)
        raise ValueError(f"LLM returned invalid JSON: {exc}\nRAW:\n{raw}") from exc

    # Validate schema and return plain dict
    itinerary = ItineraryLLM.model_validate(parsed)
    return itinerary.model_dump()


def generate_destination_summary(dest_context: str, preferences: dict) -> str:
    """
    Generate a short 'why this destination suits you' explanation.
    
    If USE_MOCK_LLM is True, returns a mock summary for testing.
    """
    # Use mock LLM if enabled
    if USE_MOCK_LLM:
        return _generate_mock_destination_summary(dest_context, preferences)
    
    # Real OpenAI API call
    _get_openai_client()

    prompt = (
        f"Given this traveller profile: {json.dumps(preferences)}\n"
        f"And this destination: {dest_context}\n"
        "Write 2 sentences explaining why this destination is a great match. Be specific and enthusiastic."
    )

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=200,
    )
    return response.choices[0].message.content.strip()
