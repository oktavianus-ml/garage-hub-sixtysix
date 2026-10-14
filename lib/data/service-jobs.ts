export type ServiceJob = {
  id: string;
  title: string;
  tasks: string[];
};

export const SERVICE_JOBS: ServiceJob[] = [
  {
    id: "oli",
    title: "Ganti oli",
    tasks: ["kuras oli mesin", "isi oli baru", "cek volume oli"],
  },
  {
    id: "ringan",
    title: "Servis ringan",
    tasks: ["ganti oli", "cek busi", "bersihkan filter udara", "stel dan lumasi rantai", "cek rem dan angin ban"],
  },
  {
    id: "besar",
    title: "Servis besar",
    tasks: [
      "ganti oli",
      "setel klep",
      "bersihkan karburator atau throttle body",
      "ganti busi",
      "bersihkan filter udara",
      "cek rem, rantai, dan kelistrikan",
    ],
  },
  {
    id: "karbu",
    title: "Servis karbu",
    tasks: ["bongkar karburator", "bersihkan jet dan mangkuk", "setel langsam", "tes mesin"],
  },
  {
    id: "cvt",
    title: "Servis CVT",
    tasks: ["buka cover CVT", "cek atau ganti v-belt", "cek roller dan kampas", "bersihkan debu CVT"],
  },
  {
    id: "gardan",
    title: "Oli gardan",
    tasks: ["kuras oli gardan", "isi oli gardan baru", "cek seal"],
  },
  {
    id: "rem",
    title: "Rem",
    tasks: ["cek kampas depan dan belakang", "ganti kampas yang tipis", "setel rem"],
  },
  {
    id: "rantai",
    title: "Rantai",
    tasks: ["stel kekencangan", "lumasi rantai", "cek gear depan dan belakang"],
  },
  {
    id: "ban",
    title: "Ban",
    tasks: ["cek tekanan dan keausan", "tambal jika bocor", "ganti jika aus"],
  },
  {
    id: "listrik",
    title: "Kelistrikan",
    tasks: ["cek aki", "cek busi", "cek lampu dan klakson"],
  },
];

const OTHER_TITLE = "Lain-lain";

export function composeComplaint(ids: string[], other: string) {
  const parts: string[] = [];
  for (const job of SERVICE_JOBS) {
    if (!ids.includes(job.id)) continue;
    parts.push(`${job.title}: ${job.tasks.join(", ")}`);
  }
  const note = other.trim();
  if (note) parts.push(`${OTHER_TITLE}: ${note}`);
  return parts.length ? `${parts.join(". ")}.` : "";
}

export function parseComplaint(value: string) {
  const text = value.trim();
  if (!text) return { ids: [] as string[], other: "" };

  const markers = [
    ...SERVICE_JOBS.map((job) => ({ id: job.id, token: `${job.title}: ` })),
    { id: "lain", token: `${OTHER_TITLE}: ` },
  ].sort((a, b) => b.token.length - a.token.length);

  const hits: { index: number; id: string; token: string }[] = [];
  for (const marker of markers) {
    let from = 0;
    while (from < text.length) {
      const index = text.indexOf(marker.token, from);
      if (index < 0) break;
      const overlaps = hits.some(
        (hit) => index >= hit.index && index < hit.index + hit.token.length,
      );
      if (!overlaps) hits.push({ index, id: marker.id, token: marker.token });
      from = index + marker.token.length;
    }
  }

  if (hits.length === 0) return { ids: [] as string[], other: text };

  hits.sort((a, b) => a.index - b.index);
  const ids: string[] = [];
  let other = "";
  const prefix = text.slice(0, hits[0].index).replace(/[.\s]+$/g, "").trim();

  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index + hits[i].token.length;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
    const body = text.slice(start, end).replace(/[.\s]+$/g, "").trim();
    if (hits[i].id === "lain") other = body;
    else if (!ids.includes(hits[i].id)) ids.push(hits[i].id);
  }

  if (prefix) other = other ? `${prefix}. ${other}` : prefix;
  return { ids, other };
}
