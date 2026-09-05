import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { agora, brl, hoje, useStore } from "@/lib/rp-store";

export const Route = createFileRoute("/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa do dia — Restaurante Popular Cascavel" },
      {
        name: "description",
        content:
          "Abertura, movimentações, sangrias e fechamento do caixa do restaurante popular de Cascavel.",
      },
      { property: "og:title", content: "Caixa do dia — Restaurante Popular Cascavel" },
      {
        property: "og:description",
        content: "Controle simples de entradas, saídas e conferência de caixa.",
      },
    ],
  }),
  component: CaixaPage,
});

function CaixaPage() {
  const { caixa, movimentos, atendimentos, abrirCaixa, fecharCaixa, addMovimento, operador } =
    useStore();
  const [saldo, setSaldo] = useState("");
  const [contado, setContado] = useState("");
  const [fechando, setFechando] = useState(false);
  const [movForm, setMovForm] = useState<"Entrada" | "Saída" | null>(null);
  const [movValor, setMovValor] = useState("");
  const [movObs, setMovObs] = useState("");

  const doDia = movimentos.filter((m) => m.data === hoje());
  const entradas = doDia.filter((m) => m.valor > 0).reduce((s, m) => s + m.valor, 0);
  const saidas = doDia.filter((m) => m.valor < 0).reduce((s, m) => s - m.valor, 0);
  const esperado = caixa.saldoInicial + entradas - saidas;

  const resumo = useMemo(() => {
    const atsHoje = atendimentos.filter((a) => a.data === hoje());
    const porPag = (p: string) =>
      doDia.filter((m) => m.pagamento === p && m.valor > 0).reduce((s, m) => s + m.valor, 0);
    return {
      total: atsHoje.length,
      v1: atsHoje.filter((a) => a.valor === 1).length,
      v3: atsHoje.filter((a) => a.valor === 3).length,
      v7: atsHoje.filter((a) => a.valor === 7).length,
      dinheiro: porPag("Dinheiro"),
      pix: porPag("PIX"),
      cartao: porPag("Cartão"),
      credVendido: doDia
        .filter((m) => m.tipo === "Crédito adicionado")
        .reduce((s, m) => s + m.valor, 0),
      credUsado: atsHoje.reduce((s, a) => s + a.creditoUsado, 0),
    };
  }, [atendimentos, doDia]);

  const dinheiroEsperado = caixa.saldoInicial + resumo.dinheiro - saidas;
  const diferenca = (Number(contado.replace(",", ".")) || 0) - dinheiroEsperado;
  const contadoNum = Number(contado.replace(",", ".")) || 0;

  if (!caixa.aberto) {
    return (
      <AppShell title="Caixa">
        <div className="mx-auto max-w-xl pt-20 text-center">
          <p className="text-4xl font-extrabold text-destructive">CAIXA FECHADO</p>
          <p className="mt-2 text-muted-foreground">Informe o saldo inicial para começar o dia.</p>
          <input
            autoFocus
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
            placeholder="Saldo inicial R$"
            inputMode="decimal"
            className="mt-8 w-full rounded-3xl border-4 border-input bg-card px-8 py-6 text-center text-5xl font-extrabold outline-none focus:border-primary"
          />
          <button
            onClick={() => {
              abrirCaixa(Number(saldo.replace(",", ".")) || 0);
              toast.success("Caixa aberto");
            }}
            className="mt-6 w-full rounded-3xl bg-primary py-7 text-2xl font-extrabold uppercase text-primary-foreground transition-colors hover:bg-[#176A45]"
          >
            Abrir caixa
          </button>
        </div>
      </AppShell>
    );
  }

  if (fechando) {
    return (
      <AppShell title="Fechamento do caixa">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="screen-only flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => setFechando(false)}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-foreground shadow-soft transition-colors hover:border-primary hover:bg-secondary"
            >
              <ArrowLeft className="size-5" strokeWidth={2.4} />
              Cancelar
            </button>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-accent-foreground shadow-soft"
              >
                <Printer className="size-5" />
                Imprimir
              </button>
              <button
                onClick={() => {
                  fecharCaixa();
                  setFechando(false);
                  toast.success(`Caixa fechado por ${operador} — ${hoje()}`);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-soft"
              >
                <Check className="size-5" />
                Confirmar
              </button>
            </div>
          </div>

          <section className="print-sheet card-soft overflow-hidden p-0">
            <div className="border-b border-border bg-primary px-8 py-6 text-white">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest opacity-75">
                    Restaurante Popular
                  </p>
                  <h2 className="mt-1 text-3xl font-black uppercase">
                    Extrato de fechamento do caixa
                  </h2>
                  <p className="mt-2 text-sm font-semibold opacity-80">
                    Data {hoje()} • Operador {operador} • Emissão {agora()}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 px-5 py-3 text-right">
                  <p className="text-xs font-extrabold uppercase tracking-widest opacity-75">
                    Status
                  </p>
                  <p className="text-xl font-black">
                    {diferenca === 0 ? "Conferido" : "Com diferença"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid gap-4 md:grid-cols-4">
                <Mini rot="Saldo inicial" val={brl(caixa.saldoInicial)} />
                <Mini rot="Entradas" val={brl(entradas)} />
                <Mini rot="Saídas" val={brl(saidas)} />
                <Mini rot="Dinheiro esperado" val={brl(dinheiroEsperado)} />
              </div>

              <div className="mt-6 grid gap-5 rounded-2xl border border-border bg-muted p-5 md:grid-cols-2">
                <div className="rounded-2xl border-2 border-input bg-card p-4">
                  <label className="screen-only text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                    Valor contado no malote
                  </label>
                  <input
                    autoFocus
                    value={contado}
                    onChange={(e) => setContado(e.target.value)}
                    placeholder="Valor contado R$"
                    inputMode="decimal"
                    className="screen-only mt-1 h-[52px] w-full rounded-xl border-0 bg-transparent p-0 text-3xl font-black outline-none placeholder:text-muted-foreground/50"
                  />
                  <div className="hidden print:block">
                    <Linha k="Valor contado no malote" v={brl(contadoNum)} />
                  </div>
                </div>
                <div
                  className={`rounded-2xl border-2 bg-card p-4 ${
                    diferenca === 0
                      ? "border-success text-success"
                      : "border-destructive text-destructive"
                  }`}
                >
                  <p className="text-xs font-extrabold uppercase tracking-widest opacity-70">
                    Diferença
                  </p>
                  <p className="mt-1 flex h-[52px] items-center text-3xl font-black">
                    {brl(diferenca)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Mini rot="Refeições" val={String(resumo.total)} />
                <Mini rot="PIX" val={brl(resumo.pix)} />
                <Mini rot="Créditos vendidos" val={brl(resumo.credVendido)} />
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-border">
                <div className="grid grid-cols-[90px_1fr_150px] bg-muted px-5 py-3 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  <span>Hora</span>
                  <span>Descrição</span>
                  <span className="text-right">Valor</span>
                </div>
                <div className="divide-y divide-border bg-card">
                  {doDia.map((m) => (
                    <div
                      key={m.id}
                      className="grid grid-cols-[90px_1fr_150px] items-center px-5 py-3 text-sm"
                    >
                      <span className="font-bold text-muted-foreground">{m.hora}</span>
                      <div>
                        <p className="font-black text-foreground">{m.tipo}</p>
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                          {m.pagamento}
                          {m.observacao ? ` • ${m.observacao}` : ""}
                        </p>
                      </div>
                      <span
                        className={`text-right text-lg font-black ${
                          m.valor < 0
                            ? "text-destructive"
                            : m.valor === 0
                              ? "text-muted-foreground"
                              : "text-success"
                        }`}
                      >
                        {m.valor === 0
                          ? "Crédito"
                          : `${m.valor > 0 ? "+" : "-"} ${brl(Math.abs(m.valor))}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-8 text-center text-sm font-bold print:grid-cols-2">
                <div className="border-t border-foreground pt-2">Operador do caixa</div>
                <div className="border-t border-foreground pt-2">Responsável pelo malote</div>
              </div>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Caixa" hideSidebar={!!movForm}>
      <div className="card-soft border-l-8 border-l-primary p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              Conferência do caixa
            </p>
            <h2 className="mt-1 text-4xl font-black uppercase">Resumo do dia</h2>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              Operador {operador} • Caixa aberto às {caixa.abertoEm ?? "—"}
            </p>
          </div>
          <div className="grid min-w-[320px] grid-cols-2 gap-3">
            <button
              onClick={() => setMovForm("Entrada")}
              className="rounded-2xl bg-accent px-5 py-4 text-sm font-extrabold uppercase text-accent-foreground transition-colors hover:bg-[#D95F2B]"
            >
              Entrada
            </button>
            <button
              onClick={() => setMovForm("Saída")}
              className="rounded-2xl bg-warning px-5 py-4 text-sm font-extrabold uppercase text-warning-foreground"
            >
              Saída
            </button>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-4 gap-5">
          <Card rot="Saldo inicial" val={brl(caixa.saldoInicial)} />
          <Card rot="Entradas" val={brl(entradas)} tone="success" />
          <Card rot="Saídas" val={brl(saidas)} tone="destructive" />
          <Card rot="Saldo esperado" val={brl(esperado)} tone="primary" />
        </div>

        <button
          onClick={() => setFechando(true)}
          className="mt-6 w-full rounded-2xl bg-primary px-6 py-6 text-xl font-extrabold uppercase text-primary-foreground transition-colors hover:bg-[#176A45]"
        >
          Fechamento de caixa
        </button>

        {movForm && (
          <div className="mt-5 grid gap-3 rounded-2xl bg-muted p-5 lg:grid-cols-[220px_1fr_auto_auto]">
            <input
              autoFocus
              value={movValor}
              onChange={(e) => setMovValor(e.target.value)}
              placeholder={`Valor da ${movForm.toLowerCase()}`}
              inputMode="decimal"
              className="rounded-2xl border-2 border-input bg-card px-5 py-3 text-2xl font-extrabold outline-none focus:border-primary"
            />
            <input
              value={movObs}
              onChange={(e) => setMovObs(e.target.value)}
              placeholder="Motivo da movimentação"
              className="rounded-2xl border-2 border-input bg-card px-5 py-3 text-lg font-bold outline-none focus:border-primary"
            />
            <button
              onClick={() => {
                const v = Number(movValor.replace(",", ".")) || 0;
                if (v <= 0 || !movObs.trim()) return;
                addMovimento({
                  tipo: movForm === "Saída" ? "Sangria" : "Entrada",
                  cliente: "—",
                  pagamento: "Dinheiro",
                  valor: movForm === "Saída" ? -v : v,
                  observacao: movObs.trim(),
                });
                toast.success(`${movForm} de ${brl(v)} registrada`);
                setMovValor("");
                setMovObs("");
                setMovForm(null);
              }}
              disabled={Number(movValor.replace(",", ".")) <= 0 || !movObs.trim()}
              className="rounded-2xl bg-primary px-8 py-3 font-extrabold uppercase text-primary-foreground transition-colors hover:bg-[#176A45] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              Registrar
            </button>
            <button
              onClick={() => {
                setMovForm(null);
                setMovValor("");
                setMovObs("");
              }}
              className="px-4 font-bold text-muted-foreground"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-5">
        <div className="card-soft p-7">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Resumo do dia
          </p>
          <p className="mt-1 text-4xl font-extrabold">{resumo.total} refeições vendidas</p>
          <div className="mt-5 grid grid-cols-3 gap-4">
            <Mini rot="R$ 1" val={`${resumo.v1} refeições`} />
            <Mini rot="R$ 3" val={`${resumo.v3} refeições`} />
            <Mini rot="R$ 7" val={`${resumo.v7} refeições`} />
          </div>
        </div>
        <div className="card-soft p-7">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            Formas de pagamento
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Mini rot="Dinheiro" val={brl(resumo.dinheiro)} />
            <Mini rot="PIX" val={brl(resumo.pix)} />
            <Mini rot="Cartão" val={brl(resumo.cartao)} />
            <Mini rot="Créditos vendidos" val={brl(resumo.credVendido)} />
            <Mini rot="Créditos utilizados" val={brl(resumo.credUsado)} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ rot, val, tone = "default" }: { rot: string; val: string; tone?: string }) {
  const c =
    tone === "success"
      ? "text-success"
      : tone === "destructive"
        ? "text-destructive"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="card-soft p-6">
      <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {rot}
      </p>
      <p className={`mt-1 text-4xl font-extrabold ${c}`}>{val}</p>
    </div>
  );
}

function Mini({ rot, val }: { rot: string; val: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{rot}</p>
      <p className="text-xl font-extrabold">{val}</p>
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-extrabold">{v}</dd>
    </div>
  );
}
