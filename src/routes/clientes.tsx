import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Cake,
  Check,
  CircleAlert,
  CreditCard,
  DollarSign,
  IdCard,
  Loader2,
  Pencil,
  Save,
  ShieldCheck,
  X,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  brl,
  hoje,
  maskCpf,
  maskData,
  useStore,
  type CadStatus,
  type Cliente,
} from "@/lib/rp-store";

type ResultadoCadUnico = {
  situacao: CadStatus;
  renda: number;
  atualizacao: string;
  validacao: string;
};

const consultarCadUnicoPorCpf = (cpf: string): ResultadoCadUnico => {
  const cpfLimpo = cpf.replace(/\D/g, "");
  const soma = cpfLimpo.split("").reduce((acc, digito) => acc + Number(digito), 0);

  if (cpfLimpo.endsWith("00")) {
    return {
      situacao: "sem",
      renda: 0,
      atualizacao: "—",
      validacao: "Cliente não encontrado no CadÚnico. Atendimento deve seguir sem benefício.",
    };
  }

  if (soma % 5 === 0) {
    return {
      situacao: "inativo",
      renda: 2600,
      atualizacao: "18/05/2026",
      validacao: "Cadastro localizado, mas inativo. Cliente cadastrado sem benefício ativo.",
    };
  }

  const renda = soma % 2 === 0 ? 980 : 1850;
  return {
    situacao: "ativo",
    renda,
    atualizacao: hoje(),
    validacao:
      renda <= 1200
        ? "Benefício validado para tarifa social."
        : "Benefício validado para tarifa intermediária.",
  };
};

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
  const { clientes, adicionarCredito, setState } = useStore();
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<Cliente | null>(null);
  const [telaCliente, setTelaCliente] = useState<"dados" | "credito">("dados");
  const [etapaCredito, setEtapaCredito] = useState<1 | 2 | 3>(1);
  const [valor, setValor] = useState("");
  const [pag, setPag] = useState("");
  const [telaCadastro, setTelaCadastro] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCpf, setNovoCpf] = useState("");
  const [novoNascimento, setNovoNascimento] = useState("");
  const [novoCadUnico, setNovoCadUnico] = useState<CadStatus | null>(null);
  const [statusCadastro, setStatusCadastro] = useState<"form" | "consultando" | "cadunico">("form");
  const [novaRenda, setNovaRenda] = useState("");
  const [resultadoCadUnico, setResultadoCadUnico] = useState<ResultadoCadUnico | null>(null);
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [editNome, setEditNome] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editNascimento, setEditNascimento] = useState("");

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
    setSel(null);
    setTelaCliente("dados");
    setEtapaCredito(1);
    setValor("");
    setPag("");
  };

  const limparCadastro = () => {
    setTelaCadastro(false);
    setNovoNome("");
    setNovoCpf("");
    setNovoNascimento("");
    setNovoCadUnico(null);
    setStatusCadastro("form");
    setNovaRenda("");
    setResultadoCadUnico(null);
  };

  const concluirCadastro = (consulta = resultadoCadUnico) => {
    const rendaMensal = consulta ? consulta.renda : Number(novaRenda.replace(",", ".")) || 0;
    const cadUnicoFinal = consulta?.situacao ?? novoCadUnico ?? "inativo";
    const valorRegra =
      cadUnicoFinal === "ativo" ? (rendaMensal <= 1200 ? 1 : rendaMensal <= 3000 ? 3 : 7) : 7;

    const novoCliente: Cliente = {
      cpf: maskCpf(novoCpf),
      nome: novoNome.trim(),
      dataNascimento: novoNascimento.trim(),
      cadUnico: cadUnicoFinal,
      renda: rendaMensal,
      atualizacao: consulta?.atualizacao ?? (cadUnicoFinal === "ativo" ? hoje() : "—"),
      credito: 0,
      valorRegra,
      refeicoes: 0,
      ultimoAtendimento: null,
    };

    setState((s) => ({ ...s, clientes: [novoCliente, ...s.clientes] }));
    setSel(null);
    setTelaCliente("dados");
    limparCadastro();
    toast.success("Cadastro criado com sucesso.");
  };

  const salvarCadastro = () => {
    const cpfLimpo = novoCpf.replace(/\D/g, "");
    if (!novoNome.trim() || cpfLimpo.length !== 11 || !novoNascimento.trim()) return;
    if (clientes.some((c) => c.cpf.replace(/\D/g, "") === cpfLimpo)) {
      toast.error("CPF já cadastrado.");
      return;
    }

    if (!novoCadUnico) {
      toast.error("Selecione se o cliente possui CadÚnico.");
      return;
    }

    if (novoCadUnico === "ativo") {
      setStatusCadastro("consultando");
      setTimeout(() => {
        setResultadoCadUnico(consultarCadUnicoPorCpf(novoCpf));
        setStatusCadastro("cadunico");
      }, 1300);
      return;
    }

    concluirCadastro();
  };

  const iniciarEdicao = (cliente: Cliente) => {
    setEditNome(cliente.nome);
    setEditCpf(cliente.cpf);
    setEditNascimento(cliente.dataNascimento);
    setEditandoCliente(true);
  };

  const cancelarEdicao = () => {
    setEditandoCliente(false);
    setEditNome("");
    setEditCpf("");
    setEditNascimento("");
  };

  const salvarEdicao = () => {
    if (!atual) return;
    const cpfLimpo = editCpf.replace(/\D/g, "");
    if (!editNome.trim() || cpfLimpo.length !== 11 || !editNascimento.trim()) return;
    if (clientes.some((c) => c.cpf !== atual.cpf && c.cpf.replace(/\D/g, "") === cpfLimpo)) {
      toast.error("CPF já cadastrado.");
      return;
    }

    const clienteAtualizado: Cliente = {
      ...atual,
      nome: editNome.trim(),
      cpf: maskCpf(editCpf),
      dataNascimento: editNascimento.trim(),
    };

    setState((s) => ({
      ...s,
      clientes: s.clientes.map((c) => (c.cpf === atual.cpf ? clienteAtualizado : c)),
    }));
    setSel(clienteAtualizado);
    cancelarEdicao();
    toast.success("Cadastro atualizado com sucesso.");
  };
  if (telaCadastro) {
    const cadastroValido =
      novoNome.trim() &&
      novoCpf.replace(/\D/g, "").length === 11 &&
      novoNascimento.trim() &&
      novoCadUnico;
    const situacaoCadUnico =
      resultadoCadUnico?.situacao === "ativo"
        ? "Ativo"
        : resultadoCadUnico?.situacao === "inativo"
          ? "Inativo"
          : "Não encontrado";
    const cadUnicoAtivo = resultadoCadUnico?.situacao === "ativo";
    const cadUnicoInativo = resultadoCadUnico?.situacao === "inativo";
    const valorRegraConsulta =
      resultadoCadUnico?.situacao === "ativo"
        ? resultadoCadUnico.renda <= 1200
          ? 1
          : resultadoCadUnico.renda <= 3000
            ? 3
            : 7
        : 7;
    const painelCadUnico = cadUnicoAtivo
      ? "border-success bg-secondary text-secondary-foreground"
      : cadUnicoInativo
        ? "border-accent bg-[#FCE8DD] text-[#D95F2B]"
        : "border-destructive bg-destructive/10 text-destructive";

    return (
      <AppShell title="Novo cadastro">
        <div className="mx-auto max-w-2xl space-y-6">
          <button
            onClick={limparCadastro}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-foreground shadow-soft transition-colors hover:border-primary hover:bg-secondary"
          >
            <ArrowLeft className="size-5" strokeWidth={2.4} />
            Voltar
          </button>

          <div className="card-soft p-8">
            <p className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
              Cadastro do cliente
            </p>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-tight">Novo cadastro</h2>

            {statusCadastro === "form" && (
              <>
                <div className="mt-7 grid gap-4">
                  <input
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Nome"
                    className="w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-xl font-extrabold outline-none focus:border-primary"
                  />
                  <input
                    value={novoCpf}
                    onChange={(e) => setNovoCpf(maskCpf(e.target.value))}
                    placeholder="CPF"
                    inputMode="numeric"
                    className="w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-xl font-extrabold outline-none focus:border-primary"
                  />
                  <input
                    value={novoNascimento}
                    onChange={(e) => setNovoNascimento(maskData(e.target.value))}
                    placeholder="Data de nascimento"
                    className="w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-xl font-extrabold outline-none focus:border-primary"
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNovoCadUnico("ativo")}
                    className={`rounded-2xl border-2 px-4 py-5 text-base font-extrabold uppercase transition-colors ${novoCadUnico === "ativo" ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border bg-card text-foreground hover:border-primary hover:bg-secondary"}`}
                  >
                    Tem CadÚnico
                    <span className="block text-xs font-bold normal-case opacity-80">
                      Consultar após salvar
                    </span>
                  </button>
                  <button
                    onClick={() => setNovoCadUnico("inativo")}
                    className={`rounded-2xl border-2 px-4 py-5 text-base font-extrabold uppercase transition-colors ${novoCadUnico === "inativo" ? "border-accent bg-[#FCE8DD] text-[#D95F2B] shadow-soft" : "border-border bg-card text-foreground hover:border-accent hover:bg-[#FCE8DD]"}`}
                  >
                    Sem CadÚnico
                    <span className="block text-xs font-bold normal-case opacity-80">
                      Salvar sem consulta
                    </span>
                  </button>
                </div>

                <button
                  onClick={salvarCadastro}
                  disabled={!cadastroValido}
                  className="mt-6 w-full rounded-2xl bg-primary py-5 text-lg font-extrabold uppercase text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
                >
                  Salvar cadastro
                </button>
              </>
            )}

            {statusCadastro === "consultando" && (
              <div className="mt-8 flex flex-col items-center rounded-2xl bg-secondary p-8 text-center text-secondary-foreground">
                <Loader2 className="size-14 animate-spin text-primary" />
                <p className="mt-5 text-2xl font-black uppercase">Consultando CadÚnico</p>
                <p className="mt-1 text-lg font-bold text-muted-foreground">
                  CPF: {maskCpf(novoCpf)}
                </p>
              </div>
            )}

            {statusCadastro === "cadunico" && resultadoCadUnico && (
              <div className="mt-7">
                <div className={`rounded-2xl border-2 p-6 ${painelCadUnico}`}>
                  <div className="flex items-start gap-4">
                    {cadUnicoAtivo ? (
                      <ShieldCheck className="size-12 shrink-0 text-success" strokeWidth={2.5} />
                    ) : cadUnicoInativo ? (
                      <CircleAlert className="size-12 shrink-0 text-accent" strokeWidth={2.5} />
                    ) : (
                      <CircleAlert
                        className="size-12 shrink-0 text-destructive"
                        strokeWidth={2.5}
                      />
                    )}
                    <div>
                      <p className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                        Consulta do CadÚnico
                      </p>
                      <h3 className="mt-1 text-3xl font-black uppercase">
                        Situação: {situacaoCadUnico}
                      </h3>
                      <p className="mt-2 text-base font-semibold text-current/75">
                        CPF consultado automaticamente: {maskCpf(novoCpf)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <InfoCard
                    icon={ShieldCheck}
                    rot="Situação"
                    val={situacaoCadUnico}
                    destaque={cadUnicoAtivo}
                  />
                  <InfoCard
                    icon={DollarSign}
                    rot="Renda"
                    val={brl(resultadoCadUnico.renda)}
                    destaque
                  />
                  <InfoCard
                    icon={CreditCard}
                    rot="Valor da refeição"
                    val={brl(valorRegraConsulta)}
                    destaque
                  />
                  <InfoCard
                    icon={Cake}
                    rot="Última atualização"
                    val={resultadoCadUnico.atualizacao}
                  />
                  <InfoCard icon={Check} rot="Validação" val={resultadoCadUnico.validacao} />
                </div>

                <button
                  onClick={() => concluirCadastro(resultadoCadUnico)}
                  className="mt-6 w-full rounded-2xl bg-primary py-5 text-lg font-extrabold uppercase text-primary-foreground"
                >
                  Continuar atendimento
                </button>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    );
  }
  if (atual && telaCliente === "credito") {
    return (
      <AppShell title="Adicionar crédito">
        <div className="mx-auto max-w-2xl space-y-6">
          <button
            onClick={() => {
              setTelaCliente("dados");
              setEtapaCredito(1);
              setValor("");
              setPag("");
            }}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-foreground shadow-soft transition-colors hover:border-primary hover:bg-secondary"
          >
            <ArrowLeft className="size-5" strokeWidth={2.4} />
            Voltar aos dados
          </button>

          <div className="card-soft p-3">
            <div className="grid grid-cols-3 gap-2">
              {(["Valor", "Pagamento", "Conferência"] as const).map((nome, index) => {
                const passo = (index + 1) as 1 | 2 | 3;
                return (
                  <button
                    key={nome}
                    onClick={() => passo <= etapaCredito && setEtapaCredito(passo)}
                    disabled={passo > etapaCredito}
                    className={`rounded-xl border px-3 py-3 text-sm font-extrabold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      etapaCredito === passo
                        ? "border-accent bg-accent text-accent-foreground shadow-soft"
                        : passo < etapaCredito
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-accent/30 bg-accent/10 text-accent"
                    }`}
                  >
                    {nome}
                  </button>
                );
              })}
            </div>
          </div>

          {etapaCredito === 1 && (
            <div className="card-soft p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Saldo atual
              </p>
              <p className="text-4xl font-black text-accent">{brl(atual.credito)}</p>
              <input
                autoFocus
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Valor a adicionar"
                inputMode="decimal"
                className="mt-5 w-full rounded-2xl border-2 border-input bg-card px-5 py-4 text-2xl font-extrabold outline-none focus:border-primary"
              />
              <button
                onClick={() => setEtapaCredito(2)}
                disabled={add <= 0}
                className="mt-5 w-full rounded-2xl bg-primary py-5 text-lg font-extrabold uppercase text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
              >
                Continuar para pagamento
              </button>
            </div>
          )}

          {etapaCredito === 2 && (
            <div className="card-soft p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Forma de pagamento
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {["Dinheiro", "PIX"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPag(p)}
                    className={`rounded-2xl border-2 py-6 text-lg font-extrabold uppercase ${
                      pag === p
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-card hover:border-accent"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setEtapaCredito(3)}
                disabled={!pag}
                className="mt-5 w-full rounded-2xl bg-primary py-5 text-lg font-extrabold uppercase text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
              >
                Conferir crédito
              </button>
            </div>
          )}

          {etapaCredito === 3 && (
            <div className="card-soft p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Conferência
              </p>
              <div className="mt-5 space-y-3 rounded-2xl bg-secondary p-5 text-lg font-semibold text-secondary-foreground">
                <p className="flex justify-between gap-4">
                  <span>Cliente</span>
                  <b>{atual.nome}</b>
                </p>
                <p className="flex justify-between gap-4">
                  <span>Crédito atual</span>
                  <b>{brl(atual.credito)}</b>
                </p>
                <p className="flex justify-between gap-4">
                  <span>Crédito adicionado</span>
                  <b>{brl(add)}</b>
                </p>
                <p className="flex justify-between gap-4">
                  <span>Pagamento</span>
                  <b>{pag}</b>
                </p>
                <p className="flex justify-between gap-4">
                  <span>Novo saldo</span>
                  <b>{brl(atual.credito + add)}</b>
                </p>
              </div>
              <button
                onClick={confirmar}
                disabled={add <= 0 || !pag}
                className="mt-5 w-full rounded-2xl bg-primary py-5 text-lg font-extrabold uppercase text-primary-foreground disabled:bg-muted disabled:text-muted-foreground"
              >
                Confirmar crédito
              </button>
            </div>
          )}
        </div>
      </AppShell>
    );
  }
  if (atual) {
    const cadUnicoTexto =
      atual.cadUnico === "ativo"
        ? "Ativo"
        : atual.cadUnico === "inativo"
          ? "Inativo"
          : "Sem benefício";

    return (
      <AppShell title="Clientes">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => {
                setSel(null);
                setTelaCliente("dados");
                setValor("");
                setPag("");
                cancelarEdicao();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-foreground shadow-soft transition-colors hover:border-primary hover:bg-secondary"
            >
              <ArrowLeft className="size-5" strokeWidth={2.4} />
              Voltar
            </button>

            {!editandoCliente ? (
              <button
                onClick={() => iniciarEdicao(atual)}
                className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-accent-foreground shadow-soft"
              >
                <Pencil className="size-5" strokeWidth={2.4} />
                Editar
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={cancelarEdicao}
                  className="inline-flex items-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-foreground shadow-soft transition-colors hover:border-primary hover:bg-secondary"
                >
                  <X className="size-5" strokeWidth={2.4} />
                  Cancelar
                </button>
                <button
                  onClick={salvarEdicao}
                  disabled={
                    !editNome.trim() ||
                    editCpf.replace(/\D/g, "").length !== 11 ||
                    !editNascimento.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-soft disabled:bg-muted disabled:text-muted-foreground"
                >
                  <Save className="size-5" strokeWidth={2.4} />
                  Salvar
                </button>
              </div>
            )}
          </div>

          <div className="card-soft border-l-8 border-l-primary p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                  Dados do cliente
                </p>
                {editandoCliente ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      placeholder="Nome"
                      className="rounded-2xl border-2 border-input bg-card px-5 py-4 text-xl font-extrabold outline-none focus:border-primary md:col-span-3"
                    />
                    <input
                      value={editCpf}
                      onChange={(e) => setEditCpf(maskCpf(e.target.value))}
                      placeholder="CPF"
                      inputMode="numeric"
                      className="rounded-2xl border-2 border-input bg-card px-5 py-4 text-xl font-extrabold outline-none focus:border-primary"
                    />
                    <input
                      value={editNascimento}
                      onChange={(e) => setEditNascimento(maskData(e.target.value))}
                      placeholder="Data de nascimento"
                      inputMode="numeric"
                      className="rounded-2xl border-2 border-input bg-card px-5 py-4 text-xl font-extrabold outline-none focus:border-primary"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="mt-2 text-4xl font-black uppercase tracking-tight">
                      {atual.nome}
                    </h2>
                    <p className="mt-1 text-lg font-bold text-muted-foreground">CPF: {atual.cpf}</p>
                  </>
                )}
              </div>
              <span
                className={`rounded-full px-5 py-2 text-sm font-extrabold uppercase ${
                  editandoCliente
                    ? "pointer-events-none bg-muted text-muted-foreground opacity-60"
                    : atual.bloqueadoHoje
                      ? "bg-destructive/10 text-destructive"
                      : "bg-success/10 text-success"
                }`}
              >
                {atual.bloqueadoHoje ? "Já atendido hoje" : "Liberado"}
              </span>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <InfoCard icon={IdCard} rot="CPF" val={atual.cpf} />
              <InfoCard icon={Cake} rot="Nascimento" val={atual.dataNascimento} />
              <InfoCard
                icon={ShieldCheck}
                rot="CadÚnico"
                val={cadUnicoTexto}
                disabled={editandoCliente}
              />
              <InfoCard
                icon={DollarSign}
                rot="Renda"
                val={brl(atual.renda)}
                disabled={editandoCliente}
              />
              <InfoCard
                icon={CreditCard}
                rot="Crédito"
                val={brl(atual.credito)}
                destaque
                disabled={editandoCliente}
              />
              <InfoCard
                icon={ShieldCheck}
                rot="Valor regra"
                val={brl(atual.valorRegra)}
                disabled={editandoCliente}
              />
              <InfoCard
                icon={IdCard}
                rot="Refeições"
                val={String(atual.refeicoes)}
                disabled={editandoCliente}
              />
              <InfoCard
                icon={Cake}
                rot="Último atendimento"
                val={atual.ultimoAtendimento ?? "—"}
                disabled={editandoCliente}
              />
            </div>
          </div>

          {telaCliente === "dados" && (
            <button
              onClick={() => {
                setTelaCliente("credito");
                setEtapaCredito(1);
              }}
              disabled={editandoCliente}
              className="w-full rounded-2xl bg-primary py-5 text-lg font-extrabold uppercase text-primary-foreground shadow-soft disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              Adicionar crédito
            </button>
          )}
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell title="Clientes">
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex gap-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por CPF ou nome"
              className="min-w-0 flex-1 rounded-2xl border-2 border-input bg-card px-6 py-5 text-xl font-semibold outline-none focus:border-primary"
            />
            <button
              onClick={() => setTelaCadastro(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-5 text-base font-extrabold uppercase text-primary-foreground shadow-soft"
            >
              <UserPlus className="size-5" />
              Novo cadastro
            </button>
          </div>
          <div className="card-soft mt-5 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                <tr>
                  {["Nome", "CPF", "CadÚnico", "Crédito", "Status"].map((h) => (
                    <th key={h} className="px-5 py-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr
                    key={c.cpf}
                    onClick={() => {
                      setSel(c);
                      setTelaCliente("dados");
                      setEtapaCredito(1);
                    }}
                    className="cursor-pointer border-t border-border text-lg font-semibold hover:bg-secondary/60"
                  >
                    <td className="px-5 py-4 font-extrabold">{c.nome}</td>
                    <td className="px-5 py-4">{c.cpf}</td>
                    <td className="px-5 py-4">
                      {c.cadUnico === "ativo"
                        ? "Ativo"
                        : c.cadUnico === "inativo"
                          ? "Inativo"
                          : "Sem benefício"}
                    </td>
                    <td className="px-5 py-4 font-extrabold text-accent">{brl(c.credito)}</td>
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
                    <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                      Nenhum cliente encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InfoCard({
  icon: Icon,
  rot,
  val,
  destaque = false,
  disabled = false,
}: {
  icon: typeof IdCard;
  rot: string;
  val: string;
  destaque?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      aria-disabled={disabled}
      className={`rounded-2xl border px-5 py-4 shadow-sm ${
        disabled
          ? "pointer-events-none border-border bg-muted text-muted-foreground opacity-65"
          : "border-border bg-card"
      }`}
    >
      <Icon
        className={`size-6 ${
          disabled ? "text-muted-foreground" : destaque ? "text-accent" : "text-primary"
        }`}
        strokeWidth={2.3}
      />
      <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {rot}
      </p>
      <p
        className={`mt-1 text-xl font-black ${
          disabled ? "text-muted-foreground" : destaque ? "text-accent" : "text-foreground"
        }`}
      >
        {val}
      </p>
    </div>
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
