import React, { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type Api } from "./auth";
import { loadPages } from "./loadPages";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  FormError,
  Icon,
  Modal,
  PageHeading,
  SearchField,
  showToast,
} from "./ui";

type Invitation = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};
type Member = {
  user_id: string;
  email: string | null;
  role: "owner" | "staff";
  created_at: string;
};
type StaffRow = {
  id: string;
  email: string | null;
  created_at: string;
  expires_at: string | null;
  status: string;
  action: "remove" | "revoke" | null;
};

export function Invitations({ api, schoolId }: { api: Api; schoolId: string }) {
  const path = `/schools/${schoolId}/invitations`;
  const [page, setPage] = useState(1);
  const [data, setData] = useState<StaffRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<StaffRow | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [members, invitations] = await Promise.all([
        api(`/schools/${schoolId}/members`),
        loadPages(api, path),
      ]);
      if (
        !Array.isArray(members) ||
        members.some(
          (m) =>
            !m?.user_id ||
            !["owner", "staff"].includes(m.role) ||
            (m.email !== null && typeof m.email !== "string") ||
            typeof m.created_at !== "string",
        )
      )
        throw Error("Respons staff tidak valid.");
      if (
        invitations.some(
          (row) =>
            typeof row.email !== "string" ||
            typeof row.created_at !== "string" ||
            typeof row.expires_at !== "string",
        )
      )
        throw Error("Respons aktivasi staff tidak valid.");
      // shortcut: endpoint members dibatasi 1000 akun, pindah ke pagination server saat kontrak BE mendukungnya.
      setData([
        ...members
          .filter((m: Member) => m.role === "staff")
          .map(
            (m: Member): StaffRow => ({
              id: m.user_id,
              email: m.email,
              created_at: m.created_at,
              expires_at: null,
              status: "Aktif",
              action: "remove",
            }),
          ),
        ...(invitations as Invitation[])
          .filter((row) => !row.accepted_at)
          .map(
            (row): StaffRow => ({
              id: row.id,
              email: row.email,
              created_at: row.created_at,
              expires_at: row.expires_at,
              status: row.revoked_at
                ? "Dibatalkan"
                : Date.parse(row.expires_at) <= Date.now()
                  ? "Kedaluwarsa"
                  : "Menunggu konfirmasi",
              action:
                !row.revoked_at && Date.parse(row.expires_at) > Date.now()
                  ? "revoke"
                  : null,
            }),
          ),
      ]);
      setPage(1);
    } catch (e) {
      setData(null);
      setLoadError(e instanceof Error ? e.message : "Gagal memuat staff.");
    } finally {
      setLoading(false);
    }
  }, [api, path, schoolId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function action(kind: "create" | "revoke" | "remove", id?: string) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      if (kind === "remove") {
        await api(`/schools/${schoolId}/members/${id}`, "DELETE");
        showToast("Akses staff dihapus.");
      }
      if (kind === "revoke") {
        await api(`${path}/${id}`, "DELETE");
        showToast("Penambahan staff dibatalkan.");
      }
      if (kind === "create") {
        await api(path, "POST", { email: email.trim() });
        setCreating(false);
        setEmail("");
        showToast(
          "Permintaan penambahan staff diterima. Minta staff memeriksa email.",
        );
      }
      setConfirm(null);
      await load();
    } catch (e) {
      const text =
        e instanceof ApiError && e.code === "account_already_registered"
          ? "Email sudah terdaftar. Penambahan staff dengan akun lama belum didukung."
          : e instanceof ApiError &&
              e.code === "invitation_delivery_not_configured"
            ? "Pengiriman email aktivasi belum dikonfigurasi. Hubungi pengelola layanan."
            : e instanceof ApiError && e.code === "invitation_delivery_failed"
              ? "Pengiriman belum dapat dipastikan. Periksa daftar dan batalkan proses yang masih menunggu sebelum membuat ulang."
              : e instanceof Error
                ? e.message
                : "Permintaan gagal. Silakan coba lagi.";
      if (
        kind !== "create" ||
        (e instanceof ApiError && e.code === "invitation_delivery_failed")
      )
        await load();
      setConfirm(null);
      setError(text);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  const filtered = (data || []).filter((row) =>
    (row.email || "").toLowerCase().includes(query.trim().toLowerCase()),
  );
  const total = filtered.length;
  const rows = filtered.slice((page - 1) * 10, page * 10);
  const date = (value: string) =>
    new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  const createButton = (
    <Button
      variant="primary"
      icon="plus"
      onClick={() => {
        setError("");
        setCreating(true);
      }}
    >
      Tambah staff
    </Button>
  );
  return (
    <>
      <PageHeading
        label="Staff"
        description="Tambah staff dan kelola akses sekolah."
        actions={createButton}
      />
      {error && !creating && (
        <div role="alert" className="instructor-action-error">
          {error}
        </div>
      )}
      <section className="panel instructor-panel invitation-panel">
        <div className="instructor-toolbar">
          <SearchField
            id="staffSearch"
            placeholder="Cari email staff..."
            ariaLabel="Cari staff"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
          />
        </div>

        {loading ? (
          <div role="status">
            <span className="sr-only">Memuat staff...</span>
            <div
              className="instructor-table-scroll loading-skeleton"
              aria-hidden="true"
            >
              <table className="instructor-table">
                <tbody>
                  {Array.from({ length: 5 }, (_, row) => (
                    <tr key={row}>
                      {Array.from({ length: 5 }, (_, col) => (
                        <td key={col}>
                          <span className="skeleton-bar" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : loadError ? (
          <div role="alert" className="instructor-load-error">
            <strong>{loadError}</strong>
            <Button sm onClick={load}>
              Coba lagi
            </Button>
          </div>
        ) : data && !total ? (
          <EmptyState
            icon="users"
            title={query.trim() ? "Staff tidak ditemukan" : "Belum ada staff"}
            description={
              query.trim()
                ? "Coba kata pencarian lain."
                : "Tambahkan staff untuk membantu mengelola sekolah."
            }
            action={!query.trim() && createButton}
          />
        ) : (
          data && (
            <div className="instructor-table-scroll">
              <table className="instructor-table">
                <thead>
                  <tr>
                    {[
                      "Email",
                      "Dibuat",
                      "Berlaku hingga",
                      "Status",
                      "Aksi",
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.action}-${row.id}`}>
                      <td data-label="Email">
                        <strong>{row.email || "Email tidak tersedia"}</strong>
                      </td>
                      <td data-label="Dibuat">{date(row.created_at)}</td>
                      <td data-label="Berlaku hingga">
                        {row.expires_at ? date(row.expires_at) : "\u2014"}
                      </td>
                      <td data-label="Status">
                        <Badge status={row.status} />
                      </td>
                      <td data-label="Aksi">
                        {row.action && (
                          <Button
                            sm
                            variant="danger"
                            aria-label={`${row.action === "remove" ? "Hapus staff" : "Batalkan penambahan"} ${row.email}`}
                            disabled={busy}
                            onClick={() => setConfirm(row)}
                          >
                            {row.action === "remove"
                              ? "Hapus staff"
                              : "Batalkan"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {data && !loading && (
          <div className="instructor-footer">
            <span>
              Menampilkan {total ? (page - 1) * 10 + 1 : 0}–
              {Math.min(page * 10, total)} dari {total} staff
            </span>
            <div className="instructor-pages">
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={busy || page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <Icon name="chevron-left" extra="sm" />
              </button>
              <span aria-current="page">{page}</span>
              <button
                type="button"
                aria-label="Halaman berikutnya"
                disabled={busy || page * 10 >= total}
                onClick={() => setPage(page + 1)}
              >
                <Icon name="chevron-right" extra="sm" />
              </button>
            </div>
          </div>
        )}
      </section>
      {creating && (
        <Modal
          title="Tambah staff"
          desc="Kirim email aktivasi untuk menambahkan staff baru."
          onClose={() => {
            if (!busy) setCreating(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action("create");
            }}
          >
            <div className="modal-content">
              <div className="form-field">
                <label htmlFor="invitation-email">Email staff</label>
                <input
                  id="invitation-email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                />
                <small className="hint">
                  Hanya email yang belum memiliki akun. Permintaan berhasil
                  belum menjamin email diterima.
                </small>
              </div>
              <FormError message={error} />
            </div>
            <div className="modal-foot">
              <Button disabled={busy} onClick={() => setCreating(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Menyimpan..." : "Tambah staff"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <ConfirmDialog
          title={
            confirm.action === "remove"
              ? "Hapus akses staff?"
              : "Batalkan penambahan staff?"
          }
          desc={confirm.email || "Email tidak tersedia"}
          body={
            confirm.action === "remove"
              ? "Staff tidak lagi dapat mengakses sekolah. Akun dan data operasional tetap tersimpan."
              : "Tautan aktivasi ini tidak lagi dapat digunakan untuk mengakses sekolah."
          }
          confirmLabel={
            confirm.action === "remove" ? "Hapus staff" : "Batalkan penambahan"
          }
          confirmAction={
            confirm.action === "remove" ? "remove-staff" : "revoke-staff"
          }
          busy={busy}
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
          onConfirm={() => action(confirm.action!, confirm.id)}
        />
      )}
    </>
  );
}
