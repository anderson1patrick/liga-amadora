interface CrestTeam {
  name: string;
  short_name: string | null;
  color: string;
  crest_url: string | null;
}

export function TeamCrest({ team, size = 28 }: { team: CrestTeam; size?: number }) {
  const initials = (team.short_name || team.name)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  if (team.crest_url) {
    return (
      <img
        src={team.crest_url}
        alt={team.name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-[10px] font-bold text-background"
      style={{ width: size, height: size, backgroundColor: team.color }}
    >
      {initials}
    </span>
  );
}
