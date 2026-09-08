import "server-only";
import type { AccountRecord } from "@/lib/services/accounts";
import { formatShortDate } from "@/lib/utils";

/** Fila de cuenta ya serializada para el panel de superadmin. */
export interface AdminAccount {
  id: string;
  email: string;
  name: string | null;
  eventQuota: number;
  isSuperAdmin: boolean;
  createdAtLabel: string;
  /** Eventos sin archivar: son los que consumen cupo. */
  activeEvents: number;
  totalEvents: number;
}

export function toAdminAccount(account: AccountRecord): AdminAccount {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    eventQuota: account.eventQuota,
    isSuperAdmin: account.isSuperAdmin,
    createdAtLabel: formatShortDate(account.createdAt),
    activeEvents: account.activeEvents,
    totalEvents: account._count.events,
  };
}
