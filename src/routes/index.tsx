import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Check,
  CircleAlert,
  CreditCard,
  Loader2,
  QrCode,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { brl, maskCpf, useStore, type Cliente } from "@/lib/rp-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atendimento — Restaurante Popular Cascavel" },
      {
        name: "description",
        content:
          "Consulte o CPF, valide o CadÚnico, defina o valor da refeição e finalize o atendimento em poucos segundos.",
      },
      { property: "og:title", content: "Atendimento — Restaurante Popular Cascavel" },
      {
        property: "og:description",
        content: "PDV de atendimento presencial dos Restaurantes Populares de Cascavel.",
      },
    ],
  }),
  component: Atendimento,
});

type Fase = "inicio" | "consultando" | "resultado";
type Etapa = 1 | 2 | 3 | 4;
type Pagamento = "Dinheiro" | "PIX" | "Crédito do cliente" | "";

function Atendimento() {
  const { config, buscarCliente, registrarAtendimento, operador } = useStore();
  const [cpf, setCpf] = useState("");
  const [fase, setFase] = useState<Fase>("inicio");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [semCpf, setSemCpf] = useState(false);
  const [semDados, setSemDados] = useState(false);
  const [offline, setOffline] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [valor, setValor] = useState(0);
  const [manual, setManual] = useState(false);
  const [pagamento, setPagamento] = useState<Pagamento>("");
  const [recebido, setRecebido] = useState("");
  const [trocoEmCredito, setTrocoEmCredito] = useState(false);
  const [ok, setOk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [fase]);

  const reset = () => {
    setCpf("");
    setFase("inicio");
    setCliente(null);
    setSemCpf(false);
    setSemDados(false);
    setOffline(false);
    setEtapa(1);
    setValor(0);
    setManual(false);
    setPagamento("");
    setRecebido("");
    setTrocoEmCredito(false);
  };

  const consultar = () => {
    if (cpf.replace(/\D/g, "").length !== 11) return;
    setFase("consultando");
    setTimeout(() => {
      const c = buscarCliente(cpf) ?? null;
      const semRede = !config.cadUnicoOnline || !!c?.somenteOffline;
      setCliente(c);
      setOffline(semRede);
      setSemDados(!c);
      setValor(c ? c.valorRegra : 0);
      setManual(false);
      setEtapa(1);
      setFase("resultado");
    }, 1100);
  };

  const atenderSemCpf = () => {
    setSemCpf(true);
    setCliente(null);
    setSemDados(true);
    setOffline(!config.cadUnicoOnline);
    setValor(7);
    setEtapa(1);
    setFase("resultado");
  };

  const bloqueado = !!cliente?.bloqueadoHoje;
  const credito = cliente?.credito ?? 0;
  const valorFixoDoAtendimento = semCpf || (!!cliente && cliente.valorRegra > 0);
  const valorPermitido = semCpf ? 7 : cliente?.valorRegra;
  const usaCredito = pagamento === "Crédito do cliente";
  const recebidoNum = Number(recebido.replace(",", ".")) || 0;
  const troco = Math.max(0, recebidoNum - valor);
  const podeFinalizar =
    !bloqueado &&
    valor > 0 &&
    pagamento !== "" &&
    (!usaCredito || credito >= valor) &&
    (pagamento !== "Dinheiro" || recebidoNum >= valor);

  const finalizar = () => {
    if (!podeFinalizar) return;
    registrarAtendimento({
      cpf: semCpf ? "—" : cpf,
      nome: cliente?.nome ?? "Atendimento sem CPF",
      unidade: config.unidade,
      operador,
      valor,
      valorRegra: cliente?.valorRegra ?? valor,
      alteracaoManual: manual,
      pagamento: pagamento || "Dinheiro",
      cadUnico: semDados
        ? offline
          ? "Offline / não validado"
          : "Não localizado"
        : cliente!.cadUnico === "ativo"
          ? "Ativo"
          : cliente!.cadUnico === "inativo"
            ? "Inativo"
            : "Sem benefício",
      creditoUsado: usaCredito ? valor : 0,
      creditoGerado: pagamento === "Dinheiro" && trocoEmCredito ? troco : 0,
      offline,
    });
    setOk(true);
    setTimeout(() => {
      setOk(false);
      reset();
    }, 1500);
  };

  return (
    <AppShell title="Atendimento">
      {ok && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-success/95 text-success-foreground">
          <div className="animate-in zoom-in text-center">
            <Check className="mx-auto size-28" strokeWidth={3} />
            <p className="mt-4 text-4xl font-extrabold">ATENDIMENTO FINALIZADO</p>
            <p className="mt-2 text-xl opacity-90">
              {brl(valor)} • {pagamento}
            </p>
          </div>
        </div>
      )}

      {fase === "inicio" && (
        <div className="mx-auto flex max-w-3xl flex-col items-center pt-12 text-center">
          <p className="rounded-full bg-secondary px-5 py-2 text-sm font-extrabold uppercase tracking-widest text-secondary-foreground">
            CPF do cliente
          </p>
          <input
            ref={inputRef}
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && consultar()}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="mt-6 w-full rounded-3xl border-4 border-input bg-card px-8 py-8 text-center text-[64px] font-black tracking-tight text-foreground outline-none transition-colors placeholder:text-muted-foreground/35 focus:border-primary"
          />
          <button
            onClick={consultar}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-3xl bg-primary py-8 text-3xl font-black uppercase tracking-wide text-primary-foreground shadow-soft transition-colors hover:bg-[#176A45] active:scale-[0.99]"
          >
            <Search className="size-8" /> Consultar CPF
          </button>
          <button
            onClick={atenderSemCpf}
            className="mt-5 text-base font-bold uppercase tracking-wide text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Atendimento sem CPF
          </button>
          <p className="mt-10 text-sm text-muted-foreground">
            Pressione <b>Enter</b> para consultar • CPFs de teste: 111.111.111-11 · 222.222.222-22 ·
            333.333.333-33 · 444.444.444-44 · 555.555.555-55
          </p>
        </div>
      )}

      {fase === "consultando" && (
        <div className="flex flex-col items-center pt-40 text-center">
          <Loader2 className="size-16 animate-spin text-accent" />
          <p className="mt-6 text-3xl font-extrabold">Consultando CadÚnico...</p>
          <p className="mt-2 text-lg text-muted-foreground">{cpf}</p>
        </div>
      )}

      {fase === "resultado" && (
        <div
          className={
            semCpf
              ? "mx-auto flex max-w-2xl flex-col items-stretch gap-6"
              : "grid grid-cols-[1.15fr_1fr] gap-6"
          }
        >
          <div className={semCpf ? "" : "col-span-2"}>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-foreground shadow-soft transition-colors hover:border-primary hover:bg-secondary"
            >
              <ArrowLeft className="size-5" strokeWidth={2.4} />
              Voltar
            </button>
          </div>

          {/* Cliente */}
          {!semCpf && (
            <div className="space-y-6">
              <div className="card-soft border-l-8 border-l-primary p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-4xl font-black uppercase tracking-tight">
                      {cliente?.nome ?? (semCpf ? "Atendimento sem CPF" : "Cliente não localizado")}
                    </h2>
                    <p className="mt-1 text-lg text-muted-foreground">CPF: {semCpf ? "—" : cpf}</p>
                  </div>
                </div>

                {!semDados && cliente && (
                  <div className="mt-7 grid grid-cols-2 gap-5 border-t border-border pt-6">
                    <Info
                      rot="Cadastro CadÚnico"
                      val={
                        cliente.cadUnico === "ativo"
                          ? "● ATIVO"
                          : cliente.cadUnico === "inativo"
                            ? "● INATIVO"
                            : "● SEM BENEFÍCIO"
                      }
                      tone={cliente.cadUnico === "ativo" ? "success" : "muted"}
                    />
                    <Info rot="Última atualização" val={cliente.atualizacao} />
                    <Info rot="Crédito disponível" val={brl(cliente.credito)} tone="accent" />
                  </div>
                )}

                {offline && (
                  <div className="mt-6 rounded-2xl bg-warning/25 p-5 text-warning-foreground">
                    <p className="font-extrabold">⚠ Sem conexão com o CadÚnico</p>
                    {cliente ? (
                      <p className="mt-1 text-sm">
                        Dados armazenados localmente • Última consulta: {cliente.atualizacao}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm">
                        Não foi possível validar o CadÚnico. Selecione o valor manualmente.
                      </p>
                    )}
                    <p className="mt-2 text-xs font-bold uppercase tracking-widest">
                      Atendimento será registrado em MODO OFFLINE
                    </p>
                  </div>
                )}

                {semDados && !offline && (
                  <div className="mt-6 rounded-2xl bg-secondary p-5 text-secondary-foreground">
                    <p className="font-bold">Sem cadastro localizado no CadÚnico.</p>
                    <p className="mt-1 text-sm">Selecione o valor da refeição manualmente.</p>
                  </div>
                )}
              </div>

              {/* Liberação */}
              <div
                className={`card-soft flex items-center gap-4 p-7 ${
                  bloqueado ? "bg-destructive/10" : "bg-success/10"
                }`}
              >
                {bloqueado ? (
                  <CircleAlert className="size-12 text-destructive" />
                ) : (
                  <ShieldCheck className="size-12 text-success" />
                )}
                <div>
                  <p
                    className={`text-2xl font-extrabold ${
                      bloqueado ? "text-destructive" : "text-success"
                    }`}
                  >
                    {bloqueado ? "REFEIÇÃO JÁ UTILIZADA HOJE" : "REFEIÇÃO LIBERADA"}
                  </p>
                  {bloqueado && (
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      Unidade: {cliente!.bloqueadoHoje!.unidade} • Horário:{" "}
                      {cliente!.bloqueadoHoje!.hora}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Valor + pagamento */}
          <div className="space-y-6">
            <div className="card-soft p-3">
              <div className="grid grid-cols-4 gap-2">
                {(["Valor", "Pagamento", "Recebimento", "Conferência"] as const).map(
                  (nome, index) => {
                    const passo = (index + 1) as Etapa;
                    return (
                      <button
                        key={nome}
                        onClick={() => passo <= etapa && setEtapa(passo)}
                        disabled={passo > etapa}
                        className={`rounded-xl border px-3 py-3 text-sm font-extrabold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                          etapa === passo
                            ? "border-accent bg-accent text-accent-foreground shadow-soft"
                            : passo < etapa
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-accent/30 bg-accent/10 text-accent"
                        }`}
                      >
                        {nome}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {etapa === 1 && (
              <div className="card-soft p-8 text-center">
                <p className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                  Valor da refeição
                </p>
                <p className="mt-2 text-[72px] font-black leading-none text-accent">{brl(valor)}</p>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  {manual
                    ? "Alteração manual autorizada"
                    : semDados
                      ? "Valor padrão sem validação"
                      : cliente?.cadUnico === "ativo"
                        ? "Cadastro CadÚnico válido"
                        : "Sem benefício no CadÚnico"}
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {config.valores.map((v) => {
                    const opcaoBloqueada = valorFixoDoAtendimento && v !== valorPermitido;
                    return (
                      <label
                        key={v}
                        aria-disabled={opcaoBloqueada}
                        className={`rounded-2xl border-2 py-5 text-2xl font-extrabold transition-colors ${
                          opcaoBloqueada
                            ? "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-60"
                            : "cursor-pointer"
                        } ${
                          valor === v
                            ? "border-accent bg-accent text-accent-foreground"
                            : opcaoBloqueada
                              ? ""
                              : "border-border bg-card hover:border-accent"
                        }`}
                      >
                        <input
                          type="radio"
                          name="valor-refeicao"
                          value={v}
                          checked={valor === v}
                          disabled={opcaoBloqueada}
                          onChange={() => {
                            if (opcaoBloqueada) return;
                            setValor(v);
                            setManual(v !== (cliente?.valorRegra ?? v));
                          }}
                          className="sr-only"
                        />
                        {brl(v)}
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={() => setEtapa(2)}
                  disabled={!valor || bloqueado}
                  className="mt-6 w-full rounded-2xl bg-primary py-5 text-xl font-extrabold uppercase text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  Continuar para pagamento
                </button>
              </div>
            )}

            {etapa === 2 && (
              <div className="card-soft p-7">
                <p className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                  Forma de pagamento
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(["Dinheiro", "PIX", "Crédito do cliente"] as const)
                    .filter((p) => !(semCpf && p === "Crédito do cliente"))
                    .map((p) => {
                      const bloq = p === "Crédito do cliente" && credito < valor;
                      const Icone = p === "Dinheiro" ? Banknote : p === "PIX" ? QrCode : CreditCard;
                      return (
                        <button
                          key={p}
                          disabled={bloq || bloqueado}
                          onClick={() => setPagamento(p)}
                          className={`flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-6 text-lg font-extrabold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                            pagamento === p
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border bg-card hover:border-primary"
                          }`}
                        >
                          <Icone className="size-8" strokeWidth={2.4} />
                          {p === "Crédito do cliente" ? "Usar crédito" : p}
                          {p === "Crédito do cliente" && (
                            <span className="block text-xs font-bold normal-case opacity-80">
                              Saldo {brl(credito)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>

                <button
                  onClick={() => setEtapa(3)}
                  disabled={!pagamento || bloqueado}
                  className="mt-5 w-full rounded-2xl bg-primary py-5 text-xl font-extrabold uppercase text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  Continuar para recebimento
                </button>
              </div>
            )}

            {etapa === 3 && (
              <div className="card-soft p-7">
                <p className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                  Recebimento
                </p>

                {usaCredito && (
                  <div className="mt-5 space-y-1 rounded-2xl bg-secondary p-5 text-sm font-semibold text-secondary-foreground">
                    <p>Valor refeição: {brl(valor)}</p>
                    <p>Crédito atual: {brl(credito)}</p>
                    <p className="text-base font-extrabold">
                      Saldo após atendimento: {brl(credito - valor)}
                    </p>
                  </div>
                )}

                {pagamento === "PIX" && (
                  <div className="mt-5 space-y-1 rounded-2xl bg-secondary p-5 text-sm font-semibold text-secondary-foreground">
                    <p>Valor refeição: {brl(valor)}</p>
                    <p className="text-base font-extrabold">Pagamento via PIX selecionado</p>
                  </div>
                )}

                {pagamento === "Dinheiro" && (
                  <div className="mt-5 rounded-2xl bg-muted p-5">
                    <label className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                      Valor recebido
                    </label>
                    <input
                      autoFocus
                      value={recebido}
                      onChange={(e) => setRecebido(e.target.value)}
                      placeholder="0,00"
                      inputMode="decimal"
                      className="mt-2 w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-3xl font-extrabold outline-none focus:border-primary"
                    />
                    <div className="mt-4 flex items-end justify-between text-sm font-semibold">
                      <span>Refeição {brl(valor)}</span>
                      <span>Recebido {brl(recebidoNum)}</span>
                      <span className="text-2xl font-extrabold text-primary">
                        Troco {brl(troco)}
                      </span>
                    </div>
                    {troco > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setTrocoEmCredito(false)}
                          className={`rounded-2xl border-2 py-4 text-sm font-extrabold uppercase ${
                            !trocoEmCredito
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border bg-card"
                          }`}
                        >
                          Dar troco
                        </button>
                        <button
                          onClick={() => setTrocoEmCredito(true)}
                          disabled={semCpf || !cliente}
                          className={`rounded-2xl border-2 py-4 text-sm font-extrabold uppercase disabled:opacity-40 ${
                            trocoEmCredito
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border bg-card"
                          }`}
                        >
                          Troco em crédito
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setEtapa(4)}
                  disabled={!podeFinalizar}
                  className="mt-5 w-full rounded-2xl bg-primary py-5 text-xl font-extrabold uppercase text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  Conferir atendimento
                </button>
              </div>
            )}

            {etapa === 4 && (
              <div className="card-soft p-7">
                <p className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                  Conferência
                </p>
                <div className="mt-4 space-y-3 rounded-2xl bg-secondary p-5 text-lg font-semibold text-secondary-foreground">
                  <p className="flex justify-between gap-4">
                    <span>Valor da refeição</span>
                    <b>{brl(valor)}</b>
                  </p>
                  <p className="flex justify-between gap-4">
                    <span>Pagamento</span>
                    <b>{pagamento === "Crédito do cliente" ? "Crédito do cliente" : pagamento}</b>
                  </p>
                  {pagamento === "Dinheiro" && (
                    <p className="flex justify-between gap-4">
                      <span>{trocoEmCredito ? "Crédito gerado" : "Troco"}</span>
                      <b>{brl(troco)}</b>
                    </p>
                  )}
                </div>
                <button
                  onClick={finalizar}
                  disabled={!podeFinalizar}
                  className="mt-5 w-full rounded-3xl bg-primary py-8 text-3xl font-extrabold uppercase tracking-wide text-primary-foreground shadow-soft transition-colors hover:bg-[#176A45] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                >
                  {bloqueado ? "Atendimento bloqueado" : `Finalizar atendimento`}
                </button>
              </div>
            )}
          </div>

          {semCpf && (
            <div className="rounded-2xl border-2 border-destructive bg-destructive/10 px-6 py-4 text-center text-destructive shadow-soft">
              <p className="text-xl font-black uppercase tracking-wide">Cadastro sem CPF</p>
              <p className="mt-1 text-sm font-bold">
                Atendimento de consumidor final com valor fixo de R$ 7,00.
              </p>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Info({
  rot,
  val,
  tone = "default",
}: {
  rot: string;
  val: string;
  tone?: "default" | "success" | "accent" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "accent"
        ? "text-accent"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{rot}</p>
      <p className={`text-2xl font-extrabold ${color}`}>{val}</p>
    </div>
  );
}
