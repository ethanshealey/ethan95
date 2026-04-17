import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Parse .env.local manually (same pattern as migrate-albums.mjs)
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf-8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('='))
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
);

const app = initializeApp({
  apiKey:             env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:         env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:          env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:      env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:  env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:              env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db      = getFirestore(app);
const bucket  = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

/** Converts a relative image path (e.g. "cameras/foo.png") to a public Storage URL. */
function storageUrl(imagePath) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(`images/${imagePath}`)}?alt=media`;
}

/** Writes an array of items to a Firestore collection, keyed by their numeric id. */
async function migrate(collectionName, items) {
  console.log(`\nMigrating ${items.length} items → "${collectionName}"`);
  for (const { id, image, ...rest } of items) {
    await setDoc(doc(db, collectionName, String(id)), {
      ...rest,
      image: storageUrl(image),
    });
    console.log(`  ✓ [${id}] ${rest.name}`);
  }
}

// ── Data (embedded from retro-museum project) ────────────────────────────────

const cameras = [
  { id: 1,  name: 'Canon AE-1 Program',           image: 'cameras/canon-ae1-program.png',           year: 1981, description: 'My first 35mm SLR, and one of my most modern film cameras, the Canon AE-1 Program makes shooting film a breeze. Along with this camera I have a 50mm f1.8 lens (pictured), a 100-200mm f5.6 lens, and a 100-300mm f5.6 zoom lens.' },
  { id: 2,  name: 'Argus Seventy-Five',            image: 'cameras/argus-seventy-five.png',           year: 1949, description: 'The Argus Seventy-Five was my first TLR (Twin-Lens Reflex) waist level camera, kicking off my love for waist level viewfinders. The simple controls being just a "INSTANT" (1/50th) and "TIME" switch, with a 75mm fixed focus lens with a double exposure prevention, this camera is a simple yet fun camera to use wherever you are.' },
  { id: 3,  name: 'Gaf SC/91 Anscomatic',          image: 'cameras/asncomatic.png',                   year: 1967, description: 'I found this Gaf SC/91 Anscomatic super 8 camera at a local antique store along with the Kodak Escort 8, I was hopeful to make good use of this small camera, but not long after taking it home the motor suddenly burnt out, rendering it unoperable. Despite this, the camera reps a optical 15mm f1.8 lense along with a 18fps filming speed.' },
  { id: 4,  name: 'Kodak Escort 8 Zoom 8mm',       image: 'cameras/kodak-escort-zoom-8.png',          year: 1960, description: 'This standard 8mm film camera does not have much a presence online, finding information about this compact camera is tough. It features a hand-crank which powers the system, an impressive f1.6 zoom lens (no idea the mm), and a simple rangefinder which "zooms" along with the lens. I have yet to get my hands on some standard 8mm to shoot with.' },
  { id: 5,  name: 'Kodak No. 1A Autographic Jr',   image: 'cameras/kodak-no1a-autographic-jr.png',    year: 1924, description: 'I picked up this beautiful antique at a local antique store in Eden, NC. It features a 130mm f7.7 fixed focus lens and took a long retired A-116 film. Thanks to modern magic, I can use 3D printed adapters to load this camera with standard 120 film. Due to the extreme difference of film sizes (and a major light leak through the film count window), I was forced to learn how to wind the film blind. So far I have yielded several great pictures using this 100+ year old camera.' },
  { id: 6,  name: 'Pho-Tak Foldex 20',             image: 'cameras/foldex-20.png',                    year: 1948, description: 'Being my first ever (functional) film camera, I treasure this cheap simple camera deeply. Packing a 1/50th shutter speed and a 86mm f11 Octvar lens, this camera is perfect for portraits and produces a unqiue almost fish-eyed photo.' },
  { id: 7,  name: 'Graflex Crown Graphic',          image: 'cameras/graflex-speed-graphic.png',        year: 1947, description: 'The Graflex Crown Graphic was my first large format camera, shooting 4x5 film. Although this camera features a rangefinder and a retractable Sports Finder, I always opt to shoot through the focusing glass, using my Graflex Optar 135mm f4.7 lens. This wildly popular camera is packed with super interesting features, including a Front Rise, Front Tilt, Front Shift, and a Bed Drop movement, allowing me to capture genuine tilt-shift photographs and other neat effects! Also, thanks to its Graflok back, I was able to attach a LomoGraflok Instant back adapter allowing me to shoot Instax Wide film.' },
  { id: 8,  name: 'Kodak Brownie No.2 Model F',    image: 'cameras/kodak-brownie-no-2f.png',           year: 1931, description: 'The Kodak Brownie No.2 Model F is one of my favorite box cameras, thanks to being referenced in one of my favorite games of all time, Read Dead Redemption 2. This literal box reps a Meniscus lens with simple metal pull tabs that controls the f8, f11, and f16 aperatures and the 1/50th and BULB shutter speeds. This camera line (starting in 1901) was the first ever to use 120 film, which still rains supreme today!' },
  { id: 9,  name: 'Kodak Six-16',                  image: 'cameras/kodak-six-16.png',                 year: 1932, description: 'The Kodak Six-16 includes 128mm f6.3 lens along with a wide range of shutter speeds for its age, ranging from 1/10 to 1/100 (as well as Time and Bulb). On the lens you are also able to control the focus with a rotating handle around the lens. Similar to the No. 1A Autographic it features a small waist level viewfinder which provides a fun and unique shooting experience. It also shoots a long defunct 616 film which can also be fitted to shoot 120 film thanks to 3D printed adapters.' },
  { id: 10, name: 'Kodak No. 2 Pocket Brownie',    image: 'cameras/koda-no2-pocket-brownie.png',       year: 1911, description: 'The Kodak No. 2 Pocket Brownie is one of my oldest in my collection, dating from 1911. This is also the oldest in my collection to take 120 film, making it super easy to shoot! This brownie features a 114mm Meniscus Achromat lens along with a shutter speed of 1/25th, Bulb, and Time. Due to its extremely slow shutter speed, it is a challenge to get pictures that are not blurry when free handing.' },
  { id: 11, name: 'Mamiya RB67 Pro S',             image: 'cameras/mamiya-rb67.png',                  year: 1974, description: 'Being one of my most modern and professional (and most expensive) cameras, shooting with the RB67 is so much fun! Don\'t let the photo decieve you, this thing is a tank weighing ~4lbs without a lens! Most of the controls like shutter speed are located on the lens giving it a unique experience. This camera is extremely modular, letting you remove almost all the parts like the film back, viewfinder, and lens.' },
  { id: 12, name: 'Paillard Bolex B8',             image: 'cameras/paillard-bolex-b8.png',            year: 1953, description: 'This intricately designed 8mm camera is an eye catcher, shooting 25ft of double run 8mm film. Featuring a super interesting dual lens setup, allowing you to rotate between two lenses, currently using a short f5.5 and a telephoto f1.9 lens. Sadly, this camera was bought sight unseen and arrived dead on arrival, meaning I will be unable to use this beauty to its full extent.' },
  { id: 13, name: 'Polaroid Land Camera 360',      image: 'cameras/polaroid-land-camera-360.png',     year: 1969, description: 'The camera that jump started my interest in film, the first camera I ever came across in a antique store in Oak Island, NC, this large polaroid shoots long gone Type 100 pull-apart film.' },
  { id: 14, name: 'Rolleicord I-A Model 3',        image: 'cameras/rolleicord-ia-model-3.png',        year: 1938, description: 'By far my most beat up camera, I picked this up for cheap at an estate sale in hopes of bringing it back to life. So far I have replaced all the phaux leather skin but have yet to clean up the metal dials. I have also yet to send a roll of film through this camera, but as far as I can tell, the shutter works just fine with minimal fungus.' },
  { id: 15, name: 'Vivitar 700',                   image: 'cameras/vivitar-110.png',                  year: 1977, description: 'The Vivitar 700 is the only camera I own that shoots 110 film, still obtainable via Lomography. This compact camera features a 24mm f7 lens with a fixed focus and a built in flash powered by 2x AA batteries. This camera gives me disposable camera vibes and is super simple and fun to use.' },
  { id: 16, name: 'Yashica A',                     image: 'cameras/yashica-a.png',                    year: 1956, description: 'The Yashica A is by far my favorite TLR (Twin-Lens Reflex) camera I currently have in my collection. Featuring a 80mm f3.5 lens and a wide range of shutter speeds and aperatures, this camera provides me with some of the most beautiful pictures I have taken through Film.' },
  { id: 17, name: 'Yashica SU-40 E',               image: 'cameras/yashica-su-40e.png',               year: 1968, description: 'The Yashica SU-40 E is one of my only Super 8 cameras in a wonderful working condition, featuring a great 36mm f1.8 SLR zoom lens. Thanks to it taking Super 8 cartridges it is simple to use, allowing me to have produced multiple short films developed with the ECN-2 process.' },
  { id: 18, name: 'Polaroid SX-70 Land Camera Alpha 1', image: 'cameras/polaroid-sx70.png',           year: 1977, description: 'This unique collapsable instant camera was a gift from my Mom on Christmas 2023 and remains one of my favorites due to its eye catching design. The front of this camera is simple, yielding its only three controls, a big red shutter button located under the focusing dial, and an exposure dial on the opposite side.' },
  { id: 19, name: 'Graflex National II',            image: 'cameras/graflex-national-ii.png',          year: 1934, description: 'The Graflex National II is a beauty of a camera, featuring a unique viewing hood and intricate controls. This camera nativley shoots 120 film which is still widly available today, and is a compact build single lens reflex camera and is far from easy to use. It was also given the loving nickname of "Hefty Little Brick" due to its weight and size.' },
  { id: 20, name: 'Unicum Glass Plate 4x5',        image: 'cameras/unicum-unknown-1891-v2.png',        year: 1891, description: 'This camera is a bit of a mystery, it has lost the majority of its information other than the beautiful Unicum lens which is dated to around 1891. It features a lovely wood and brass body and is fully functioning, although some of the faster shutter speeds aren\'t very accurate.' },
  { id: 21, name: 'Bell & Howell Filmo 70 KM',     image: 'cameras/bell-and-howell-filmo-70-km.png',  year: 1923, description: 'This one-of-a-kind find is built like a literal tank and reps a "News 3" custom cover and a tag showing this beast once belong to "WLOS-TV, Channel 13, Ashville NC". The Bell & Howell Filmo-70 KM is a classic spring-motor 16mm motion-picture camera, part of the enduring Filmo 70 series that began in 1923.' },
  { id: 22, name: 'Exa Ihagee Dresden',            image: 'cameras/exa-lhagee-dresden.png',           year: 1951, description: 'The Ihagee Dresden Exa is a classic mid-20th-century 35 mm mechanical SLR, first introduced in 1951 as a simplified, affordable counterpart to the Exakta line. Hailing from Dresden, East Germany, it was built with rugged all-metal construction and reliable mechanics.' },
  { id: 23, name: 'Ziess Ikon Mess Ikonta 524/16', image: 'cameras/ziess-ikon-mess-ikonta-524-16.png', year: 1951, description: 'The Zeiss Ikon Ikonta 524/16 Rangefinder is a compact, medium-format folding camera produced in the 1950s. It uses 120 film to produce 6×6 cm square images and features a coupled rangefinder for precise focusing.' },
  { id: 24, name: 'Vtg Zeiss Ikon Contaflex Super', image: 'cameras/vtg-zeiss-ikon-contraflex-super.png', year: 1959, description: 'The Zeiss Ikon Contaflex Super is a 35mm single-lens reflex (SLR) camera introduced in the late 1950s, known for its precision German engineering and distinctive leaf shutter system. It features a fixed Carl Zeiss Tessar 50mm f/2.8 lens, interchangeable front lens elements, and a built-in selenium light meter.' },
  { id: 25, name: 'Nikon Nikkormat EL2',           image: 'cameras/nikon-nikkormat-el2.png',           year: 1977, description: 'The Nikon Nikkormat EL2 is a high-quality 35mm SLR film camera introduced in 1977, known for blending mechanical reliability with electronic convenience. It features aperture-priority auto exposure, manual mode, and a durable Copal vertical metal shutter.' },
  { id: 26, name: 'Icarette Ica Novar',            image: 'cameras/icarette-ica-novar.png',            year: 1926, description: 'The Icarette Ica Novar is a classic folding camera produced by ICA (Internationale Camera A.G.) in the 1920s, prior to its merger into Zeiss Ikon. Designed for 120 roll film, it typically produces 6×9 cm negatives and is equipped with a Novar Anastigmat lens.' },
  { id: 27, name: 'Minolta SR-T 101',              image: 'cameras/minolta-srt-101.png',               year: 1966, description: 'The Minolta SR-T 101 is a classic 35mm SLR film camera introduced in 1966, renowned for its durability, reliability, and groundbreaking metering system. It was one of the first cameras to feature TTL (Through-The-Lens) full-aperture metering using Minolta\'s CLC (Contrast Light Compensation) system.' },
  { id: 28, name: 'Canon A-1',                     image: 'cameras/canon-a1.png',                     year: 1978, description: 'The Canon A-1, released in 1978, is a landmark 35mm SLR film camera and one of the first to offer full-programmed auto exposure alongside shutter-priority, aperture-priority, and full manual modes.' },
  { id: 29, name: 'Konica FT-1 Motor',             image: 'cameras/konica-ft-1-motor.png',            year: 1983, description: 'The Konica FT-1 Motor, released in 1983, is a 35mm SLR film camera known for being the last model in Konica\'s long-running Autoreflex series. It features a built-in motor drive offering automatic film advance at up to 2 frames per second. This camera being a gift from some friends, I do not have any lenses for it yet!' },
  { id: 30, name: 'Yashica Electro 35 GSN',        image: 'cameras/yashica-electro-35-gsn.png',       year: 1973, description: 'The Yashica Electro 35 GSN, released in 1973, is a classic 35mm rangefinder camera known for its sharp lens, sleek design, and electronic auto exposure system. It features a fast 45mm f/1.7 Yashinon-DX lens, ideal for low-light photography.' },
  { id: 31, name: 'Graflex 3A',                    image: 'cameras/Graflex3A.png',                    year: 1907, description: 'The Graflex 3A was a folding camera designed to produce 3¼ × 5½ inch negatives, the standard "postcard" format of its era. Manufactured by Folmer & Schwing, later Graflex, it catered to the growing popularity of real photo postcards in the early 20th century.' },
];

const computers = [
  { id: 1, name: 'Apple Macintosh Plus', image: 'computers/apple-macintosh-plus.png', year: 1986, description: 'The Macintosh Plus computer is the third model in the Macintosh line, introduced on January 16, 1986, two years after the original Macintosh and a little more than a year after the Macintosh 512K, with a price tag of US$2,599. As an evolutionary improvement over the 512K, it shipped with 1 MB of RAM standard, expandable to 4 MB, and an external SCSI peripheral bus, among smaller improvements.' },
  { id: 2, name: 'Commodore 64',         image: 'computers/commadore-64.png',          year: 1982, description: 'The Commodore 64, also known as the C64, is an 8-bit home computer introduced in January 1982 by Commodore International. It has been listed in the Guinness World Records as the highest-selling single computer model of all time, with independent estimates placing the number sold between 12.5 and 17 million units. This is also the only item that goes across multiple categories, technically being a console as well as a computer!' },
];

const consoles = [
  { id: 1, name: 'Commodore 64',                  image: 'computers/commadore-64.png',         year: 1982, description: 'The Commodore 64, also known as the C64, is an 8-bit home computer introduced in January 1982 by Commodore International. It has been listed in the Guinness World Records as the highest-selling single computer model of all time, with independent estimates placing the number sold between 12.5 and 17 million units. This is also the only item that goes across multiple categories, technically being a console as well as a computer!' },
  { id: 2, name: 'Atari 2600',                    image: 'consoles/atari-2600.png',             year: 1977, description: 'The Atari 2600 is a home video game console developed and produced by Atari, Inc. Released in September 1977 as the Atari Video Computer System (Atari VCS), it popularized microprocessor-based hardware and games stored on swappable ROM cartridges. The VCS was bundled with two joystick controllers, a conjoined pair of paddle controllers, and a game cartridge.' },
  { id: 3, name: 'Game Boy',                      image: 'consoles/gameboy.png',                year: 1989, description: 'Nintendo\'s Game Boy revolutionized portable gaming when it launched in 1989. With its monochrome screen, chunky design, and iconic D-pad, it brought titles like Tetris and Super Mario Land to players\' pockets. Despite its simplicity, it became a cultural phenomenon, selling over 118 million units worldwide (including Game Boy Color).' },
  { id: 4, name: 'Game Boy Advance SP',           image: 'consoles/gameboy-advanced-sp.png',    year: 2003, description: 'Nintendo\'s Game Boy Advance SP was a sleek upgrade to the original GBA, launched in 2003. With its clamshell design, rechargeable battery, and built-in screen lighting, it solved the visibility issues of its predecessor. Compact, stylish, and backward-compatible with earlier Game Boy titles, it became a fan favorite and sold over 43 million units worldwide.' },
  { id: 5, name: 'Nintendo Entertainment System', image: 'consoles/nes.png',                    year: 1983, description: 'The NES was Nintendo\'s landmark 8-bit home console that revived the video game industry after the 1983 crash. Originally released in Japan as the Famicom in 1983, it launched in North America in 1985 with iconic titles like Super Mario Bros., Duck Hunt, and The Legend of Zelda. With over 61 million units sold, it became a cultural cornerstone and laid the foundation for modern gaming.' },
];

// ── Run ───────────────────────────────────────────────────────────────────────

await migrate('museum_cameras',   cameras);
await migrate('museum_computers', computers);
await migrate('museum_consoles',  consoles);

console.log('\nMigration complete.');
process.exit(0);
