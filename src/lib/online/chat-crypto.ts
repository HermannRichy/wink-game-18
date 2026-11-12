/**
 * Chiffrement de bout en bout du chat (Web Crypto, aucune dépendance).
 * Chaque téléphone crée une paire de clés ECDH P-256, publie seulement la clé publique dans le salon,
 * puis dérive avec la clé publique de l'autre un secret AES-GCM commun qui ne quitte jamais les appareils.
 */

const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export interface MyKeys {
  /** Clé publique (JWK en JSON), à publier */
  pub: string;
  priv: CryptoKey;
}

const storeKey = (code: string, index: number) => `wink-chat-key-${code}-${index}`;

/** Efface les clés de chat d'une partie (quand on l'oublie ou qu'elle est supprimée) */
export function forgetChatKeys(code: string) {
  for (const i of [0, 1]) {
    try {
      localStorage.removeItem(storeKey(code, i));
      sessionStorage.removeItem(storeKey(code, i));
    } catch {
      /* stockage indisponible */
    }
  }
}

/**
 * Récupère la paire de clés de cette partie, ou en crée une.
 * Gardée sur le téléphone (localStorage) : fermer l'app ne doit pas changer la clé,
 * sinon les anciens messages deviennent illisibles.
 */
export async function getMyKeys(code: string, index: 0 | 1): Promise<MyKeys> {
  try {
    const raw = localStorage.getItem(storeKey(code, index)) ?? sessionStorage.getItem(storeKey(code, index));
    if (raw) {
      const { pub, priv } = JSON.parse(raw) as { pub: string; priv: JsonWebKey };
      return { pub, priv: await crypto.subtle.importKey("jwk", priv, ECDH, false, ["deriveKey"]) };
    }
  } catch {
    /* on en recrée une */
  }
  const pair = await crypto.subtle.generateKey(ECDH, true, ["deriveKey"]);
  const pub = JSON.stringify(await crypto.subtle.exportKey("jwk", pair.publicKey));
  const privJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  try {
    localStorage.setItem(storeKey(code, index), JSON.stringify({ pub, priv: privJwk }));
  } catch {
    /* stockage indisponible : la clé vivra le temps de la page */
  }
  return { pub, priv: await crypto.subtle.importKey("jwk", privJwk, ECDH, false, ["deriveKey"]) };
}

export async function deriveShared(priv: CryptoKey, otherPub: string): Promise<CryptoKey> {
  const pub = await crypto.subtle.importKey("jwk", JSON.parse(otherPub) as JsonWebKey, ECDH, false, []);
  return crypto.subtle.deriveKey({ name: "ECDH", public: pub }, priv, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptText(key: CryptoKey, text: string): Promise<{ iv: string; ct: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return { iv: b64(iv), ct: b64(ct) };
}

export async function decryptText(key: CryptoKey, iv: string, ct: string): Promise<string | null> {
  try {
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, key, unb64(ct));
    return new TextDecoder().decode(buf);
  } catch {
    return null;
  }
}
