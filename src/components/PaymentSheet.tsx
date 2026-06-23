import { useState } from "react";
import type { Receipt } from "../../shared/types";
import { TAX_RATE } from "../../shared/types";
import { api } from "../lib/api";
import { ProductImage } from "./ProductImage";

type Step = "form" | "processing" | "done";

/**
 * A self-contained pay flow: mock card entry → processing → itemised receipt.
 * It calls the real checkout endpoint, so stock and the fitting room update
 * for real. Used by both the phone bag and the in-room iPad.
 */
export function PaymentSheet({
  sessionId,
  amount,
  onClose,
  onPaid,
}: {
  sessionId: string;
  amount: number;
  onClose: () => void;
  onPaid?: (receipt: Receipt) => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const taxPreview = Math.round(amount * TAX_RATE * 100) / 100;
  const totalPreview = Math.round((amount + taxPreview) * 100) / 100;
  const digits = card.replace(/\D/g, "");
  const ready = digits.length >= 15 && exp.length === 5 && cvc.length >= 3;

  async function pay() {
    setStep("processing");
    setError(null);
    await new Promise((r) => setTimeout(r, 1300)); // mock authorisation
    try {
      const r = await api.checkout(sessionId);
      setReceipt(r);
      setStep("done");
      onPaid?.(r);
    } catch (e) {
      setError((e as Error).message);
      setStep("form");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={step === "done" ? onClose : undefined} />
      <div className="animate-pop relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 text-ink shadow-2xl sm:rounded-3xl">
        {step === "done" && receipt ? (
          <ReceiptView receipt={receipt} onClose={onClose} />
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Checkout</h3>
              {step === "form" && (
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink/50"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="mb-5 flex items-center justify-between rounded-xl bg-black/[0.04] px-4 py-3">
              <span className="text-sm text-ink/60">Total with tax</span>
              <span className="text-xl font-bold">${totalPreview.toFixed(2)}</span>
            </div>

            {step === "processing" ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/10 border-t-ink" />
                <p className="text-sm text-ink/60">Authorising your card…</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setCard("4242 4242 4242 4242");
                    setExp("12/28");
                    setCvc("123");
                    setName("Test Shopper");
                  }}
                  className="w-full rounded-lg border border-dashed border-black/20 py-2 text-xs font-medium text-ink/50 hover:text-ink"
                >
                  Use a test card
                </button>

                <Field label="Card number">
                  <input
                    value={card}
                    onChange={(e) => setCard(formatCard(e.target.value))}
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    className="w-full bg-transparent text-base outline-none"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry">
                    <input
                      value={exp}
                      onChange={(e) => setExp(formatExp(e.target.value))}
                      inputMode="numeric"
                      placeholder="MM/YY"
                      className="w-full bg-transparent text-base outline-none"
                    />
                  </Field>
                  <Field label="CVC">
                    <input
                      value={cvc}
                      onChange={(e) =>
                        setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      inputMode="numeric"
                      placeholder="123"
                      className="w-full bg-transparent text-base outline-none"
                    />
                  </Field>
                </div>
                <Field label="Name on card">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-transparent text-base outline-none"
                  />
                </Field>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <button
                  disabled={!ready}
                  onClick={pay}
                  className="mt-1 w-full rounded-xl bg-ink py-3.5 text-sm font-semibold text-white disabled:opacity-30"
                >
                  Pay ${totalPreview.toFixed(2)}
                </button>
                <p className="text-center text-[11px] text-ink/40">
                  Demo only — no real card is charged.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ReceiptView({
  receipt,
  onClose,
}: {
  receipt: Receipt;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex flex-col items-center text-center">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h3 className="text-lg font-semibold">Payment complete</h3>
        <p className="text-xs text-ink/50">Order {receipt.orderId}</p>
      </div>

      <div className="divide-y divide-black/5 rounded-xl border border-black/10">
        {receipt.items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 p-3">
            <div className="h-12 w-11 shrink-0 overflow-hidden rounded-lg bg-black/[0.05]">
              <ProductImage src={i.image} garment={i.garment} hex="#ccc" alt={i.name} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{i.name}</div>
              <div className="text-xs text-ink/50">
                {i.color} · {i.size}
              </div>
            </div>
            <div className="text-sm font-medium">${i.price.toFixed(2)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <Line label="Subtotal" value={receipt.subtotal} />
        <Line label="Tax" value={receipt.tax} />
        <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold">
          <span>Total</span>
          <span>${receipt.total.toFixed(2)}</span>
        </div>
      </div>

      <p className="mt-4 rounded-xl bg-black/[0.03] px-4 py-3 text-center text-xs text-ink/60">
        Your items are bagged and ready at the counter. Show order{" "}
        {receipt.orderId} on the way out.
      </p>

      <button
        onClick={onClose}
        className="mt-4 w-full rounded-xl bg-ink py-3.5 text-sm font-semibold text-white"
      >
        Done
      </button>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-ink/60">
      <span>{label}</span>
      <span>${value.toFixed(2)}</span>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-xl border border-black/15 px-3 py-2 focus-within:border-ink">
      <span className="block text-[11px] font-medium uppercase tracking-wide text-ink/40">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatCard(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExp(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
