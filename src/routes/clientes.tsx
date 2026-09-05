import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { brl, useStore, type Cliente } from "@/lib/rp-store";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes e créditos — Restaurante Popular Cascavel" },
      {
        name: "description",
        content:
          "Consulte clientes por CPF ou nome, veja situação no CadÚnico e adicione créditos pré-pagos.",
      },
      { property: "og:title", content: "Clientes e créditos — Restaurante Popular Cascavel" },
      {
        property: "og:description",
        content: "Cadastro, saldo de créditos e histórico dos clientes do restaurante popular.",
      },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const { clientes, adicionarCredito } = useStore();
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Cliente | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [pag, setPag] = useState("");

  const lista = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cpf.replace(/\D/g, "").includes(busca.replace(/\D/g, "")),
  );
  const atual = sel ? (clientes.find((c) => c.cpf === sel.cpf) ?? sel) : null;
  const add = Number(valor.replace(",", ".")) || 0;

  const confirmar = () => {
    if (!atual || add <= 0 || !pag) return;
    adicionarCredito(atual.cpf, add, pag);
    toast.success(`${brl(add)} em crédito para ${atual.nome} — entrada registrada no caixa`);
    setAddOpen(false);
    setValor("");
    setPag("");
  };

  return (
    <AppShell title="Clientes">
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por CPF ou nome"
            className="w-full rounded-2xl border-2 border-input bg-card px-6 py-5 text-xl font-semibold outline-none focus:border-accent"
          />
          <div className="card-soft mt-5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                <tr>
                  {["CPF", "Nome", "CadÚnico", "Renda", "Crédito", "Último atendimento", "Status"].map(
                    (h) => (
                      <th key={h} className="px-5 py-4">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr
                    key={c.cpf}
                    onClick={() => {
                      setSel(c);
                      setAddOpen(false);
                    }}
                    className="cursor-pointer border-t border-border text-lg font-semibold hover:bg-secondary/60"
                  >
                    <td className="px-5 py-4">{c.cpf}</td>
                    <td className="px-5 py-4 font-extrabold">{c.nome}</td>
                    <td className="px-5 py-4">
                      {c.cadUnico === "ativo" ? "Ativo" : c.cadUnico === "inativo" ? "Inativo" : "Sem benefício"}
                    </td>
                    <td className="px-5 py-4">{brl(c.renda)}</td>
                    <td className="px-5 py-4 font-extrabold text-accent">{brl(c.credito)}</td>
                    <td className="px-5 py-4">{c.ultimoAtendimento ?? "—"}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          c.bloqueadoHoje
                            ? "bg-destructive/10 text-destructive"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {c.bloqueadoHoje ? "Já atendido hoje" : "Liberado"}
                      </span>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {atual && (
          <aside className="card-soft h-fit w-[380px] shrink-0 p-7">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-extrabold">{atual.nome}</h2>
              <button onClick={() => setSel(null)} className="rounded-full bg-muted p-2">
                <X className="size-4" />
              </button>
            </div>
            <dl className="mt-5 space-y-4">
              <Row k="CPF" v={atual.cpf} />
              <Row k="Renda" v={brl(atual.renda)} />
              <Row
                k="Situação CadÚnico"
                v={atual.cadUnico === "ativo" ? "Ativo" : atual.cadUnico === "inativo" ? "Inativo" : "Sem benefício"}
              />
              <Row k="Última consulta" v={atual.atualizacao} />
              <Row k="Crédito disponível" v={brl(atual.credito)} />
              <Row k="Refeições" v={String(atual.refeicoes)} />
              <Row k="Último atendimento" v={atual.ultimoAtendimento ?? "—"} />
            </dl>

            {!addOpen ? (
              <button
                onClick={() => setAddOpen(true)}
                className="mt-6 w-full rounded-2xl bg-primary py-5 text-lg font-extrabold uppercase text-primary-foreground"
              >
                Adicionar crédito
              </button>
            ) : (
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Saldo atual
                </p>
                <p className="text-3xl font-extrabold">{brl(atual.credito)}</p>
                <input
                  autoFocus
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  placeholder="Valor a adicionar"
                  inputMode="decimal"
                  className="mt-4 w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-2xl font-extrabold outline-none focus:border-accent"
                />
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {[1, 3, 5, 10, 20].map((v) => (
                    <button
                      key={v}
                      onClick={() => setValor(String(v))}
                      className="rounded-xl border-2 border-border py-3 text-sm font-extrabold hover:border-accent"
                    >
                      R$ {v}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Forma de pagamento
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {["Dinheiro", "PIX", "Cartão"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPag(p)}
                      className={`rounded-xl border-2 py-3 text-sm font-extrabold ${
                        pag === p ? "border-accent bg-accent text-accent-foreground" : "border-border"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-1 rounded-2xl bg-secondary p-4 text-sm font-semibold text-secondary-foreground">
                  <p>Crédito atual: {brl(atual.credito)}</p>
                  <p>Novo crédito: {brl(add)}</p>
                  <p className="text-base font-extrabold">Novo saldo: {brl(atual.credito + add)}</p>
                </div>
                <button
                  onClick={confirmar}
                  disabled={add <= 0 || !pag}
                  className="mt-4 w-full rounded-2xl bg-primary py-5 text-lg font-extrabold uppercase text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                >
                  Confirmar crédito
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm font-semibold text-muted-foreground">{k}</dt>
      <dd className="text-lg font-extrabold">{v}</dd>
    </div>
  );
}
