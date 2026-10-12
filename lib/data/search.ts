"use server";

import { accessFor } from "@/lib/auth/access";
import { getSessionUser } from "@/lib/auth/session";
import { listCustomers, listOrders, listVehicles } from "@/lib/data/records";

export type SearchHit = {
  kind: "pelanggan" | "motor" | "spk";
  id: string;
  title: string;
  note: string;
  href: string;
};

const limit = 8;

function fold(value: string) {
  return value.toLowerCase().replace(/[\s-]+/g, "");
}

function includes(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export async function searchWorkshopAction(raw: string): Promise<SearchHit[]> {
  const user = await getSessionUser();
  const query = raw.trim();
  if (!user || query.length < 2) return [];

  const needle = query.toLowerCase();
  const plateNeedle = fold(query);
  const canCustomer = accessFor(user.role, "/pelanggan") !== "none";
  const canService = accessFor(user.role, "/service") !== "none";
  const hits: SearchHit[] = [];

  if (canCustomer) {
    const [customers, vehicles] = await Promise.all([listCustomers(), listVehicles()]);
    const names = new Map(customers.map((customer) => [customer.id, customer.name]));
    hits.push(
      ...customers
        .filter((customer) => includes(customer.name, needle))
        .slice(0, limit)
        .map((customer) => ({
          kind: "pelanggan" as const,
          id: customer.id,
          title: customer.name,
          note: customer.phone || "Tanpa telepon",
          href: `/pelanggan/data?id=${encodeURIComponent(customer.id)}`,
        })),
    );
    hits.push(
      ...vehicles
        .filter((vehicle) => fold(vehicle.plate).includes(plateNeedle))
        .slice(0, limit)
        .map((vehicle) => ({
          kind: "motor" as const,
          id: vehicle.id,
          title: vehicle.plate,
          note: `${names.get(vehicle.customerId) ?? "Pelanggan"} · ${vehicle.brand} ${vehicle.bikeType}`,
          href: `/pelanggan/motor?id=${encodeURIComponent(vehicle.id)}`,
        })),
    );
  }

  if (canService) {
    const orders = await listOrders();
    hits.push(
      ...orders
        .filter((order) => includes(order.no, needle))
        .slice(0, limit)
        .map((order) => ({
          kind: "spk" as const,
          id: order.id,
          title: order.no,
          note: `${order.customerName} · ${order.plate}`,
          href: `/service?id=${encodeURIComponent(order.id)}`,
        })),
    );
  }

  return hits;
}
