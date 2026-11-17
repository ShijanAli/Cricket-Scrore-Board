/** "Mirpur Kings" -> "MK", "Dhaka" -> "DHA". 2 to 4 uppercase letters or digits. */
export function shortNameOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const raw =
    words.length >= 2
      ? words.map((w) => w[0]).join('')
      : (words[0] ?? 'TM').slice(0, 3);
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const short = cleaned.slice(0, 4);
  return short.length >= 2 ? short : (short + 'TM').slice(0, 2);
}
