export function AmbientWash() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -top-40 right-[-8%] h-[34rem] w-[42rem] rounded-full bg-amber/25 blur-[120px] dark:bg-amber/15" />
      <div className="absolute top-[22%] left-[28%] h-[30rem] w-[38rem] rounded-full bg-white/70 blur-[140px] dark:bg-white/5" />
      <div className="absolute -bottom-36 left-[-12%] h-[32rem] w-[36rem] rounded-full bg-teal/15 blur-[130px] dark:bg-teal/10" />
    </div>
  );
}
