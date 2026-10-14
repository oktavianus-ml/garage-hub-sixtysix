"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { Moon, Receipt, Store, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { saveWorkshopSettingsAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import {
  paperChoices,
  RECEIPT_LOGOS,
  receiptLogo,
  type PaperWidth,
  type ReceiptLogo,
} from "@/lib/data/receipt-options";
import type { WorkshopSettings } from "@/lib/data/settings";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const areaClass = "min-h-20 w-full rounded-xl border border-line-strong bg-field px-3 py-2 text-base";
const PARTS = [
  { label: "Oli mesin", amount: 48000 },
  { label: "Kampas rem", amount: 35000 },
];
const LABOR = { label: "Jasa servis", amount: 75000 };

function subscribe() {
  return () => {};
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
      {label}
      {children}
    </label>
  );
}

function ToggleRow({
  name,
  label,
  checked,
  disabled,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-field px-3">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="checkbox"
        name={name}
        value="1"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#c4840a]"
      />
    </label>
  );
}

function PaperChoice({
  value,
  note,
  current,
  disabled,
  onChange,
}: {
  value: PaperWidth;
  note: string;
  current: PaperWidth;
  disabled: boolean;
  onChange: (value: PaperWidth) => void;
}) {
  const selected = value === current;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onChange(value)}
      className={cn(
        "min-h-14 flex-1 rounded-xl border px-3 py-2 text-left disabled:opacity-60",
        selected ? "border-amber bg-amber-soft text-ink" : "border-line bg-chip text-muted",
      )}
    >
      <span className="block text-sm font-semibold">{value} mm</span>
      <span className="mt-0.5 block text-[11px] font-medium">{note}</span>
    </button>
  );
}

function LogoChoice({
  id,
  current,
  disabled,
  onChange,
}: {
  id: ReceiptLogo;
  current: ReceiptLogo;
  disabled: boolean;
  onChange: (id: ReceiptLogo) => void;
}) {
  const logo = receiptLogo(id);
  const selected = id === current;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onChange(id)}
      className={cn(
        "flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-white px-2 py-2 disabled:opacity-60",
        selected ? "border-amber ring-2 ring-amber" : "border-line",
      )}
    >
      <img src={logo.src} alt="" className="h-10 w-full object-contain" />
      <span className={cn("text-[11px] font-semibold", selected ? "text-[#1c1915]" : "text-[#6b6560]")}>
        {logo.label}
      </span>
    </button>
  );
}

function ReceiptPreview({
  name,
  phone,
  address,
  receiptFooter,
  showPhone,
  showAddress,
  showLabor,
  paper,
  logo,
}: WorkshopSettings) {
  const title = name.trim() || "Nama bengkel";
  const mark = receiptLogo(logo);
  const items = showLabor ? [LABOR, ...PARTS] : PARTS;
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const lines = [
    showAddress ? address.trim() : "",
    showPhone ? phone.trim() : "",
  ].filter(Boolean);

  return (
    <div
      className="mx-auto w-full rounded-lg bg-[#fffdf8] px-4 py-5 text-[#1c1915] shadow-[0_8px_24px_rgba(28,25,21,0.12)]"
      style={{ maxWidth: paper === "80" ? 302 : 220 }}
    >
      <img
        src={mark.src}
        alt={mark.label}
        className="mx-auto mb-3 object-contain"
        style={{ width: paper === "80" ? 200 : 148, height: 46 }}
      />
      <p className="text-center text-sm font-bold tracking-wide uppercase">{title}</p>
      {lines.map((line, index) => (
        <p key={`${index}-${line}`} className="mt-1 text-center text-[11px] leading-4 break-words whitespace-pre-line text-[#6b6560]">
          {line}
        </p>
      ))}
      <div className="my-3 border-t border-dashed border-[#1c1915]/25" />
      <p className="text-[11px] font-semibold">KSR-0142</p>
      <p className="text-[11px] text-[#6b6560]">14 Okt 2026</p>
      <ul className="mt-3 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.label} className="flex justify-between gap-3 text-[11px]">
            <span>{item.label}</span>
            <span className="tabular-nums">{rupiah(item.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="my-3 border-t border-dashed border-[#1c1915]/25" />
      <p className="flex justify-between gap-3 text-xs font-bold">
        <span>Total</span>
        <span className="tabular-nums">{rupiah(total)}</span>
      </p>
      <p className="mt-1 text-[11px] text-[#6b6560]">Tunai</p>
      {receiptFooter.trim() ? (
        <>
          <div className="my-3 border-t border-dashed border-[#1c1915]/25" />
          <p className="text-center text-[11px] leading-4 break-words whitespace-pre-line text-[#6b6560]">
            {receiptFooter.trim()}
          </p>
        </>
      ) : null}
    </div>
  );
}

function DisplayModeCard() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = !mounted || resolvedTheme !== "light";

  return (
    <GlassCard className="p-4">
      <SectionTitle icon={dark ? Moon : Sun}>Mode tampilan</SectionTitle>
      <p className="mt-1 text-sm leading-6 text-muted">Gelap atau terang untuk layar ini.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          aria-pressed={dark}
          onClick={() => setTheme("dark")}
          className={cn(
            "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold",
            dark ? "border-amber bg-amber-soft text-ink" : "border-line bg-chip text-muted",
          )}
        >
          <Moon className="size-4" aria-hidden />
          Gelap
        </button>
        <button
          type="button"
          aria-pressed={mounted && !dark}
          onClick={() => setTheme("light")}
          className={cn(
            "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold",
            mounted && !dark ? "border-amber bg-amber-soft text-ink" : "border-line bg-chip text-muted",
          )}
        >
          <Sun className="size-4" aria-hidden />
          Terang
        </button>
      </div>
    </GlassCard>
  );
}

export function SettingsPanel({
  settings,
  canWrite,
}: {
  settings: WorkshopSettings;
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(saveWorkshopSettingsAction, null);
  const [name, setName] = useState(settings.name);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [showPhone, setShowPhone] = useState(settings.showPhone);
  const [showAddress, setShowAddress] = useState(settings.showAddress);
  const [showLabor, setShowLabor] = useState(settings.showLabor);
  const [paper, setPaper] = useState<PaperWidth>(settings.paper);
  const [logo, setLogo] = useState<ReceiptLogo>(settings.logo);
  const snapshot = [
    settings.name,
    settings.phone,
    settings.address,
    settings.receiptFooter,
    settings.showPhone,
    settings.showAddress,
    settings.showLabor,
    settings.paper,
    settings.logo,
  ].join("|");

  useEffect(() => {
    setName(settings.name);
    setPhone(settings.phone);
    setAddress(settings.address);
    setReceiptFooter(settings.receiptFooter);
    setShowPhone(settings.showPhone);
    setShowAddress(settings.showAddress);
    setShowLabor(settings.showLabor);
    setPaper(settings.paper);
    setLogo(settings.logo);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot encodes these fields
  }, [snapshot]);

  const draft: WorkshopSettings = {
    name,
    phone,
    address,
    receiptFooter,
    showPhone,
    showAddress,
    showLabor,
    paper,
    logo,
  };

  return (
    <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <GlassCard accent className="p-4">
        <form action={action} className="flex flex-col gap-6">
          <div>
            <SectionTitle icon={Store}>Profil bengkel</SectionTitle>
            <p className="mt-1 text-sm leading-6 text-muted">
              Nama, telepon, dan alamat ini tampil di struk dan di kepala laporan.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Nama bengkel">
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  disabled={!canWrite}
                  placeholder="Nama yang tercetak"
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field label="Telepon">
                <input
                  name="phone"
                  type="tel"
                  maxLength={30}
                  disabled={!canWrite}
                  placeholder="Nomor yang bisa dihubungi"
                  className={inputClass}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </Field>
              <Field label="Alamat">
                <textarea
                  name="address"
                  maxLength={200}
                  disabled={!canWrite}
                  placeholder="Jalan dan kota bengkel"
                  className={areaClass}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </Field>
            </div>
          </div>

          <div>
            <SectionTitle icon={Receipt} tone="teal">
              Struk
            </SectionTitle>
            <p className="mt-1 text-sm leading-6 text-muted">
              Logo, catatan bawah, dan lebar roll thermal yang tercetak.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold text-muted">Logo di struk</p>
                <input type="hidden" name="logo" value={logo} />
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {RECEIPT_LOGOS.map((item) => (
                    <LogoChoice
                      key={item.id}
                      id={item.id}
                      current={logo}
                      disabled={!canWrite}
                      onChange={setLogo}
                    />
                  ))}
                </div>
              </div>
              <Field label="Catatan bawah">
                <textarea
                  name="receiptFooter"
                  maxLength={160}
                  disabled={!canWrite}
                  placeholder="Misalnya terima kasih atau masa garansi"
                  className={areaClass}
                  value={receiptFooter}
                  onChange={(event) => setReceiptFooter(event.target.value)}
                />
              </Field>
              <ToggleRow
                name="showAddress"
                label="Alamat ikut tercetak"
                checked={showAddress}
                disabled={!canWrite}
                onChange={setShowAddress}
              />
              <ToggleRow
                name="showPhone"
                label="Telepon ikut tercetak"
                checked={showPhone}
                disabled={!canWrite}
                onChange={setShowPhone}
              />
              <ToggleRow
                name="showLabor"
                label="Tampilkan jasa servis"
                checked={showLabor}
                disabled={!canWrite}
                onChange={setShowLabor}
              />
              <p className="-mt-1 text-sm leading-6 text-muted">
                Mati dulu. Struk ini untuk penjualan sparepart. Nyalakan kalau ongkos jasa ikut tercetak.
              </p>
              <div>
                <p className="text-xs font-semibold text-muted">Lebar kertas thermal</p>
                <input type="hidden" name="paper" value={paper} />
                <div className="mt-1 flex gap-2">
                  {paperChoices.map((choice) => (
                    <PaperChoice
                      key={choice.id}
                      value={choice.id}
                      note={choice.note}
                      current={paper}
                      disabled={!canWrite}
                      onChange={setPaper}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Printer struk di Indonesia biasanya roll 58 mm atau 80 mm. Bawaan 58 mm.
                </p>
              </div>
            </div>
          </div>

          {state?.message ? (
            <p className={cn("text-sm", state.ok ? "text-teal" : "text-danger")}>{state.message}</p>
          ) : null}
          {canWrite ? (
            <SaveButton pending={pending}>Simpan pengaturan</SaveButton>
          ) : (
            <p className="text-sm text-muted">Akun ini hanya bisa melihat.</p>
          )}
        </form>
      </GlassCard>

      <div className="grid gap-4">
        <DisplayModeCard />
        <GlassCard className="p-4">
          <SectionTitle icon={Receipt} tone="teal">
            Contoh struk
          </SectionTitle>
          <p className="mt-1 text-sm leading-6 text-muted">
            Angka di bawah hanya contoh, bukan transaksi sungguhan.
          </p>
          <div className="mt-4">
            <ReceiptPreview {...draft} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
