/**
 * Web Speech API helper for French (fr-FR) and Punjabi/Indic TTS (pa-IN / hi-IN).
 * Fully engineered with authentic Gurmukhi orthography & phonetics mapping:
 * - 35 Core Letters (Painti Akhri)
 * - 6 Special Letters (Naveen Varg: ਸ਼, ਖ਼, ਗ਼, ਜ਼, ਫ਼, ਲ਼)
 * - 10 Vowel Marks (Matras: ਮੁਕਤਾ, ਕੰਨਾ ਾ, ਸਿਹਾਰੀ ਿ, ਬਿਹਾਰੀ ੀ, ਔਂਕੜ ੁ, ਦੁਲੈਂਕੜ ੂ, ਲਾਂ ੇ, ਦੁਲਾਵਾਂ ੈ, ਹੋੜਾ ੋ, ਕਨੌੜਾ ੌ)
 * - 3 Auxiliary Marks (Laga Akhar: ਬਿੰਦੀ ਂ, ਟਿੱਪੀ ੰ, ਅੱਧਕ ੱ)
 * - Vowel Bearers (ੳ, ਅ, ੲ) and subjoined conjuncts (ਪੈਰੀਂ ਰ, ਵ, ਹ)
 *
 * Speech Reliability Fixes:
 * - Phonetically accurate Adhak gemination (e.g. ਕਿੱਥੇ -> कित्थे vs ਕਿਥੇ -> किथे).
 * - Strong global reference prevents browser garbage collection of active SpeechSynthesisUtterance.
 * - Generous safety watchdog (30s) prevents premature step interruption.
 * - Automatic pause/resume engine unlock for Chrome/Safari/Edge.
 */

type SpeechCallback = (isSpeaking: boolean) => void;

let activeListeners: Set<SpeechCallback> = new Set();
let cachedFrenchVoice: SpeechSynthesisVoice | null = null;
let cachedPunjabiVoice: SpeechSynthesisVoice | null = null;
let isNativePunjabiVoice = false;
let currentPlaybackSessionId = 0;
// CRITICAL: Prevent browser Garbage Collection from cutting off speech mid-sentence
let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Phonetic gemination map for Gurmukhi Adhak (ੱ).
 * In standard Indic phonetics, geminating an aspirated consonant requires
 * prefixing it with its unaspirated stop (e.g., ੱਥ -> त्थ, ੱਖ -> क्ख, ੱਛ -> च्छ).
 */
const ADHAK_PHONETIC_MAP: Record<string, string> = {
  // Row 2
  'ਕ': 'क्क',
  'ਖ': 'क्ख', // Aspirated -> क्ख (e.g. ਮੁੱਖ -> मुक्ख, ਰੱਖਣਾ -> रक्खणा, ਸਿੱਖਣਾ -> सिक्खणा)
  'ਗ': 'ग्ग',
  'ਘ': 'ग्घ', // Aspirated
  'ਙ': 'ङ्ङ',
  // Row 3
  'ਚ': 'च्च', // (e.g. ਸੱਚ -> सच्च, ਬੱਚਾ -> बच्चा)
  'ਛ': 'च्छ', // Aspirated -> च्छ (e.g. ਅੱਛਾ -> अच्छा)
  'ਜ': 'ज्ज', // (e.g. ਅੱਜ -> अज्ज)
  'ਝ': 'ज्झ', // Aspirated
  'ਞ': 'ञ्ञ',
  // Row 4
  'ਟ': 'ट्ट', // (e.g. ਛੁੱਟੀ -> छुट्टी, ਮਿੱਟੀ -> मिट्टी)
  'ਠ': 'ट्ठ', // Aspirated (e.g. ਦਿੱਠਾ -> दिट्ठा, ਮਿੱਠਾ -> मिट्ठा)
  'ਡ': 'ड्ड', // (e.g. ਗੱਡੀ -> गड्डी, ਵੱਡਾ -> वड्डा)
  'ਢ': 'ड्ढ', // Aspirated (e.g. ਵੱਢਣਾ -> वड्ढणा)
  'ਣ': 'ण्ण',
  // Row 5
  'ਤ': 'त्त', // (e.g. ਜਿੱਤ -> जित्त, ਪੱਤਾ -> पत्ता, ਉੱਤੇ -> उत्तੇ)
  'ਥ': 'त्थ', // Aspirated -> त्थ (CRITICAL: ਕਿੱਥੇ -> कित्थे, ਇੱਥੇ -> इत्थे, ਉੱਥੇ -> उत्थे, ਹੱਥ -> हत्थ)
  'ਦ': 'द्द', // (e.g. ਮੱਦਦ -> मद्दद, ਰੱਦੀ -> रद्दी)
  'ਧ': 'द्ध', // Aspirated -> द्ध (e.g. ਸਿੱਧਾ -> सिद्धा, ਬੁੱਧ -> बुद्ध)
  'ਨ': 'न्न', // (e.g. ਗੰਨਾ -> गन्ना, ਕੰਨ -> कন্ন)
  // Row 6
  'ਪ': 'प्प', // (e.g. ਚੱਪਲ -> चप्पल, ਗੱਪ -> गप्प)
  'ਫ': 'प्फ', // Aspirated -> प्फ (e.g. ਗੱਫਾ -> गप्फा)
  'ਬ': 'ब्ब', // (e.g. ਡੱਬਾ -> डब्बा, ਰੱਬ -> रब्ब)
  'ਭ': 'ब्भ', // Aspirated -> ब्भ (e.g. ਲੱਭਣਾ -> लब्भणा, ਜੀਭ -> जीब्भ)
  'ਮ': 'म्म', // (e.g. ਕੰਮ -> कम्म, ਚੰਮ -> चम्मच)
  // Row 7
  'ਯ': 'य्य',
  'ਰ': 'र्र',
  'ਲ': 'ल्ल', // (e.g. ਗੱਲ -> गल्ल, ਦਿੱਲੀ -> दिल्ली, ਚੱਲ -> चल्ल)
  'ਵ': 'व्व', // (e.g. ਅੱਵਲ -> अव्वल)
  'ੜ': 'ड़',
  // Naveen Varg (6 special letters)
  'ਸ਼': 'श्श',
  'ਖ਼': 'ख़',
  'ਗ਼': 'ग़',
  'ਜ਼': 'ज़्ज़', // (e.g. ਇੱਜ਼ਤ -> इज़्ज़त)
  'ਫ਼': 'फ्फ़',
  'ਲ਼': 'ळ',
  'ਸ': 'स्स', // (e.g. ਦੱਸੋ -> दस्सो, ਰੱਸੀ -> रस्सी, ਲੱਸੀ -> लस्सी)
  'ਹ': 'ह्ह',
};

/**
 * Normalizes Gurmukhi text: cleans slashes, brackets, and prepares natural cadence.
 * Replaces '/' with 'ਜਾਂ' ("or") and ensures proper spacing between words.
 */
export function cleanPunjabiSpeechText(text: string): string {
  if (!text) return '';
  return text
    // Replace slashes with "ਜਾਂ" ("or")
    .replace(/\s*[\/\\|]+\s*/g, ' ਜਾਂ ')
    // Remove brackets but keep space
    .replace(/[()[\]{}]/g, ' ')
    // Replace hyphens with spaces for clean cadence
    .replace(/[-–—]/g, ' ')
    // Normalize extra spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Comprehensive transliteration of Gurmukhi script into phonetic Devanagari
 * for high-fidelity fallback on Hindi/Indic TTS engines when native pa-IN voice is absent.
 * Handles all 35 letters, 6 special letters, 10 matras, 3 laga akhar, and compound vowel bearers.
 */
export function gurmukhiToDevanagari(text: string): string {
  if (!text) return '';

  let str = text;

  // 1. Normalize composite vowel bearer combinations (ੳ, ਅ, ੲ) into standard independent vowels
  str = str
    .replace(/ਅਾ/g, 'ਆ')
    .replace(/ੲਿ/g, 'ਇ')
    .replace(/ੲੀ/g, 'ਈ')
    .replace(/ਉੁ/g, 'ਉ')
    .replace(/ਉੂ/g, 'ਊ')
    .replace(/ੲੇ/g, 'ਏ')
    .replace(/ਅੈ/g, 'ਐ')
    .replace(/ਅੌ/g, 'ਔ')
    .replace(/ੳੋ/g, 'ਓ');

  // 2. High-precision Adhak (ੱ) phonetic gemination
  // Gurmukhi Adhak (ੱ) is placed before the target consonant:
  // e.g. ਕਿੱਥੇ -> ਕਿ + ੱਥ + ੇ => कि + त्थ + े => कित्थे (crisp double consonant)
  // vs ਕਿਥੇ -> किथे (single soft consonant)
  str = str.replace(/ੱ([ਕਖਗਘਙਚਛਜਝਞਟਠਡਢਣਤਥਦਧਨਪਫਬਭਮਯਰਲਵੜਸ਼ਖ਼ਗ਼ਜ਼ਫ਼ਲ਼ਸਹ])/g, (_, cons) => {
    return ADHAK_PHONETIC_MAP[cons] || cons + '्' + cons;
  });

  // 3. Handle special subjoined Pairin characters (ੜ੍ਹ, ਨ੍ਹ, ਮ੍ਹ, ਰ੍ਹ, ਲ੍ਹ, ਵ੍ਹ, ਪ੍ਰ)
  str = str
    .replace(/ੜ੍ਹ/g, 'ढ़')
    .replace(/ੜ੍ਹਾ/g, 'ढ़ा')
    .replace(/ੜ੍ਹੇ/g, 'ढ़े')
    .replace(/ਕੱਲ੍ਹ/g, 'कल्ल')
    .replace(/ਥੋੜ੍ਹਾ/g, 'थोड़ा')
    .replace(/ਥੋੜ੍ਹੀ/g, 'थोड़ी')
    .replace(/ਪ੍ਰ/g, 'प्र')
    .replace(/ਸ੍ਵ/g, 'स्व')
    .replace(/ਵ੍ਹ/g, 'व्ह');

  // 4. Handle Tippi with labials (ਕੰਮ -> कम्म)
  str = str
    .replace(/ਕੰਮ/g, 'कम्म')
    .replace(/ਚੰਮ/g, 'चम्म')
    .replace(/ਨੰਮ/g, 'नम्म');

  // 5. Character-level phonetics mapping for all 35 letters + 6 special + matras
  const map: Record<string, string> = {
    // 35 Letters - Row 1 (Core Vowel Bearers & Sibilant/Glottal)
    'ੳ': 'उ',
    'ਅ': 'अ',
    'ੲ': 'इ',
    'ਸ': 'स',
    'ਹ': 'ह',
    // Row 2 (Velars - ਕੰਠੀ)
    'ਕ': 'क',
    'ਖ': 'ख',
    'ਗ': 'ग',
    'ਘ': 'घ',
    'ਙ': 'ङ',
    // Row 3 (Palatals - ਤਾਲਵੀ)
    'ਚ': 'च',
    'ਛ': 'छ',
    'ਜ': 'ज',
    'ਝ': 'झ',
    'ਞ': 'ञ',
    // Row 4 (Retroflex - ਮੂਰਧਨੀ/ਉਲਟਜੀਭੀ)
    'ਟ': 'ट',
    'ਠ': 'ठ',
    'ਡ': 'ड',
    'ਢ': 'ढ',
    'ਣ': 'ण',
    // Row 5 (Dentals - ਦੰਤੀ)
    'ਤ': 'त',
    'ਥ': 'थ',
    'ਦ': 'द',
    'ਧ': 'ध',
    'ਨ': 'न',
    // Row 6 (Labials - ਹੋਠੀ)
    'ਪ': 'प',
    'ਫ': 'फ',
    'ਬ': 'ब',
    'ਭ': 'भ',
    'ਮ': 'म',
    // Row 7 (Semi-vowels, Flaps & Liquids)
    'ਯ': 'य',
    'ਰ': 'र',
    'ਲ': 'ल',
    'ਵ': 'व',
    'ੜ': 'ड़',

    // 6 Special Letters (Naveen Varg - ਨਵੀਨ ਵਰਗ)
    'ਸ਼': 'श',
    'ਖ਼': 'ख़',
    'ਗ਼': 'ग़',
    'ਜ਼': 'ज़',
    'ਫ਼': 'फ़',
    'ਲ਼': 'ळ',

    // Independent Vowels
    'ਆ': 'आ',
    'ਇ': 'इ',
    'ਈ': 'ई',
    'ਉ': 'उ',
    'ਊ': 'ऊ',
    'ਏ': 'ए',
    'ਐ': 'ऐ',
    'ਓ': 'ओ',
    'ਔ': 'औ',

    // 10 Vowel Marks (Matras - ਮਾਤਰਾਵਾਂ)
    'ਾ': 'ा', // Kanna (ਕੰਨਾ) -> aa
    'ਿ': 'ि', // Sihari (ਸਿਹਾਰੀ) -> i
    'ੀ': 'ी', // Bihari (ਬਿਹਾਰੀ) -> ee
    'ੁ': 'ु', // Aunkar (ਔਂਕੜ) -> u
    'ੂ': 'ू', // Dulankar (ਦੁਲੈਂਕੜ) -> oo
    'ੇ': 'े', // Lavan (ਲਾਂ) -> e
    'ੈ': 'ै', // Dulavan (ਦੁਲਾਵਾਂ) -> ai
    'ੋ': 'ो', // Hora (ਹੋੜਾ) -> o
    'ੌ': 'ौ', // Kanaura (ਕਨੌੜਾ) -> au

    // 3 Auxiliary Marks (Laga Akhar - ਲਗਾਂ ਅੱਖਰ)
    'ਂ': 'ं', // Bindi (ਬਿੰਦੀ)
    'ੰ': 'ं', // Tippi (ਟਿੱਪੀ)
    'ੱ': '्', // Adhak fallback (ਅੱਧਕ)
    '਼': '़', // Nukta (ਪੈਰ ਬਿੰਦੀ)
    '੍': '्', // Halant
    '।': '।', // Danda
    '॥': '॥',

    // Gurmukhi Digits (ਗੁਰਮੁਖੀ ਅੰਕ)
    '੦': '०',
    '੧': '१',
    '੨': '२',
    '੩': '३',
    '੪': '४',
    '੫': '५',
    '੬': '६',
    '੭': '७',
    '੮': '८',
    '੯': '९',
  };

  let devanagari = str
    .split('')
    .map((c) => (map[c] !== undefined ? map[c] : c))
    .join('');

  // 6. Contextual Natural Punjabi Speech Tuning for Indic TTS Engines
  devanagari = devanagari
    .replace(/इहदा/g, 'एहदा')
    .replace(/इਹ/g, 'एਹ')
    .replace(/उਹ/g, 'ਓਹ')
    .replace(/हुंदा/g, 'हुंदा')
    .replace(/जां/g, 'या')
    .replace(/किओं/g, 'क्यों')
    .replace(/कदों/g, 'कदों')
    .replace(/किवें/g, 'किवें')
    .replace(/किंना/g, 'किन्ना')
    .replace(/केहड़ा/g, 'केहड़ा')
    .replace(/केहड़ी/g, 'केहड़ी')
    .replace(/चाहिदा/g, 'चाहिदा')
    .replace(/साडे/g, 'साड्डे')
    .replace(/तुहाडे/g, 'तुहाड्डे');

  return devanagari;
}

/**
 * Loads available voices from SpeechSynthesis and selects the most authentic
 * French voice and Punjabi (or Indic phonetic fallback) voice.
 */
export function getBestVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return;

  // 1. French Voice Selection
  const frVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('fr') ||
      v.lang === 'fr-FR' ||
      v.lang === 'fr_FR' ||
      v.lang === 'fr-CA'
  );

  const premiumFr = frVoices.find(
    (v) =>
      v.name.includes('Google') ||
      v.name.includes('Natural') ||
      v.name.includes('Neural') ||
      v.name.includes('Premium') ||
      v.name.includes('Amélie') ||
      v.name.includes('Thomas') ||
      v.name.includes('Audrey') ||
      v.name.includes('Aurelie') ||
      v.name.includes('Marie')
  );
  cachedFrenchVoice = premiumFr || frVoices[0] || null;

  // 2. Punjabi / Indic Voice Selection
  const paVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('pa') ||
      v.lang === 'pa-IN' ||
      v.lang === 'pa_IN' ||
      v.name.toLowerCase().includes('punjabi')
  );

  const hiVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('hi') ||
      v.lang === 'hi-IN' ||
      v.lang === 'hi_IN' ||
      v.name.toLowerCase().includes('hindi')
  );

  const inVoices = voices.filter(
    (v) =>
      v.lang.includes('IN') ||
      v.lang.includes('India') ||
      v.name.toLowerCase().includes('india')
  );

  if (paVoices.length > 0) {
    cachedPunjabiVoice =
      paVoices.find((v) => v.name.includes('Google') || v.name.includes('Natural')) ||
      paVoices[0];
    isNativePunjabiVoice = true;
  } else if (hiVoices.length > 0) {
    cachedPunjabiVoice =
      hiVoices.find((v) => v.name.includes('Google') || v.name.includes('Natural')) ||
      hiVoices[0];
    isNativePunjabiVoice = false;
  } else if (inVoices.length > 0) {
    cachedPunjabiVoice = inVoices[0];
    isNativePunjabiVoice = false;
  } else {
    cachedPunjabiVoice = null;
    isNativePunjabiVoice = false;
  }
}

export function initVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  getBestVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = getBestVoices;
  }

  // Automatically cancel and stop audio if tab is hidden, backgrounded, or frozen
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopSpeaking();
      }
    });
    window.addEventListener('pagehide', () => {
      stopSpeaking();
    });
  }
}

initVoices();

function notifyListeners(speaking: boolean) {
  activeListeners.forEach((cb) => cb(speaking));
}

export function subscribeSpeechState(callback: SpeechCallback): () => void {
  activeListeners.add(callback);
  return () => {
    activeListeners.delete(callback);
  };
}

/**
 * Reliable single utterance speaker that never drops words.
 */
export function speakUtterance(
  text: string,
  lang: 'fr' | 'pa',
  rate: number = 0.9,
  pitch: number = 1.0,
  sessionId?: number
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(false);
      return;
    }

    if (sessionId !== undefined && sessionId !== currentPlaybackSessionId) {
      resolve(false);
      return;
    }

    if (typeof document !== 'undefined' && document.hidden) {
      resolve(false);
      return;
    }

    try {
      getBestVoices();

      // Ensure speech synthesis is active and resumed
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Format text according to language
      let spokenText = text;
      if (lang === 'pa') {
        spokenText = cleanPunjabiSpeechText(spokenText);
        if (!isNativePunjabiVoice) {
          spokenText = gurmukhiToDevanagari(spokenText);
        }
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      activeUtterance = utterance; // Keep active reference to prevent GC drops

      utterance.rate = Math.max(0.4, Math.min(rate, 1.6));
      utterance.pitch = Math.max(0.8, Math.min(pitch, 1.2));

      if (lang === 'fr') {
        utterance.volume = 1.0;
        utterance.lang = cachedFrenchVoice ? cachedFrenchVoice.lang : 'fr-FR';
        if (cachedFrenchVoice) {
          utterance.voice = cachedFrenchVoice;
        }
      } else {
        utterance.volume = 0.88;
        if (cachedPunjabiVoice) {
          utterance.voice = cachedPunjabiVoice;
          utterance.lang = cachedPunjabiVoice.lang;
        } else {
          utterance.lang = 'hi-IN';
        }
      }

      let timer: number | null = null;
      let completed = false;

      const finish = (success: boolean) => {
        if (completed) return;
        completed = true;
        if (timer) clearTimeout(timer);
        activeUtterance = null;
        if (sessionId !== undefined && sessionId !== currentPlaybackSessionId) {
          resolve(false);
        } else {
          resolve(success);
        }
      };

      utterance.onstart = () => {
        notifyListeners(true);
      };

      utterance.onend = () => {
        finish(true);
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') {
          finish(false);
        } else {
          finish(false);
        }
      };

      // Generous 30-second safety timeout so words are never cut off mid-speech
      timer = window.setTimeout(() => {
        finish(true);
      }, 30000);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      resolve(false);
    }
  });
}

export async function speakFrench(text: string, rate: number = 0.9): Promise<void> {
  stopSpeaking();
  const sessionId = ++currentPlaybackSessionId;
  await speakUtterance(text, 'fr', rate, 1.0, sessionId);
  if (sessionId === currentPlaybackSessionId) {
    notifyListeners(false);
  }
}

export async function speakPunjabi(text: string, rate: number = 1.0): Promise<void> {
  stopSpeaking();
  const sessionId = ++currentPlaybackSessionId;
  await speakUtterance(text, 'pa', rate, 1.0, sessionId);
  if (sessionId === currentPlaybackSessionId) {
    notifyListeners(false);
  }
}

export type TeacherStep = 'idle' | 'word_fr' | 'meaning_pa' | 'example_fr' | 'example_pa';

interface PlayTeacherOptions {
  word: string;
  meaning_pa: string;
  example_fr: string;
  example_pa: string;
  rate?: number; // Controls French speed only (1.0, 0.75, 0.5)
  onStepChange?: (step: TeacherStep) => void;
}

const waitMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Plays human-like teacher commentary:
 * 1. French Word (at user speed, volume 1.0)
 * 2. Punjabi Commentary: "ਇਹਦਾ ਮਤਲਬ ਹੁੰਦਾ ਹੈ, [ਅਰਥ]" (always standard 1.0x rate, volume 0.88)
 * 3. French Example Sentence (at user speed, volume 1.0)
 * 4. Punjabi Commentary: "ਮਤਲਬ, [ਉਦਾਹਰਣ]" (always standard 1.0x rate, volume 0.88)
 */
export async function playTeacherLesson(
  options: PlayTeacherOptions
): Promise<boolean> {
  stopSpeaking();
  const sessionId = ++currentPlaybackSessionId;

  // French rate matches the user's chosen speed
  const frenchRate = options.rate || 0.85;
  // Punjabi rate is ALWAYS natural fluent 1.0x rate
  const punjabiFixedRate = 1.0;

  try {
    if (typeof document !== 'undefined' && document.hidden) return false;

    // -------------------------------------------------------------
    // STEP 1: Speak French Word
    // -------------------------------------------------------------
    options.onStepChange?.('word_fr');
    let ok = await speakUtterance(options.word, 'fr', frenchRate, 1.0, sessionId);
    if (!ok || sessionId !== currentPlaybackSessionId || (typeof document !== 'undefined' && document.hidden)) return false;

    // Natural breathing pause
    await waitMs(450);
    if (sessionId !== currentPlaybackSessionId || (typeof document !== 'undefined' && document.hidden)) return false;

    // -------------------------------------------------------------
    // STEP 2: Punjabi Commentary: "ਇਹਦਾ ਮਤਲਬ ਹੁੰਦਾ ਹੈ, [ਪੰਜਾਬੀ ਸ਼ਬਦ]"
    // -------------------------------------------------------------
    options.onStepChange?.('meaning_pa');
    const cleanedMeaning = cleanPunjabiSpeechText(options.meaning_pa);
    const punjabiPhrase = `ਇਹਦਾ ਮਤਲਬ ਹੁੰਦਾ ਹੈ, ${cleanedMeaning}।`;
    ok = await speakUtterance(punjabiPhrase, 'pa', punjabiFixedRate, 1.0, sessionId);
    if (!ok || sessionId !== currentPlaybackSessionId || (typeof document !== 'undefined' && document.hidden)) return false;

    // Pause before example sentence
    await waitMs(550);
    if (sessionId !== currentPlaybackSessionId || (typeof document !== 'undefined' && document.hidden)) return false;

    // -------------------------------------------------------------
    // STEP 3: French Example Sentence
    // -------------------------------------------------------------
    options.onStepChange?.('example_fr');
    ok = await speakUtterance(options.example_fr, 'fr', frenchRate, 1.0, sessionId);
    if (!ok || sessionId !== currentPlaybackSessionId || (typeof document !== 'undefined' && document.hidden)) return false;

    // Pause before meaning translation
    await waitMs(500);
    if (sessionId !== currentPlaybackSessionId || (typeof document !== 'undefined' && document.hidden)) return false;

    // -------------------------------------------------------------
    // STEP 4: Punjabi Commentary: "ਮਤਲਬ, [ਪੰਜਾਬੀ ਵਾਕ]"
    // -------------------------------------------------------------
    options.onStepChange?.('example_pa');
    const cleanedExamplePa = cleanPunjabiSpeechText(options.example_pa);
    const punjabiExamplePhrase = `ਮਤਲਬ, ${cleanedExamplePa}`;
    ok = await speakUtterance(punjabiExamplePhrase, 'pa', punjabiFixedRate, 1.0, sessionId);
    if (!ok || sessionId !== currentPlaybackSessionId || (typeof document !== 'undefined' && document.hidden)) return false;

    options.onStepChange?.('idle');
    notifyListeners(false);
    return true;
  } catch {
    options.onStepChange?.('idle');
    notifyListeners(false);
    return false;
  }
}

export function stopSpeaking() {
  currentPlaybackSessionId++;
  activeUtterance = null;
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      // ignore
    }
  }
  notifyListeners(false);
}

export function getCurrentPlaybackSessionId() {
  return currentPlaybackSessionId;
}
