import { PaymentDesk } from "@/components/workshop/payment-desk";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { guard } from "@/lib/auth/guard";
import { isBusinessDay, jakartaDate, monthKeyOf } from "@/lib/data/format";
import { cashSnapshot, listCustomers, previewMonth } from "@/lib/data/records";

export const metadata = { title: "Catat pembayaran" };

export default async function CatatPembayaranPage({
  searchParams,
}: {
  searchParams: Promise<{ hari?: string }>;
}) {
  const { canWrite } = await guard("/pembayaran/catat");
  const params = await searchParams;
  const day = params.hari && isBusinessDay(params.hari) ? params.hari : jakartaDate();
  const [{ payments }, customers, month] = await Promise.all([
    cashSnapshot(day),
    listCustomers(),
    previewMonth(monthKeyOf(day)),
  ]);

  return (
    <div>
      <PageHeader
        title="Catat pembayaran"
        description="Catat tiap pelanggan: tempat uang dan jumlah yang dibayar."
        href="/pembayaran/catat"
      />
      <form action="/pembayaran/catat" className="mt-5 flex max-w-md gap-2">
        <input type="date" name="hari" defaultValue={day} className={inputClass} />
        <button className={buttonClass}>Lihat</button>
      </form>
      <PaymentDesk
        key={day}
        day={day}
        customers={customers}
        payments={payments}
        canWrite={canWrite}
        monthClosed={month.closed}
      />
    </div>
  );
}
