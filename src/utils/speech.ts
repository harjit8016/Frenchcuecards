/**
 * Web Speech API helper for French (fr-FR) and Punjabi/Indic TTS (pa-IN / hi-IN)
 * Engineered for authentic, human-like bilingual commentary.
 *
 * Rules:
 * 1. French volume is ~120% relative to Punjabi volume (French: 1.0, Punjabi: 0.82).
 * 2. Punjabi speed is always fixed at fluent native rate (1.1x - 1.15x) because users are native speakers.
 * 3. French speed is controlled by the user's chosen speed button (1.0x, 0.75x, 0.5x).
 * 4. Any slash ("/") in Punjabi text is pronounced as "ਜਾਂ" (meaning "or").
 */

type SpeechCallback = (isSpeaking: boolean) => void;

let activeListeners: Set<SpeechCallback> = new Set();
let cachedFrenchVoice: SpeechSynthesisVoice | null = null;
let cachedPunjabiVoice: SpeechSynthesisVoice | null = null;
let isNativePunjabiVoice = false;
let currentPlaybackSessionId = 0;

/**
 * Replaces slashes in Punjabi text with 'ਜਾਂ' ("or") and cleans up punctuation for natural speech.
 */
export function cleanPunjabiSpeechText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*[\/\\|]+\s*/g, ' ਜਾਂ ')
    .replace(/[()]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Transliterates Gurmukhi text to Devanagari for fallback Hindi/Indic voices
 * when a dedicated pa-IN voice is not installed on the user's OS/browser.
 */
function gurmukhiToDevanagari(text: string): string {
  // Pre-process adhak (gemination marker ੱ): in Gurmukhi, ੱ doubles the following consonant
  let processed = text.replace(/ੱ(.)/g, '$1्$1');

  const map: Record<string, string> = {
    // Vowels
    'ਅ': 'अ', 'ਆ': 'आ', 'ਇ': 'इ', 'ਈ': 'ई', 'ਉ': 'उ', 'ਊ': 'ऊ', 'ਏ': 'ए', 'ਐ': 'ऐ', 'ਓ': 'ओ', 'ਔ': 'औ',
    // Consonants
    'ਕ': 'क', 'ਖ': 'ख', 'ਗ': 'ग', 'ਘ': 'घ', 'ਙ': 'ङ',
    'ਚ': 'च', 'ਛ': 'छ', 'ਜ': 'ज', 'ਝ': 'झ', 'ਞ': 'ञ',
    'ਟ': 'ट', 'ਠ': 'ठ', 'ਡ': 'ड', 'ਢ': 'ढ', 'ਣ': 'ण',
    'ਤ': 'त', 'ਥ': 'थ', 'ਦ': 'द', 'ਧ': 'ध', 'ਨ': 'न',
    'ਪ': 'प', 'ਫ': 'फ', 'ਬ': 'ब', 'ਭ': 'भ', 'ਮ': 'म',
    'ਯ': 'य', 'ਰ': 'र', 'ਲ': 'ल', 'ਲ਼': 'ळ', 'ਵ': 'व', 'ਸ਼': 'श', 'ਸ': 'स', 'ਹ': 'ह',
    // Nukta consonants
    'ਜ਼': 'ज़', 'ਫ਼': 'फ़', 'ਖ਼': 'ख़', 'ਗ਼': 'ग़',
    // Vowel signs (Matras)
    'ਾ': 'ा', 'ਿ': 'ि', 'ੀ': 'ी', 'ੁ': 'ु', 'ੂ': 'ू', 'ੇ': 'े', 'ੈ': 'ै', 'ੋ': 'ो', 'ੌ': 'ौ',
    // Diacritics
    'ੰ': 'ं', 'ਂ': 'ं', 'ੱ': '्', '਼': '़', '੍': '्', 'ੑ': '्',
    // Numerals
    '੦': '०', '੧': '१', '੨': '२', '੩': '३', '੪': '४', '੫': '५', '੬': '६', '੭': '७', '੮': '८', '੯': '९',
  };

  // Convert character by character
  let result = processed
    .split('')
    .map((char) => map[char] || char)
    .join('');

  // Conversions for natural spoken inflection on Hindi/Indic TTS engines
  return result
    .replace(/इहदा/g, 'एहदा')
    .replace(/हुंदा/g, 'हुंदा')
    .replace(/जां/g, 'या')
    .replace(/किथ्थे/g, 'कित्थे')
    .replace(/किओं/g, 'क्यों')
    .replace(/कदों/g, 'कदों')
    .replace(/किवें/g, 'किवें');
}

function getBestVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return;

  // 1. Pick the best natural French voice
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

  // 2. Pick the best Punjabi / Indic Commentary voice
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

function initVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  getBestVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = getBestVoices;
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

    try {
      getBestVoices();

      // Ensure speech synthesis is active and resumed
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Format text according to native engine availability
      let spokenText = text;
      if (lang === 'pa') {
        spokenText = cleanPunjabiSpeechText(spokenText);
        if (!isNativePunjabiVoice) {
          // Fallback voice (Hindi/Indic engine) reads Devanagari phonetics with native clarity
          spokenText = gurmukhiToDevanagari(spokenText);
        }
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.rate = Math.max(0.4, Math.min(rate, 1.8));
      utterance.pitch = Math.max(0.8, Math.min(pitch, 1.3));

      // French volume 1.0 (120%), Punjabi volume 0.82 (100% relative level)
      if (lang === 'fr') {
        utterance.volume = 1.0;
        utterance.lang = cachedFrenchVoice ? cachedFrenchVoice.lang : 'fr-FR';
        if (cachedFrenchVoice) {
          utterance.voice = cachedFrenchVoice;
        }
      } else {
        utterance.volume = 0.82; // Punjabi volume is 0.82 vs French 1.0 (approx 100 : 120 ratio)
        if (cachedPunjabiVoice) {
          utterance.voice = cachedPunjabiVoice;
          utterance.lang = cachedPunjabiVoice.lang;
        } else {
          utterance.lang = 'hi-IN';
        }
      }

      let timer: number | null = null;

      const finish = (success: boolean) => {
        if (timer) clearTimeout(timer);
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

      utterance.onerror = () => {
        finish(false);
      };

      // Watchdog timeout to prevent hangs on unsupported speech drivers
      const estimatedDuration = Math.max(2000, (spokenText.length / 8) * 1000 * (1 / utterance.rate));
      timer = window.setTimeout(() => {
        finish(true);
      }, estimatedDuration + 1200);

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
  // Punjabi speed is standard natural 1.0x rate
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
 * 2. Punjabi Commentary: "ਇਹਦਾ ਮਤਲਬ ਹੁੰਦਾ ਹੈ, [ਅਰਥ]" (always standard 1.0x rate, volume 0.82)
 * 3. French Example Sentence (at user speed, volume 1.0)
 * 4. Punjabi Commentary: "ਮਤਲਬ, [ਉਦਾਹਰਣ]" (always standard 1.0x rate, volume 0.82)
 */
export async function playTeacherLesson(
  options: PlayTeacherOptions
): Promise<boolean> {
  stopSpeaking();
  const sessionId = ++currentPlaybackSessionId;
  
  // French rate matches the user's chosen speed directly
  const frenchRate = options.rate || 0.75;
  // Punjabi rate is ALWAYS natural 1.0x
  const punjabiFixedRate = 1.0;

  try {
    // -------------------------------------------------------------
    // STEP 1: Speak French Word
    // -------------------------------------------------------------
    options.onStepChange?.('word_fr');
    let ok = await speakUtterance(options.word, 'fr', frenchRate, 1.0, sessionId);
    if (!ok || sessionId !== currentPlaybackSessionId) return false;

    // Natural pause
    await waitMs(400);
    if (sessionId !== currentPlaybackSessionId) return false;

    // -------------------------------------------------------------
    // STEP 2: Punjabi Commentary: "ਇਹਦਾ ਮਤਲਬ ਹੁੰਦਾ ਹੈ, [ਪੰਜਾਬੀ ਸ਼ਬਦ]"
    // -------------------------------------------------------------
    options.onStepChange?.('meaning_pa');
    const cleanedMeaning = cleanPunjabiSpeechText(options.meaning_pa);
    const punjabiPhrase = `ਇਹਦਾ ਮਤਲਬ ਹੁੰਦਾ ਹੈ, ${cleanedMeaning}।`;
    ok = await speakUtterance(punjabiPhrase, 'pa', punjabiFixedRate, 1.0, sessionId);
    if (!ok || sessionId !== currentPlaybackSessionId) return false;

    // Pause before example sentence
    await waitMs(500);
    if (sessionId !== currentPlaybackSessionId) return false;

    // -------------------------------------------------------------
    // STEP 3: French Example Sentence
    // -------------------------------------------------------------
    options.onStepChange?.('example_fr');
    ok = await speakUtterance(options.example_fr, 'fr', frenchRate, 1.0, sessionId);
    if (!ok || sessionId !== currentPlaybackSessionId) return false;

    // Pause before meaning translation
    await waitMs(450);
    if (sessionId !== currentPlaybackSessionId) return false;

    // -------------------------------------------------------------
    // STEP 4: Punjabi Commentary: "ਮਤਲਬ, [ਪੰਜਾਬੀ ਵਾਕ]"
    // -------------------------------------------------------------
    options.onStepChange?.('example_pa');
    const cleanedExamplePa = cleanPunjabiSpeechText(options.example_pa);
    const punjabiExamplePhrase = `ਮਤਲਬ, ${cleanedExamplePa}`;
    ok = await speakUtterance(punjabiExamplePhrase, 'pa', punjabiFixedRate, 1.0, sessionId);
    if (!ok || sessionId !== currentPlaybackSessionId) return false;

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
