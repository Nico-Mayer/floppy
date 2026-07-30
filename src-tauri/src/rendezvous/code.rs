// Human code phrases for quick share: a leading number (the broker mailbox
// room) followed by hyphen-joined words (the shared secret). Shape mirrors
// croc's: `<digits>-<word>-<word>-<word>`, e.g. `4821-crayon-mimic-tundra`.
//
// The number selects the room and is not secret; the words are the PAKE
// password's entropy. Three words from the list below give ~24 bits, which for
// an online-only PAKE (one guess per attempt, gated by the relay) matches
// croc's default strength.

/// Number of words after the leading room number.
const WORD_COUNT: usize = 3;

/// A fresh random u32 from the OS CSPRNG.
fn rand_u32() -> u32 {
    let mut b = [0u8; 4];
    getrandom::fill(&mut b).expect("OS RNG unavailable");
    u32::from_le_bytes(b)
}

/// Generate a fresh code phrase.
pub fn generate() -> String {
    let room = 1000 + (rand_u32() % 9000); // 4 digits, no leading zero
    let mut parts = vec![room.to_string()];
    for _ in 0..WORD_COUNT {
        let idx = (rand_u32() as usize) % WORDS.len();
        parts.push(WORDS[idx].to_string());
    }
    parts.join("-")
}

/// Normalize a pasted/typed code: lowercase, trim, and collapse any run of
/// whitespace or hyphens into a single hyphen. `"  4821 Crayon  mimic "` →
/// `"4821-crayon-mimic"`.
pub fn normalize(code: &str) -> String {
    code.trim()
        .to_lowercase()
        .split(|c: char| c.is_whitespace() || c == '-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

/// The mailbox room id for a code: its leading segment. The broker only ever
/// sees this, never the full code.
pub fn room(normalized_code: &str) -> Option<String> {
    normalized_code.split('-').next().filter(|s| !s.is_empty()).map(|s| s.to_string())
}

/// Whether a string looks like a code phrase (leading digits + at least one
/// word), as opposed to a raw iroh ticket. Lets `receive` route the two.
pub fn looks_like_code(s: &str) -> bool {
    let n = normalize(s);
    let mut parts = n.split('-');
    match parts.next() {
        Some(first) if !first.is_empty() && first.chars().all(|c| c.is_ascii_digit()) => {}
        _ => return false,
    }
    parts.next().is_some() // at least one word after the number
}

/// Compact word list. Short, unambiguous, no easily-confused pairs. ~200 words.
#[rustfmt::skip]
const WORDS: &[&str] = &[
    "acorn","album","amber","anchor","apple","apron","arena","arrow","atlas","autumn",
    "bacon","badge","bagel","bamboo","banjo","barrel","basil","beacon","beetle","bison",
    "blossom","bottle","boulder","branch","bridge","bronze","bubble","bucket","buffalo","button",
    "cactus","cabin","camel","candle","canyon","carbon","cargo","carrot","castle","cedar",
    "cheetah","cherry","chili","cinder","circus","clover","cobra","coconut","comet","copper",
    "coral","cotton","cougar","crayon","crimson","crystal","cushion","cyclone","daisy","dagger",
    "dolphin","domino","donkey","dragon","dryer","eagle","ember","emerald","engine","falcon",
    "fennel","ferret","fiddle","flamingo","flint","forest","fossil","fountain","fox","frost",
    "galaxy","garlic","gecko","ginger","glacier","gopher","granite","grape","gravel","guitar",
    "hammer","harbor","hazel","hedgehog","helmet","heron","hickory","honey","hornet","husky",
    "igloo","indigo","ivory","jaguar","jasmine","jelly","jigsaw","jungle","juniper","kayak",
    "kernel","kettle","koala","ladder","lagoon","lantern","lemon","leopard","lilac","lizard",
    "llama","lobster","lotus","lumber","magnet","mango","maple","marble","meadow","melon",
    "meteor","mimic","mint","mirror","mitten","mongoose","mosaic","muffin","mushroom","narwhal",
    "nectar","needle","nickel","noodle","nugget","oasis","ocelot","olive","onyx","orbit",
    "orchid","otter","oxygen","oyster","paddle","panda","papaya","parrot","peanut","pebble",
    "pelican","penguin","pepper","pewter","pigeon","pillow","pine","piston","pixel","planet",
    "plum","pocket","pollen","poppy","prism","pumpkin","puzzle","quartz","quiver","rabbit",
    "raccoon","radar","raven","ribbon","river","robin","rocket","rubber","saddle","salmon",
    "sapphire","satin","scooter","seagull","sesame","shadow","shrimp","silver","siren","sled",
    "sloth","socket","spruce","squid","stallion","stork","sugar","sulfur","sunset","syrup",
    "tandem","tangerine","teapot","thistle","thunder","tiger","toaster","tomato","topaz","tornado",
    "trumpet","tulip","tundra","turtle","umbrella","unicorn","velvet","vertex","violet","volcano",
    "walnut","walrus","wasabi","willow","window","wombat","yodel","zebra","zephyr","zigzag",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_code_shape() {
        let c = generate();
        let parts: Vec<_> = c.split('-').collect();
        assert_eq!(parts.len(), WORD_COUNT + 1);
        assert!(parts[0].chars().all(|ch| ch.is_ascii_digit()));
        assert_eq!(normalize(&c), c); // already normalized
    }

    #[test]
    fn normalize_spaces_and_hyphens() {
        assert_eq!(normalize("  4821  Crayon-mimic "), "4821-crayon-mimic");
        assert_eq!(normalize("4821 crayon mimic"), "4821-crayon-mimic");
        assert_eq!(normalize("4821--crayon"), "4821-crayon");
    }

    #[test]
    fn room_is_leading_segment() {
        assert_eq!(room("4821-crayon-mimic").as_deref(), Some("4821"));
    }

    #[test]
    fn code_vs_ticket() {
        assert!(looks_like_code("4821-crayon-mimic"));
        assert!(looks_like_code("4821 crayon mimic"));
        assert!(!looks_like_code("blobabc...")); // a ticket
        assert!(!looks_like_code("4821")); // number only, no word
    }
}
