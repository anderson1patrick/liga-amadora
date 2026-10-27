// Campeonatos acompanhados, guardados só neste aparelho (sem cadastro).
const KEY = "liga-amadora:seguidos";

export type Followed = { token: string; name: string };

export function getFollowed(): Followed[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((x) => x && typeof x.token === "string" && typeof x.name === "string");
  } catch {
    return [];
  }
}

export function saveFollowed(item: Followed) {
  try {
    const list = getFollowed().filter((x) => x.token !== item.token);
    list.unshift(item);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* armazenamento indisponível: ignora */
  }
}

export function removeFollowed(token: string) {
  try {
    const list = getFollowed().filter((x) => x.token !== token);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignora */
  }
}

// Aceita o link completo (.../p/codigo) ou só o código.
export function extractToken(input: string) {
  const text = input.trim();
  const match = text.match(/\/p\/([A-Za-z0-9]+)/);
  return (match ? match[1] : text).replace(/[^A-Za-z0-9]/g, "");
}
