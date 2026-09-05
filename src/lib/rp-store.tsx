import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CadStatus = "ativo" | "inativo" | "sem";

export type Cliente = {
  cpf: string;
  nome: string;
  cadUnico: CadStatus;
  renda: number;
  atualizacao: string;
  credito: number;
  valorRegra: number;
  refeicoes: number;
  ultimoAtendimento: string | null;
  bloqueadoHoje?: { unidade: string; hora: string };
  somenteOffline?: boolean;
};

export type Atendimento = {
  id: string;
  data: string;
  hora: string;
  cpf: string;
  nome: string;
  unidade: string;
  operador: string;
  valor: number;
  valorRegra: number;
  alteracaoManual: boolean;
  pagamento: string;
  cadUnico: string;
  creditoUsado: number;
  creditoGerado: number;
  offline: boolean;
  status: string;
};

export type Movimento = {
  id: string;
  hora: string;
  data: string;
  tipo: "Refeição" | "Crédito adicionado" | "Entrada" | "Sangria";
  cliente: string;
  pagamento: string;
  valor: number;
};

export type Config = {
  restaurante: string;
  unidade: string;
  valores: [number, number, number];
  regras: { faixa1: number; faixa2: number };
  operadores: string[];
  cadUnicoOnline: boolean;
};

export type Caixa = {
  aberto: boolean;
  saldoInicial: number;
  abertoEm: string | null;
  operador: string | null;
};

type State = {
  clientes: Cliente[];
  atendimentos: Atendimento[];
  movimentos: Movimento[];
  caixa: Caixa;
  config: Config;
  operador: string;
};

export const hoje = () => new Date().toLocaleDateString("pt-BR");
export const agora = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const maskCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
};

const clientesIniciais: Cliente[] = [
  {
    cpf: "111.111.111-11",
    nome: "Maria da Silva",
    cadUnico: "ativo",
    renda: 900,
    atualizacao: "15/08/2026",
    credito: 10,
    valorRegra: 1,
    refeicoes: 42,
    ultimoAtendimento: "04/09/2026 11:10",
  },
  {
    cpf: "222.222.222-22",
    nome: "João Pereira",
    cadUnico: "ativo",
    renda: 1900,
    atualizacao: "02/07/2026",
    credito: 0,
    valorRegra: 3,
    refeicoes: 18,
    ultimoAtendimento: "03/09/2026 12:02",
  },
  {
    cpf: "333.333.333-33",
    nome: "Carlos Souza",
    cadUnico: "sem",
    renda: 4200,
    atualizacao: "—",
    credito: 0,
    valorRegra: 7,
    refeicoes: 6,
    ultimoAtendimento: "28/08/2026 11:44",
  },
  {
    cpf: "444.444.444-44",
    nome: "Ana Oliveira",
    cadUnico: "ativo",
    renda: 780,
    atualizacao: "21/08/2026",
    credito: 5,
    valorRegra: 1,
    refeicoes: 71,
    ultimoAtendimento: `${hoje()} 11:35`,
    bloqueadoHoje: { unidade: "Restaurante Popular Centro", hora: "11:35" },
  },
  {
    cpf: "555.555.555-55",
    nome: "Fernanda Lima",
    cadUnico: "ativo",
    renda: 1100,
    atualizacao: "03/09/2026",
    credito: 0,
    valorRegra: 3,
    refeicoes: 12,
    ultimoAtendimento: "01/09/2026 11:20",
    somenteOffline: true,
  },
];

const movimentosIniciais: Movimento[] = [
  { id: "m1", data: hoje(), hora: "11:02", tipo: "Refeição", cliente: "João Silva", pagamento: "Dinheiro", valor: 1 },
  { id: "m2", data: hoje(), hora: "11:04", tipo: "Refeição", cliente: "Maria Souza", pagamento: "Crédito", valor: 0 },
  { id: "m3", data: hoje(), hora: "11:10", tipo: "Crédito adicionado", cliente: "Carlos Lima", pagamento: "PIX", valor: 20 },
  { id: "m4", data: hoje(), hora: "11:28", tipo: "Refeição", cliente: "Rita Alves", pagamento: "Cartão", valor: 7 },
  { id: "m5", data: hoje(), hora: "12:15", tipo: "Sangria", cliente: "—", pagamento: "Dinheiro", valor: -200 },
];

const atendimentosIniciais: Atendimento[] = [
  {
    id: "a1", data: hoje(), hora: "11:02", cpf: "222.222.222-22", nome: "João Pereira",
    unidade: "Cascavel", operador: "Karlos Henryque", valor: 1, valorRegra: 1,
    alteracaoManual: false, pagamento: "Dinheiro", cadUnico: "Ativo", creditoUsado: 0,
    creditoGerado: 0, offline: false, status: "Concluído",
  },
  {
    id: "a2", data: hoje(), hora: "11:35", cpf: "444.444.444-44", nome: "Ana Oliveira",
    unidade: "Centro", operador: "Karlos Henryque", valor: 1, valorRegra: 1,
    alteracaoManual: false, pagamento: "Crédito", cadUnico: "Ativo", creditoUsado: 1,
    creditoGerado: 0, offline: false, status: "Concluído",
  },
  {
    id: "a3", data: "04/09/2026", hora: "12:20", cpf: "333.333.333-33", nome: "Carlos Souza",
    unidade: "Cascavel", operador: "Simone Reis", valor: 7, valorRegra: 7,
    alteracaoManual: false, pagamento: "PIX", cadUnico: "Sem benefício", creditoUsado: 0,
    creditoGerado: 0, offline: false, status: "Concluído",
  },
];

const initialState: State = {
  clientes: clientesIniciais,
  atendimentos: atendimentosIniciais,
  movimentos: movimentosIniciais,
  caixa: { aberto: true, saldoInicial: 200, abertoEm: "07:45", operador: "Karlos Henryque" },
  config: {
    restaurante: "Restaurante Popular",
    unidade: "Cascavel",
    valores: [1, 3, 7],
    regras: { faixa1: 1200, faixa2: 3000 },
    operadores: ["Karlos Henryque", "Simone Reis", "Paulo Andrade"],
    cadUnicoOnline: true,
  },
  operador: "Karlos Henryque",
};

const KEY = "rp-cascavel-v1";

type Ctx = State & {
  setState: React.Dispatch<React.SetStateAction<State>>;
  buscarCliente: (cpf: string) => Cliente | undefined;
  registrarAtendimento: (a: Omit<Atendimento, "id" | "data" | "hora" | "status">) => void;
  adicionarCredito: (cpf: string, valor: number, pagamento: string) => void;
  abrirCaixa: (saldo: number) => void;
  fecharCaixa: () => void;
  addMovimento: (m: Omit<Movimento, "id" | "data" | "hora">) => void;
  toggleCadUnico: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const buscarCliente = useCallback(
    (cpf: string) => state.clientes.find((c) => c.cpf === cpf),
    [state.clientes],
  );

  const addMovimento: Ctx["addMovimento"] = useCallback((m) => {
    setState((s) => ({
      ...s,
      movimentos: [
        { ...m, id: crypto.randomUUID(), data: hoje(), hora: agora() },
        ...s.movimentos,
      ],
    }));
  }, []);

  const registrarAtendimento: Ctx["registrarAtendimento"] = useCallback((a) => {
    setState((s) => {
      const at: Atendimento = { ...a, id: crypto.randomUUID(), data: hoje(), hora: agora(), status: "Concluído" };
      const mov: Movimento = {
        id: crypto.randomUUID(),
        data: at.data,
        hora: at.hora,
        tipo: "Refeição",
        cliente: at.nome,
        pagamento: at.pagamento,
        valor: at.pagamento === "Crédito do cliente" ? 0 : at.valor + at.creditoGerado,
      };
      return {
        ...s,
        atendimentos: [at, ...s.atendimentos],
        movimentos: [mov, ...s.movimentos],
        clientes: s.clientes.map((c) =>
          c.cpf === at.cpf
            ? {
                ...c,
                credito: c.credito - at.creditoUsado + at.creditoGerado,
                refeicoes: c.refeicoes + 1,
                ultimoAtendimento: `${at.data} ${at.hora}`,
                bloqueadoHoje: { unidade: s.config.unidade, hora: at.hora },
              }
            : c,
        ),
      };
    });
  }, []);

  const adicionarCredito: Ctx["adicionarCredito"] = useCallback((cpf, valor, pagamento) => {
    setState((s) => {
      const cli = s.clientes.find((c) => c.cpf === cpf);
      return {
        ...s,
        clientes: s.clientes.map((c) => (c.cpf === cpf ? { ...c, credito: c.credito + valor } : c)),
        movimentos: [
          {
            id: crypto.randomUUID(),
            data: hoje(),
            hora: agora(),
            tipo: "Crédito adicionado",
            cliente: cli?.nome ?? "—",
            pagamento,
            valor,
          },
          ...s.movimentos,
        ],
      };
    });
  }, []);

  const abrirCaixa = useCallback((saldo: number) => {
    setState((s) => ({
      ...s,
      caixa: { aberto: true, saldoInicial: saldo, abertoEm: agora(), operador: s.operador },
    }));
  }, []);

  const fecharCaixa = useCallback(() => {
    setState((s) => ({ ...s, caixa: { ...s.caixa, aberto: false } }));
  }, []);

  const toggleCadUnico = useCallback(() => {
    setState((s) => ({ ...s, config: { ...s.config, cadUnicoOnline: !s.config.cadUnicoOnline } }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setState,
      buscarCliente,
      registrarAtendimento,
      adicionarCredito,
      abrirCaixa,
      fecharCaixa,
      addMovimento,
      toggleCadUnico,
    }),
    [state, buscarCliente, registrarAtendimento, adicionarCredito, abrirCaixa, fecharCaixa, addMovimento, toggleCadUnico],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}
