export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    return <img src={src} alt={name} style={style} referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span style={style} className="flex shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
      {(name[0] || '?').toUpperCase()}
    </span>
  );
}
