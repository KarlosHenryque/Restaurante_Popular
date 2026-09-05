import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { brl, hoje, useStore } from "@/lib/rp-store";

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

const filtros = ["Todos", "Refeições", "Créditos", "Entradas", "Saídas"] as const;

function CaixaPage() {
  const { caixa, movimentos, atendimentos, abrirCaixa, fecharCaixa, addMovimento, operador } =
    useStore();
  const [saldo, setSaldo] = useState("");
  const [filtro, setFiltro] = useState<(typeof filtros)[number]>("Todos");
  const [contado, setContado] = useState("");
  const [fechando, setFechando] = useState(false);
  const [movForm, setMovForm] = useState<"Entrada" | "Sangria" | null>(null);
  const [movValor, setMovValor] = useState("");

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

  const listaFiltrada = doDia.filter((m) =>
    filtro === "Todos"
      ? true
      : filtro === "Refeições"
        ? m.tipo === "Refeição"
        : filtro === "Créditos"
          ? m.tipo === "Crédito adicionado"
          : filtro === "Entradas"
            ? m.valor > 0
            : m.valor < 0,
  );

  const dinheiroEsperado = caixa.saldoInicial + resumo.dinheiro - saidas;
  const diferenca = (Number(contado.replace(",", ".")) || 0) - dinheiroEsperado;

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
            className="mt-8 w-full rounded-3xl border-4 border-input bg-card px-8 py-6 text-center text-5xl font-extrabold outline-none focus:border-accent"
          />
          <button
            onClick={() => {
              abrirCaixa(Number(saldo.replace(",", ".")) || 0);
              toast.success("Caixa aberto");
            }}
            className="mt-6 w-full rounded-3xl bg-primary py-7 text-2xl font-extrabold uppercase text-primary-foreground"
          >
            Abrir caixa
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Caixa">
      <div className="grid grid-cols-4 gap-5">
        <Card rot="Saldo inicial" val={brl(caixa.saldoInicial)} />
        <Card rot="Entradas" val={brl(entradas)} tone="success" />
        <Card rot="Saídas" val={brl(saidas)} tone="destructive" />
        <Card rot="Saldo esperado" val={brl(esperado)} tone="primary" />
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

      <div className="card-soft mt-6 p-7">
        <div className="flex flex-wrap items-center gap-3">
          {filtros.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-full px-5 py-2.5 text-sm font-extrabold uppercase ${
                filtro === f ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-auto flex gap-3">
            <button
              onClick={() => setMovForm("Entrada")}
              className="rounded-2xl bg-success px-6 py-3 text-sm font-extrabold uppercase text-success-foreground"
            >
              Entrada
            </button>
            <button
              onClick={() => setMovForm("Sangria")}
              className="rounded-2xl bg-warning px-6 py-3 text-sm font-extrabold uppercase text-warning-foreground"
            >
              Sangria / Saída
            </button>
            <button
              onClick={() => setFechando(true)}
              className="rounded-2xl bg-primary px-6 py-3 text-sm font-extrabold uppercase text-primary-foreground"
            >
              Fechar caixa
            </button>
          </div>
        </div>

        {movForm && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-muted p-5">
            <input
              autoFocus
              value={movValor}
              onChange={(e) => setMovValor(e.target.value)}
              placeholder={`Valor da ${movForm.toLowerCase()}`}
              inputMode="decimal"
              className="w-64 rounded-2xl border-2 border-input bg-card px-5 py-3 text-2xl font-extrabold outline-none focus:border-accent"
            />
            <button
              onClick={() => {
                const v = Number(movValor.replace(",", ".")) || 0;
                if (v <= 0) return;
                addMovimento({
                  tipo: movForm,
                  cliente: "—",
                  pagamento: "Dinheiro",
                  valor: movForm === "Sangria" ? -v : v,
                });
                toast.success(`${movForm} de ${brl(v)} registrada`);
                setMovValor("");
                setMovForm(null);
              }}
              className="rounded-2xl bg-primary px-8 py-3 font-extrabold uppercase text-primary-foreground"
            >
              Registrar
            </button>
            <button onClick={() => setMovForm(null)} className="px-4 font-bold text-muted-foreground">
              Cancelar
            </button>
          </div>
        )}

        <table className="mt-5 w-full text-left">
          <thead className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
            <tr>
              {["Hora", "Movimento", "Cliente", "Pagamento", "Valor"].map((h) => (
                <th key={h} className="py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listaFiltrada.map((m) => (
              <tr key={m.id} className="border-t border-border text-lg font-semibold">
                <td className="py-4">{m.hora}</td>
                <td className="py-4 font-extrabold">{m.tipo}</td>
                <td className="py-4">{m.cliente}</td>
                <td className="py-4">{m.pagamento}</td>
                <td
                  className={`py-4 font-extrabold ${
                    m.valor < 0 ? "text-destructive" : m.valor === 0 ? "text-muted-foreground" : "text-success"
                  }`}
                >
                  {m.valor === 0 ? "Crédito" : `${m.valor > 0 ? "+" : "-"} ${brl(Math.abs(m.valor))}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fechando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-6">
          <div className="card-soft w-[520px] p-8">
            <h2 className="text-2xl font-extrabold">Resumo do caixa</h2>
            <dl className="mt-5 space-y-3 text-lg font-semibold">
              <Linha k="Saldo inicial" v={brl(caixa.saldoInicial)} />
              <Linha k="Entradas" v={brl(entradas)} />
              <Linha k="Saídas" v={brl(saidas)} />
              <Linha k="Saldo esperado em dinheiro" v={brl(dinheiroEsperado)} />
            </dl>
            <input
              autoFocus
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              placeholder="Valor contado R$"
              inputMode="decimal"
              className="mt-5 w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-3xl font-extrabold outline-none focus:border-accent"
            />
            <p className="mt-3 text-lg font-extrabold">
              Diferença:{" "}
              <span className={diferenca === 0 ? "text-success" : "text-destructive"}>
                {brl(diferenca)}
              </span>
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setFechando(false)}
                className="flex-1 rounded-2xl bg-muted py-5 font-extrabold uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  fecharCaixa();
                  setFechando(false);
                  toast.success(`Caixa fechado por ${operador} — ${hoje()}`);
                }}
                className="flex-[2] rounded-2xl bg-primary py-5 font-extrabold uppercase text-primary-foreground"
              >
                Confirmar fechamento
              </button>
            </div>
          </div>
        </div>
      )}
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
      <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">{rot}</p>
      <p className={`mt-1 text-4xl font-extrabold ${c}`}>{val}</p>
    </div>
  );
}

function Mini({ rot, val }: { rot: string; val: string }) {
  return (
    <div className="rounded-2xl bg-muted p-4">
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
