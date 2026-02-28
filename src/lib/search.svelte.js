// Searches tracksMap (id -> track) against the query string.
// Returns array of matching track IDs ordered by relevance, capped at 100.
// Relevance: word-boundary matches rank above mid-word substring matches.
export function searchTracks(query, tracksMap) {

  const simplified = simplifyString(query).trim();

  if (simplified.length < 2) return [];

  const len = simplified.length;
  const relevant = [];
  const lessRelevant = [];

  for (const [id, track] of Object.entries(tracksMap)) {

    const artist = track.simplifiedArtist ?? '';
    const title = track.simplifiedName ?? '';

    const artistIdx = artist.indexOf(simplified);
    const titleIdx = title.indexOf(simplified);

    if (artistIdx === -1 && titleIdx === -1) continue;

    const isRelevant =
      artistIdx === 0 ||
      (artistIdx > 0 && (
        artist[artistIdx - 1] === ' ' ||
        artist[artistIdx + len] === ' ' ||
        artist[artistIdx + len] === ','
      )) ||
      titleIdx === 0 ||
      (titleIdx > 0 && (
        title[titleIdx - 1] === ' ' ||
        title[titleIdx + len] === ' ' ||
        title[titleIdx + len] === ','
      ));

    if (isRelevant) {
      relevant.push(id);
    } else {
      lessRelevant.push(id);
    }
  }

  return [...relevant, ...lessRelevant].slice(0, 100);
}

export const simplifyString = (str) => {

  const normalizedStr = str.normalize('NFC')

  const map = {
    'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE', 'Ç': 'C', 'È': 'E', 'É': 'E',
    'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I', 'Ð': 'D', 'Ñ': 'N', 'Ò': 'O', 'Ó': 'O',
    'Ô': 'O', 'Õ': 'O', 'Ö': 'O', 'Ø': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U', 'Ý': 'Y', 'Þ': 'TH',
    'ß': 'ss', 'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae', 'ç': 'c', 'è': 'e',
    'é': 'e', 'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ð': 'd', 'ñ': 'n', 'ò': 'o',
    'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o', 'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y',
    'þ': 'th', 'ÿ': 'y', 'ẞ': 'SS', 'ă': 'a', 'Ą': 'A', 'ą': 'a', 'Ć': 'C', 'ć': 'c', 'Č': 'C', 'č': 'c',
    'Ď': 'D', 'ď': 'd', 'Đ': 'D', 'đ': 'd', 'Ě': 'E', 'ě': 'e', 'Ą': 'E', 'ė': 'e', 'ę': 'e', 'Ę': 'E',
    'Ģ': 'G', 'ģ': 'g', 'Ħ': 'H', 'ħ': 'h', 'Ĩ': 'I', 'ĩ': 'i', 'Ī': 'I', 'ī': 'i', 'Į': 'I', 'į': 'i',
    'I': 'I', 'ı': 'i', 'Ķ': 'K', 'ķ': 'k', 'Ļ': 'L', 'ļ': 'l', 'Ľ': 'L', 'ľ': 'l', 'Ł': 'L', 'ł': 'l',
    'Ń': 'N', 'ń': 'n', 'Ņ': 'N', 'ņ': 'n', 'Ň': 'N', 'ň': 'n', 'Ō': 'O', 'ō': 'o', 'Ő': 'O', 'ő': 'o',
    'Œ': 'OE', 'œ': 'oe', 'Ŕ': 'R', 'ŕ': 'r', 'Ř': 'R', 'ř': 'r', 'Ś': 'S', 'ś': 's', 'Ş': 'S', 'ş': 's',
    'Š': 'S', 'š': 's', 'Ţ': 'T', 'ţ': 't', 'Ť': 'T', 'ť': 't', 'Ũ': 'U', 'ũ': 'u', 'Ū': 'U', 'ū': 'u',
    'Ů': 'U', 'ů': 'u', 'Ű': 'U', 'ű': 'u', 'Ų': 'U', 'ų': 'u', 'Ŵ': 'W', 'ŵ': 'w', 'Ŷ': 'Y', 'ŷ': 'y',
    'Ÿ': 'Y', 'Ź': 'Z', 'ź': 'z', 'Ż': 'Z', 'ż': 'z', 'Ž': 'Z', 'ž': 'z', 'ſ': 's'
  }

  return normalizedStr.replace(/[^A-Za-z0-9]/g, (char) => map[char] || char).toLowerCase()
}
