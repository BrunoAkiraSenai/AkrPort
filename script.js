import {
  db, auth, provider,
  signInWithPopup, signOut, onAuthStateChanged,
  collection, addDoc, getDoc, getDocs, setDoc,
  onSnapshot, deleteDoc, doc, updateDoc, query, where, orderBy, writeBatch,
  runTransaction, serverTimestamp, Timestamp, limit, startAfter
} from "./firebase.js";

const $ = id => document.getElementById(id);
const COL = {
  lancamentos: "lancamentos",
  distribuicoes: "distribuicoes",
  config: "config"
};
const CONFIG_ID = "tabelaIR";
const PAGE_SIZE = 200;

const Store = {
  _estado: {
    usuario: null,
    lancamentos: [],
    distribuicoes: [],
    tabelaIR: [],
    importando: false,
    filtroMesLanc: "",
    filtroMesDist: "",
    _lancPronto: false,
    _distPronto: false,
  },
  _listeners: {},
  on(ev, fn) {
    (this._listeners[ev] = this._listeners[ev] || []).push(fn);
    return () => { this._listeners[ev] = this._listeners[ev].filter(f => f !== fn); };
  },
  _emit(ev, ...args) {
    (this._listeners[ev] || []).forEach(fn => fn(...args));
  },
  get(k) { return this._estado[k]; },
  set(k, v) {
    this._estado[k] = v;
    this._emit(k, v);
    this._emit("*", k, v);
  },
  get lancamentos() { return this._estado.lancamentos; },
  set lancamentos(v) { this.set("lancamentos", v); },
  get distribuicoes() { return this._estado.distribuicoes; },
  set distribuicoes(v) { this.set("distribuicoes", v); },
  get tabelaIR() { return this._estado.tabelaIR; },
  set tabelaIR(v) { this.set("tabelaIR", v); },
  get usuario() { return this._estado.usuario; },
  set usuario(v) { this.set("usuario", v); },
  get importando() { return this._estado.importando; },
  set importando(v) { this.set("importando", v); },
  get filtroMesLanc() { return this._estado.filtroMesLanc; },
  set filtroMesLanc(v) { this.set("filtroMesLanc", v); },
  get filtroMesDist() { return this._estado.filtroMesDist; },
  set filtroMesDist(v) { this.set("filtroMesDist", v); },
  get _lancPronto() { return this._estado._lancPronto; },
  set _lancPronto(v) { this.set("_lancPronto", v); },
  get _distPronto() { return this._estado._distPronto; },
  set _distPronto(v) { this.set("_distPronto", v); },
};

let unsubscribeLancamentos = null;
let unsubscribeDistribuicoes = null;

const TabelaIRPadrao = [
  { ate: 2428.80, aliquota: 0,    deducao: 0 },
  { ate: 2826.65, aliquota: 7.5,  deducao: 182.16 },
  { ate: 3751.05, aliquota: 15,   deducao: 394.16 },
  { ate: 4664.68, aliquota: 22.5, deducao: 675.49 },
  { acima: true,  aliquota: 27.5, deducao: 908.73 }
];

const Util = {
  moeda(v) {
    const n = Number(v);
    return isNaN(n) ? "R$ 0,00" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  },
  data(d) { return d ? d.split("-").reverse().join("/") : "-"; },
  notificar(msg, tipo = "sucesso") {
    const el = $("msgSalvo");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    el.style.color = tipo === "erro" ? "#ef4444" : "#22c55e";
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.style.display = "none"; }, 3000);
  },
  async capturarErro(fn, msgPadrao) {
    try {
      return await fn();
    } catch (e) {
      Util.notificar(`${msgPadrao}: ${e.message}`, "erro");
      return null;
    }
  },
  validarStep(input) {
    input.addEventListener("blur", () => {
      let val = input.value.replace(",", ".");
      const partes = val.split(".");
      if (partes.length > 1 && partes[1].length > 2) {
        val = partes[0] + "." + partes[1].slice(0, 2);
        input.value = val;
      }
    });
    input.addEventListener("input", () => {
      input.value = input.value.replace(",", ".");
    });
  },
  parseValor(str) {
    if (!str) return 0;
    if (typeof str === "number") return str;
    let s = str.trim();
    if (s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    }
    return parseFloat(s) || 0;
  },
  configurarInputValor(input) {
    input.addEventListener("beforeinput", function(e) {
      if (e.data === ",") {
        e.preventDefault();
        const start = this.selectionStart;
        const end = this.selectionEnd;
        this.value = this.value.substring(0, start) + "," + this.value.substring(end);
        this.setSelectionRange(start + 1, start + 1);
      }
    });
    input.addEventListener("blur", function() {
      let val = this.value.replace(/[^\d,]/g, "");
      val = val.replace(",", ".");
      const partes = val.split(".");
      if (partes.length > 1 && partes[1].length > 2) {
        val = partes[0] + "." + partes[1].slice(0, 2);
      }
      this.value = val;
    });
  }
};

// =========================
// AUTENTICAÇÃO
// =========================

function mostrarLogin() { $("app").style.display = "none"; $("telaLogin").style.display = "flex"; }
function mostrarApp() { $("telaLogin").style.display = "none"; $("app").style.display = "block"; }

$("btnLoginGoogle").onclick = () => {
  Util.capturarErro(() => signInWithPopup(auth, provider), "Erro ao fazer login");
};

$("btnLogout").onclick = () => {
  Util.capturarErro(() => signOut(auth), "Erro ao sair");
};

onAuthStateChanged(auth, user => {
  if (user) {
    Store.usuario = user;
    mostrarApp();
    $("userEmail").textContent = user.email;
    carregarTabelaIR();
    iniciarSincronizacao();
  } else {
    Store.usuario = null;
    Store.lancamentos = [];
    Store.distribuicoes = [];
    pararSincronizacao();
    mostrarLogin();
  }
});

// =========================
// FIRESTORE: Tabela IR
// =========================

async function carregarTabelaIR() {
  try {
    const q = query(collection(db, COL.config), where("id", "==", CONFIG_ID));
    const docSnap = await getDocs(q);
    let encontrou = false;
    docSnap.forEach(d => {
      Store.tabelaIR = d.data().faixas || [];
      encontrou = true;
    });
    if (!encontrou) {
      Store.tabelaIR = JSON.parse(JSON.stringify(TabelaIRPadrao));
      await addDoc(collection(db, COL.config), { id: CONFIG_ID, faixas: Store.tabelaIR });
    }
  } catch {
    Store.tabelaIR = JSON.parse(JSON.stringify(TabelaIRPadrao));
  }
}

async function salvarTabelaIRFirestore() {
  await Util.capturarErro(async () => {
    const q = query(collection(db, COL.config), where("id", "==", CONFIG_ID));
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, COL.config), { id: CONFIG_ID, faixas: Store.tabelaIR });
    } else {
      await updateDoc(doc(db, COL.config, snap.docs[0].id), { faixas: Store.tabelaIR });
    }
  }, "Erro ao salvar tabela de IR");
}

// =========================
// FIRESTORE: Sincronização
// =========================

function pararSincronizacao() {
  if (unsubscribeLancamentos) { unsubscribeLancamentos(); unsubscribeLancamentos = null; }
  if (unsubscribeDistribuicoes) { unsubscribeDistribuicoes(); unsubscribeDistribuicoes = null; }
}

function criarListener(colecao, campoEstado, flagPronto, onDados) {
  let tentativas = 0;
  const maxTentativas = 5;

  function conectar() {
    const ref = collection(db, colecao);
    const q = query(ref, orderBy("ordem", "asc"), limit(PAGE_SIZE));

    const unsub = onSnapshot(q, snapshot => {
      tentativas = 0;
      const dados = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        dados.push({ id: doc.id, ...data, id: doc.id });
      });
      Store[campoEstado] = dados;
      Store[flagPronto] = true;
      if (onDados) onDados();
      if (!Store.importando && Store._lancPronto && Store._distPronto) renderizarTudo();
    }, erro => {
      tentativas++;
      Util.notificar(`Erro no ${colecao} (tentativa ${tentativas}/${maxTentativas}): ${erro.message}`, "erro");
      unsub();
      if (tentativas < maxTentativas) {
        const atraso = Math.min(1000 * Math.pow(2, tentativas), 30000);
        setTimeout(conectar, atraso);
      }
    });
    return unsub;
  }

  return conectar();
}

function iniciarSincronizacao() {
  pararSincronizacao();

  Store._lancPronto = false;
  Store._distPronto = false;

  unsubscribeLancamentos = criarListener(COL.lancamentos, "lancamentos", "_lancPronto");
  unsubscribeDistribuicoes = criarListener(COL.distribuicoes, "distribuicoes", "_distPronto");
}

// =========================
// CRUD: Lançamentos
// =========================

async function salvarLancamento(dados) {
  const ref = doc(collection(db, COL.lancamentos));
  await runTransaction(db, async tx => {
    tx.set(ref, {
      ...dados,
      userId: Store.usuario.uid,
      createdAt: serverTimestamp(),
      ordem: Date.now() + Math.random()
    });
  });
  return ref;
}

async function atualizarLancamento(id, dados) {
  const ref = doc(db, COL.lancamentos, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existente = snap.data();
  await setDoc(ref, {
    ...existente,
    ...dados,
    userId: existente.userId,
    ordem: existente.ordem,
    createdAt: existente.createdAt,
  });
}

async function criarLancamentoPeloTR(tr) {
  const data = tr.querySelector("[data-campo='data'] input").value;
  const loja = tr.querySelector("[data-campo='loja'] select").value;
  const tipo = tr.querySelector("[data-campo='tipo'] select").value;
  const valorBase = Util.parseValor(tr.querySelector("[data-campo='valor'] input").value);
  const obs = (tr.querySelector("[data-campo='obs'] input").value || "").trim();
  if (!data || !loja || !tipo || valorBase <= 0) {
    Util.notificar("Preencha data, loja, tipo e valor positivo.", "erro");
    return;
  }

  const docRef = await Util.capturarErro(
    () => salvarLancamento({
      data,
      loja,
      lancamento: tipo,
      valor: tipo === "saida" ? -valorBase : valorBase,
      observacao: obs
    }),
    "Erro ao salvar lançamento"
  );
  if (docRef) tr.dataset.id = docRef.id;
}

async function atualizarLancamentoPeloTR(tr) {
  const data = tr.querySelector("[data-campo='data'] input").value;
  const loja = tr.querySelector("[data-campo='loja'] select").value;
  const tipo = tr.querySelector("[data-campo='tipo'] select").value;
  const valorBase = Util.parseValor(tr.querySelector("[data-campo='valor'] input").value);
  const obs = (tr.querySelector("[data-campo='obs'] input").value || "").trim();
  if (!tr.dataset.id) return;
  if (!data || !loja || !tipo) {
    Util.notificar("Preencha todos os campos obrigatórios.", "erro");
    return;
  }

  await Util.capturarErro(
    () => atualizarLancamento(tr.dataset.id, {
      data,
      loja,
      lancamento: tipo,
      valor: tipo === "saida" ? -valorBase : valorBase,
      observacao: obs
    }),
    "Erro ao atualizar lançamento"
  );
}

function recalcularSaldosTabela() {
  let saldo = 0;
  [...$("corpoTabela").children].forEach(tr => {
    const l = Store.lancamentos.find(l => l.id === tr.dataset.id) || {};
    saldo += Number(l.valor) || 0;
    tr.querySelector(".saldo").textContent = Util.moeda(saldo);
  });
}

// =========================
// CRUD: Distribuições
// =========================

async function salvarDistribuicao(dados) {
  const ref = doc(collection(db, COL.distribuicoes));
  await runTransaction(db, async tx => {
    tx.set(ref, {
      ...dados,
      userId: Store.usuario.uid,
      createdAt: serverTimestamp(),
      ordem: Date.now() + Math.random()
    });
  });
  return ref;
}

async function atualizarDistribuicaoDoc(id, dados) {
  const ref = doc(db, COL.distribuicoes, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existente = snap.data();
  await setDoc(ref, {
    ...existente,
    ...dados,
    userId: existente.userId,
    ordem: existente.ordem,
    createdAt: existente.createdAt,
  });
}

async function criarDistribuicaoPeloTR(tr) {
  const mes = tr.querySelector("[data-campo='mes'] input").value;
  const data = tr.querySelector("[data-campo='data'] input").value;
  const pessoa = tr.querySelector("[data-campo='pessoa'] select").value;
  const tipo = tr.querySelector("[data-campo='tipo'] select").value;
  const valorBase = Util.parseValor(tr.querySelector("[data-campo='valor'] input").value);
  const obs = (tr.querySelector("[data-campo='obs'] input").value || "").trim();
  if (!data || !pessoa || !tipo || valorBase <= 0) {
    Util.notificar("Preencha data, pessoa, tipo e valor positivo.", "erro");
    return;
  }

  const docRef = await Util.capturarErro(
    () => salvarDistribuicao({
      mes,
      data,
      pessoa,
      tipo,
      valor: tipo === "saida" ? -valorBase : valorBase,
      observacao: obs
    }),
    "Erro ao salvar distribuição"
  );
  if (docRef) tr.dataset.id = docRef.id;
}

async function atualizarDistribuicaoPeloTR(tr) {
  const mes = tr.querySelector("[data-campo='mes'] input").value;
  const data = tr.querySelector("[data-campo='data'] input").value;
  const pessoa = tr.querySelector("[data-campo='pessoa'] select").value;
  const tipo = tr.querySelector("[data-campo='tipo'] select").value;
  const valorBase = Util.parseValor(tr.querySelector("[data-campo='valor'] input").value);
  const obs = (tr.querySelector("[data-campo='obs'] input").value || "").trim();
  if (!tr.dataset.id) return;
  if (!data || !pessoa || !tipo) {
    Util.notificar("Preencha todos os campos obrigatórios.", "erro");
    return;
  }

  await Util.capturarErro(
    () => atualizarDistribuicaoDoc(tr.dataset.id, {
      mes, data, pessoa, tipo,
      valor: tipo === "saida" ? -valorBase : valorBase,
      observacao: obs
    }),
    "Erro ao atualizar distribuição"
  );
}

// =========================
// RENDER: Tabelas
// =========================

function criarLinha(item = {}, container) {
  const tr = document.createElement("tr");
  const valor = item.valor ? Math.abs(item.valor) : "";
  tr.dataset.id = item.id || "";
  tr.innerHTML = `
    <td data-campo="data"><input type="date" value="${item.data || ""}"></td>
    <td data-campo="loja"><select>
      <option value="">Selecione</option>
      <option value="Eletronica" ${item.loja === "Eletronica" ? "selected" : ""}>Eletrônica</option>
      <option value="Casa do Norte" ${item.loja === "Casa do Norte" ? "selected" : ""}>Casa do Norte</option>
      <option value="Bar" ${item.loja === "Bar" ? "selected" : ""}>Bar</option>
      <option value="Hotel" ${item.loja === "Hotel" ? "selected" : ""}>Hotel</option>
      <option value="IR" ${item.loja === "IR" ? "selected" : ""}>IR</option>
      <option value="Outros" ${item.loja === "Outros" ? "selected" : ""}>Outros</option>
    </select></td>
    <td data-campo="tipo"><select>
      <option value="">Selecione</option>
      <option value="entrada" ${item.lancamento === "entrada" ? "selected" : ""}>Entrada</option>
      <option value="saida" ${item.lancamento === "saida" ? "selected" : ""}>Saída</option>
    </select></td>
    <td data-campo="valor"><input type="text" inputmode="decimal" value="${valor}"></td>
    <td data-campo="saldo" class="saldo">0,00</td>
    <td data-campo="obs"><input type="text" value="${item.observacao || ""}"></td>
    <td data-campo="acoes">
      <button class="btn-confirmar" ${item.id ? "style=display:none" : ""}>Salvar</button>
      <button class="btn-delete">🗑️</button>
    </td>`;

  Util.configurarInputValor(tr.querySelector("[data-campo='valor'] input"));

  const isNew = !item.id;

  tr.querySelector(".btn-delete").onclick = async e => {
    e.stopPropagation();
    if (!confirm("Excluir este lançamento?")) return;
    const docId = tr.dataset.id;
    if (docId) {
      try {
        await runTransaction(db, async tx => {
          tx.delete(doc(db, COL.lancamentos, docId));
        });
      } catch (err) {
        Util.notificar("Erro ao excluir: " + err.message, "erro");
        return;
      }
    }
    tr.remove();
    recalcularSaldosTabela();
  };

  if (isNew) {
    tr.querySelector(".btn-confirmar").onclick = async () => {
      await criarLancamentoPeloTR(tr);
      if (tr.dataset.id) {
        tr.remove();
        Util.notificar("Lançamento salvo!");
      }
    };
  }

  tr.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("change", () => {
      if (tr.dataset.id) {
        atualizarLancamentoPeloTR(tr);
        recalcularSaldosTabela();
      }
    });
  });
  (container || $("corpoTabela")).appendChild(tr);
}

function recalcularSaldosDistribuicao() {
  let saldo = 0;
  [...$("corpoDistribuicao").children].forEach(tr => {
    const d = Store.distribuicoes.find(d => d.id === tr.dataset.id) || {};
    saldo += Number(d.valor) || 0;
    tr.querySelector(".saldo").textContent = Util.moeda(saldo);
  });
}

function criarLinhaDistribuicao(item = {}, container) {
  const tr = document.createElement("tr");
  const valor = item.valor ? Math.abs(item.valor) : "";
  tr.dataset.id = item.id || "";
  tr.innerHTML = `
    <td data-campo="mes"><input type="month" value="${item.mes || ""}"></td>
    <td data-campo="data"><input type="date" value="${item.data || ""}"></td>
    <td data-campo="pessoa"><select>
      <option value="Sandra" ${item.pessoa === "Sandra" ? "selected" : ""}>Sandra</option>
      <option value="Suely" ${item.pessoa === "Suely" ? "selected" : ""}>Suely</option>
    </select></td>
    <td data-campo="tipo"><select>
      <option value="saida" ${item.tipo === "saida" ? "selected" : ""}>Saque</option>
      <option value="entrada" ${item.tipo === "entrada" ? "selected" : ""}>Depósito</option>
    </select></td>
    <td data-campo="valor"><input type="text" inputmode="decimal" value="${valor}"></td>
    <td data-campo="saldo" class="saldo">0,00</td>
    <td data-campo="obs"><input type="text" value="${item.observacao || ""}"></td>
    <td data-campo="acoes">
      <button class="btn-confirmar" ${item.id ? "style=display:none" : ""}>Salvar</button>
      <button class="btn-delete">🗑️</button>
    </td>`;

  Util.configurarInputValor(tr.querySelector("[data-campo='valor'] input"));

  const isNew = !item.id;

  tr.querySelector(".btn-delete").onclick = async e => {
    e.stopPropagation();
    if (!confirm("Excluir esta distribuição?")) return;
    const docId = tr.dataset.id;
    if (docId) {
      try {
        await runTransaction(db, async tx => {
          tx.delete(doc(db, COL.distribuicoes, docId));
        });
      } catch (err) {
        Util.notificar("Erro ao excluir: " + err.message, "erro");
        return;
      }
    }
    tr.remove();
    recalcularSaldosDistribuicao();
  };

  if (isNew) {
    tr.querySelector(".btn-confirmar").onclick = async () => {
      await criarDistribuicaoPeloTR(tr);
      if (tr.dataset.id) {
        tr.remove();
        Util.notificar("Distribuição salva!");
      }
    };
  }

  tr.querySelectorAll("input, select").forEach(el => {
    el.addEventListener("change", () => {
      if (tr.dataset.id) {
        atualizarDistribuicaoPeloTR(tr);
        recalcularSaldosDistribuicao();
      }
    });
  });
  (container || $("corpoDistribuicao")).appendChild(tr);
}

$("btnNovaLinha").onclick = () => criarLinha({}, $("novaLinhaArea"));
$("btnNovaDistribuicao").onclick = () => criarLinhaDistribuicao({}, $("novaDistribuicaoArea"));

// =========================
// FILTROS
// =========================
function getLancamentosFiltrados() {
  const mes = $("filtroMesLanc").value;
  if (!mes) return Store.lancamentos;
  return Store.lancamentos.filter(d => d.data && d.data.startsWith(mes));
}
function getDistribuicoesFiltradas() {
  const mes = $("filtroMesDist").value;
  if (!mes) return Store.distribuicoes;
  return Store.distribuicoes.filter(d => d.mes && d.mes === mes);
}
function atualizarContadores() {
  const filtradosL = getLancamentosFiltrados().length;
  $("contadorLanc").textContent = `${filtradosL} de ${Store.lancamentos.length} lançamentos`;
  const filtradosD = getDistribuicoesFiltradas().length;
  $("contadorDist").textContent = `${filtradosD} de ${Store.distribuicoes.length} distribuições`;
}
$("filtroMesLanc").addEventListener("change", renderizarTudo);
$("btnLimparFiltroLanc").onclick = () => { $("filtroMesLanc").value = ""; renderizarTudo(); };
$("filtroMesDist").addEventListener("change", renderizarTudo);
$("btnLimparFiltroDist").onclick = () => { $("filtroMesDist").value = ""; renderizarTudo(); };

// =========================
// DASHBOARD: Principal
// =========================

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function rateio(valor, partes) {
  const totalCentavos = Math.round(valor * 100);
  const base = Math.floor(totalCentavos / partes);
  const resto = totalCentavos % partes;
  const resultados = [];
  for (let i = 0; i < partes; i++) {
    resultados.push((base + (i < resto ? 1 : 0)) / 100);
  }
  return resultados;
}

function calcularLucroPorMes(mes) {
  let entradas = 0, saidas = 0;
  Store.lancamentos.forEach(d => {
    if (d.loja === "IR") return;
    if (d.data && d.data.startsWith(mes)) {
      if (d.valor > 0) entradas += d.valor;
      else saidas += d.valor;
    }
  });
  return arredondar(entradas + saidas);
}

function calcularIR(valor) {
  if (valor <= 0) return 0;
  const tab = Store.tabelaIR.length ? Store.tabelaIR : TabelaIRPadrao;
  let faixa = tab[tab.length - 1];
  for (let i = 0; i < tab.length; i++) {
    if (tab[i].acima) break;
    if (valor <= tab[i].ate) { faixa = tab[i]; break; }
  }
  return Math.max(0, arredondar(valor * (faixa.aliquota / 100) - faixa.deducao));
}

function irPagoMes(mes) {
  if (!mes || !Store.lancamentos) return 0;
  return Store.lancamentos.reduce((sum, d) => {
    if (d.loja !== "IR") return sum;
    const pertence = d.mesReferencia
      ? d.mesReferencia === mes
      : d.data && d.data.startsWith(mes);
    if (pertence) sum += Math.abs(Number(d.valor) || 0);
    return sum;
  }, 0);
}

function calcularIRMes(mes) {
  const lucro = calcularLucroPorMes(mes);
  const ir = calcularIR(lucro / 2) * 2;
  const pago = irPagoMes(mes);
  return { lucro, ir, pago };
}

function atualizarDashboard() {
  let entradas = 0, saidas = 0, maiorEntrada = 0, maiorSaida = 0;

  Store.lancamentos.forEach(d => {
    const v = Number(d.valor) || 0;
    if (v > 0) {
      entradas += v;
      if (v > maiorEntrada) maiorEntrada = v;
    } else {
      const absV = Math.abs(v);
      saidas += absV;
      if (absV > maiorSaida) maiorSaida = absV;
    }
  });

  entradas = arredondar(entradas);
  saidas = arredondar(saidas);
  const saldoOperacional = arredondar(entradas - saidas);
  const totalDistrib = arredondar(Store.distribuicoes.reduce((s, d) => s + (Number(d.valor) || 0), 0));
  const saldoReal = arredondar(saldoOperacional + totalDistrib);
  const [metaSandra, metaSuely] = rateio(saldoReal, 2);

  $("dashSaldo").textContent = Util.moeda(saldoReal);
  $("dashEntradas").textContent = Util.moeda(entradas);
  $("dashSaidas").textContent = Util.moeda(saidas);
  $("dashQtd").textContent = Store.lancamentos.length;
  $("dashMaiorEntrada").textContent = Util.moeda(maiorEntrada);
  $("dashMaiorSaida").textContent = Util.moeda(maiorSaida);
  $("dashLucroSandra").textContent = Util.moeda(metaSandra);
  $("dashLucroSuely").textContent = Util.moeda(metaSuely);
}

// =========================
// DASHBOARD: Distribuição
// =========================

function atualizarDashboardDistribuicao() {
  let dTotal = 0, sandra = 0, suely = 0;
  let ultimaData = null, ultimoMes = null;

  Store.distribuicoes.forEach(d => {
    const v = Number(d.valor) || 0;
    dTotal += v;
    if (d.pessoa === "Sandra") sandra += v;
    if (d.pessoa === "Suely") suely += v;
    if (d.data) {
      const [ano, mes, dia] = d.data.split("-");
      const dataObj = new Date(ano, mes - 1, dia);
      if (!ultimaData || dataObj > ultimaData) ultimaData = dataObj;
    }
    if (d.mes) {
      const mesObj = new Date(d.mes + "-01");
      if (!ultimoMes || mesObj > ultimoMes) ultimoMes = mesObj;
    }
  });

  const lucroTotal = Store.lancamentos.reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const saldoPendente = arredondar(lucroTotal + dTotal);

  $("dashLucroTotal").textContent = Util.moeda(lucroTotal);
  $("dashDistribuido").textContent = Util.moeda(dTotal);
  $("dashPendente").textContent = Util.moeda(saldoPendente);
  $("dashDistribuidoSandra").textContent = Util.moeda(sandra);
  $("dashDistribuidoSuely").textContent = Util.moeda(suely);
  $("dashQtdEnvios").textContent = Store.distribuicoes.length;
  $("dashUltimaData").textContent = ultimaData ? ultimaData.toLocaleDateString("pt-BR") : "—";
  $("dashUltimoMes").textContent = ultimoMes
    ? ultimoMes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "—";
}

// =========================
// DASHBOARD: Análise Mensal
// =========================

$("filtroMes").addEventListener("change", atualizarDashboardMensal);

function atualizarDashboardMensal() {
  const mesSel = $("filtroMes").value;
  if (!mesSel) return;

  let entradas = 0, saidas = 0;
  Store.lancamentos.forEach(d => {
    if (d.loja === "IR") return;
    if (d.data && d.data.startsWith(mesSel)) {
      const v = Number(d.valor) || 0;
      if (v > 0) entradas += v;
      else saidas += v;
    }
  });

  let distNoMes = 0;
  Store.distribuicoes.forEach(d => {
    if (d.mes === mesSel) {
      distNoMes += Number(d.valor) || 0;
    }
  });

  const resultado = arredondar(entradas + saidas);
  const irMes = calcularIRMes(mesSel).ir;
  const resultadoLiquido = arredondar(resultado - irMes + distNoMes);
  const [metaSandra, metaSuely] = rateio(resultadoLiquido, 2);

  $("dashMesEntradas").textContent = Util.moeda(entradas);
  $("dashMesSaidas").textContent = Util.moeda(Math.abs(saidas));
  $("dashMesSandra").textContent = Util.moeda(metaSandra);
  $("dashMesSuely").textContent = Util.moeda(metaSuely);
  $("dashMesResultado").textContent = Util.moeda(resultado);
  $("dashMesDistribuicoes").textContent = Util.moeda(distNoMes);
}

// =========================
// DASHBOARD: IR
// =========================

$("filtroMesIR").addEventListener("change", atualizarDashboardIR);
$("filtroAnoIR").addEventListener("change", atualizarDashboardIR);

function atualizarDashboardIR() {
  if (!Store.usuario) return;
  const mes = $("filtroMesIR").value;
  const ano = $("filtroAnoIR").value;
  if (!mes && !ano) return;

  if (mes) {
    const { lucro, ir } = calcularIRMes(mes);
    const [irSandra, irSuely] = rateio(ir, 2);
    const lucroLiquido = arredondar(lucro - ir);
    $("dashIRLucroMes").textContent = Util.moeda(lucro);
    $("dashIRMes").textContent = Util.moeda(ir);
    $("dashIRSandra").textContent = Util.moeda(irSandra);
    $("dashIRSuely").textContent = Util.moeda(irSuely);
    $("dashIRLucroLiquido").textContent = Util.moeda(lucroLiquido);
  }
  atualizarStatusIR();
}

function atualizarStatusIR() {
  const mes = $("filtroMesIR").value;
  const el = $("statusIRPago");
  const btn = $("btnPagarIR");
  if (!mes) { el.textContent = ""; btn.style.display = "none"; return; }
  btn.style.display = "";
  const { ir, pago } = calcularIRMes(mes);
  const restante = Math.max(0, ir - pago);
  const [irSandra, irSuely] = rateio(restante, 2);
  if (ir <= 0) {
    el.textContent = "Nenhum IR a pagar neste mês.";
    btn.style.display = "none";
  } else if (pago >= ir) {
    el.innerHTML = `<span style="color:var(--green)">✔ IR de <strong>${Util.moeda(ir)}</strong> já pago neste mês.</span>`;
    btn.textContent = "Pagar IR do Mês";
    btn.disabled = true;
    btn.style.opacity = "0.4";
    btn.style.cursor = "not-allowed";
  } else if (pago > 0) {
    el.innerHTML = `IR de <strong>${Util.moeda(ir)}</strong> — já pago <strong>${Util.moeda(pago)}</strong>, restante <strong>${Util.moeda(restante)}</strong> — ${Util.moeda(irSandra)} para Sandra, ${Util.moeda(irSuely)} para Suely.`;
    btn.textContent = `Pagar restante de ${Util.moeda(restante)}`;
    btn.disabled = false;
    btn.style.opacity = "";
    btn.style.cursor = "";
  } else {
    el.innerHTML = `IR de <strong>${Util.moeda(ir)}</strong> pendente — ${Util.moeda(irSandra)} para Sandra, ${Util.moeda(irSuely)} para Suely.`;
    btn.textContent = `Pagar IR de ${Util.moeda(ir)}`;
    btn.disabled = false;
    btn.style.opacity = "";
    btn.style.cursor = "";
  }
}

$("btnPagarIR").onclick = async () => {
  const mes = $("filtroMesIR").value;
  if (!mes) return Util.notificar("Selecione um mês primeiro.", "erro");
  const { ir, pago } = calcularIRMes(mes);
  const restante = Math.max(0, ir - pago);
  if (ir <= 0) return Util.notificar("Nenhum IR a pagar neste mês.", "erro");
  if (restante <= 0) return Util.notificar("IR deste mês já foi totalmente pago.", "erro");
  if (!confirm(`Confirmar pagamento de ${Util.moeda(restante)} de IR referente a ${mes}?`)) return;

  const ano = parseInt(mes.split("-")[0]);
  const mesNum = parseInt(mes.split("-")[1]);
  const proxAno = mesNum === 12 ? ano + 1 : ano;
  const proxMes = mesNum === 12 ? 1 : mesNum + 1;
  const ultimoDiaProx = new Date(proxAno, proxMes, 0).getDate();
  const data = `${proxAno}-${String(proxMes).padStart(2, "0")}-${String(ultimoDiaProx).padStart(2, "0")}`;
  const nomeMes = new Date(ano, mesNum - 1).toLocaleDateString("pt-BR", { month: "long" });

  await Util.capturarErro(async () => {
    const ref = doc(collection(db, COL.lancamentos));
    await runTransaction(db, async tx => {
      tx.set(ref, {
        data,
        loja: "IR",
        lancamento: "saida",
        valor: -restante,
        mesReferencia: mes,
        observacao: `IR Carnê-Leão ${nomeMes}/${ano}`,
        userId: Store.usuario.uid,
        createdAt: serverTimestamp(),
        ordem: Date.now() + Math.random()
      });
    });
  }, "Erro ao registrar pagamento de IR");

  Util.notificar(`IR de ${Util.moeda(restante)} registrado como saída!`);
  atualizarStatusIR();
};

// =========================
// DASHBOARD: Extratos
// =========================

function atualizarExtratos() {
  const tbodySuely = $("extratoSuely");
  const tbodySayuri = $("extratoSayuri");
  const totalSuely = $("totalSuely");
  const totalSayuri = $("totalSayuri");
  if (!tbodySuely || !tbodySayuri || !totalSuely || !totalSayuri) return;

  tbodySuely.innerHTML = "";
  tbodySayuri.innerHTML = "";

  let saldoSuely = 0, saldoSayuri = 0;
  const todos = [];

  Store.lancamentos.forEach(item => {
    if (!item || !item.data || item.valor === undefined || item.valor === "") return;
    const v = arredondar((Number(item.valor) || 0) / 2);
    let desc = item.lancamento || item.descricao || item.categoria || "-";
    if (item.loja === "IR") desc = item.observacao || "IR Carnê-Leão";
    todos.push({ data: item.data, descricao: desc, valor: v, pessoa: "suely" });
    todos.push({ data: item.data, descricao: desc, valor: v, pessoa: "sayuri" });
  });

  Store.distribuicoes.forEach(d => {
    const v = Number(d.valor) || 0;
    const p = (d.pessoa || "").trim().toLowerCase();
    const label = d.tipo === "saida" ? "Saque" : "Depósito";
    todos.push({ data: d.data, descricao: `${label} - ${d.observacao || d.pessoa || "-"}`, valor: v, pessoa: p });
  });

  todos.sort((a, b) => (a.data || "").localeCompare(b.data || ""));

  todos.forEach(item => {
    if (item.pessoa === "suely") {
      saldoSuely = arredondar(saldoSuely + item.valor);
      tbodySuely.appendChild(criarLinhaExtrato(item.data, item.descricao, item.valor, saldoSuely));
    }
    if (item.pessoa === "sayuri" || item.pessoa === "sandra") {
      saldoSayuri = arredondar(saldoSayuri + item.valor);
      tbodySayuri.appendChild(criarLinhaExtrato(item.data, item.descricao, item.valor, saldoSayuri));
    }
  });

  totalSuely.textContent = Util.moeda(saldoSuely);
  totalSayuri.textContent = Util.moeda(saldoSayuri);
}

function criarLinhaExtrato(data, descricao, valor, saldo) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${Util.data(data)}</td>
    <td>${descricao}</td>
    <td class="${valor >= 0 ? "valorPositivo" : "valorNegativo"}">${Util.moeda(valor)}</td>
    <td class="saldoExtrato">${Util.moeda(saldo)}</td>`;
  return tr;
}

// =========================
// DASHBOARD: Painel Lojas
// =========================

function atualizarPainelLojas() {
  const lojas = ["Eletronica", "Casa do Norte", "Bar", "Hotel", "IR"];
  $("painelLojas").innerHTML = "";

  lojas.forEach(loja => {
    const registros = Store.lancamentos.filter(d => d.loja === loja);
    const temRegistro = registros.length > 0;
    const ultimo = temRegistro
      ? registros.reduce((a, b) => (a.data || "") > (b.data || "") ? a : b)
      : null;
    const positivo = temRegistro && ultimo.valor > 0;
    let cor = "#ef4444";
    let status = "Sem dados";
    if (temRegistro) {
      cor = positivo ? "#22c55e" : "#eab308";
      status = positivo ? "Entrada" : "Somente saída";
    }
    const valor = temRegistro ? Util.moeda(Math.abs(ultimo.valor)) : "—";
    const data = temRegistro ? (ultimo.data || "—") : "—";
    const tipo = temRegistro ? (ultimo.lancamento || "—") : "—";

    $("painelLojas").innerHTML += `
      <div class="card">
        <span class="label" style="color:${cor}">${loja}</span>
        <p style="font-size:0.75rem;color:var(--text2);margin:4px 0">${temRegistro ? `Última: ${data}` : "Sem lançamentos"}</p>
        <p style="font-size:0.75rem;color:var(--text2);margin:2px 0">${temRegistro ? `Tipo: ${tipo}` : ""}</p>
        <strong style="color:${cor};font-size:1rem">${valor}</strong>
        <small style="display:block;font-size:0.65rem;color:var(--text3);margin-top:4px">${status}</small>
      </div>`;
  });
}

// =========================
// BACKUP
// =========================

$("btnSalvar").onclick = async () => {
  const backup = {
    data: new Date().toISOString(),
    locacoes: Store.lancamentos,
    distribuicoes: Store.distribuicoes
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "backup-locacoes.json";
  a.click();
  URL.revokeObjectURL(url);
  Util.notificar("Backup salvo!");
};

$("btnImportar").onclick = () => $("inputBackup").click();

const BATCH_LIMITE = 500;

function validarItemLanc(item, i) {
  if (!item || typeof item !== "object") throw new Error(`Item ${i} inválido em lançamentos`);
  if (!item.data || typeof item.data !== "string") throw new Error(`Lançamento ${i}: data inválida`);
  if (item.valor === undefined || item.valor === null || typeof Number(item.valor) !== "number" || !isFinite(item.valor))
    throw new Error(`Lançamento ${i}: valor inválido`);
  if (!item.loja) throw new Error(`Lançamento ${i}: loja obrigatória`);
}

function validarItemDist(item, i) {
  if (!item || typeof item !== "object") throw new Error(`Item ${i} inválido em distribuições`);
  if (!item.data || typeof item.data !== "string") throw new Error(`Distribuição ${i}: data inválida`);
  if (item.valor === undefined || item.valor === null || typeof Number(item.valor) !== "number" || !isFinite(item.valor))
    throw new Error(`Distribuição ${i}: valor inválido`);
  if (!item.pessoa) throw new Error(`Distribuição ${i}: pessoa obrigatória`);
}

function limparItem(item) {
  const { id, ...resto } = item;
  return resto;
}

async function executarTransacaoAtomica(colecao1, itens1, colecao2, itens2) {
  const total = itens1.length + itens2.length;
  for (let i = 0; i < total; i += BATCH_LIMITE) {
    await runTransaction(db, async tx => {
      const fim = Math.min(i + BATCH_LIMITE, total);
      for (let j = i; j < fim; j++) {
        if (j < itens1.length) {
          const ref = doc(collection(db, colecao1));
          tx.set(ref, {
            ...limparItem(itens1[j]),
            userId: Store.usuario.uid,
            createdAt: serverTimestamp(),
            ordem: Date.now() + Math.random()
          });
        } else {
          const idx = j - itens1.length;
          const ref = doc(collection(db, colecao2));
          tx.set(ref, {
            ...limparItem(itens2[idx]),
            userId: Store.usuario.uid,
            createdAt: serverTimestamp(),
            ordem: Date.now() + Math.random()
          });
        }
      }
    });
  }
}

$("inputBackup").addEventListener("change", async () => {
  const file = $("inputBackup").files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup || typeof backup !== "object") throw new Error("Arquivo inválido");
      if (!Array.isArray(backup.locacoes) || !Array.isArray(backup.distribuicoes)) {
        throw new Error("Estrutura do arquivo inválida");
      }

      backup.locacoes.forEach((item, i) => validarItemLanc(item, i));
      backup.distribuicoes.forEach((item, i) => validarItemDist(item, i));

      const totalItens = backup.locacoes.length + backup.distribuicoes.length;
      if (totalItens > 10000) {
        if (!confirm(`Importar ${totalItens} registros? Pode levar alguns segundos.`)) return;
      }

      Store.importando = true;

      await executarTransacaoAtomica(COL.lancamentos, backup.locacoes, COL.distribuicoes, backup.distribuicoes);

      Store.importando = false;
      renderizarTudo();
      Util.notificar(`${backup.locacoes.length} lançamentos e ${backup.distribuicoes.length} distribuições importados!`);
    } catch (erro) {
      Store.importando = false;
      Util.notificar("Erro ao importar: " + erro.message, "erro");
    }
  };
  reader.readAsText(file);
  $("inputBackup").value = "";
});

// =========================
// CONFIGURAÇÃO IR (UI)
// =========================

function renderizarConfigIR() {
  const tbody = $("corpoConfigIR");
  if (!tbody) return;
  tbody.innerHTML = "";
  const tab = Store.tabelaIR.length ? Store.tabelaIR : TabelaIRPadrao;
  tab.forEach((faixa, i) => {
    const tr = document.createElement("tr");
    const ate = faixa.acima ? "" : faixa.ate.toFixed(2);
    tr.innerHTML = `
      <td><input type="text" inputmode="decimal" value="${ate}" class="ir-ate" style="text-align:right" ${faixa.acima ? "disabled" : ""}></td>
      <td><input type="text" inputmode="decimal" value="${faixa.aliquota}" class="ir-aliquota" style="text-align:right"></td>
      <td><input type="text" inputmode="decimal" value="${faixa.deducao.toFixed(2)}" class="ir-deducao" style="text-align:right"></td>
      <td>${i === tab.length - 1 ? "acima" : `<button class="btn-delete" data-idx="${i}">✕</button>`}</td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("input[inputmode='decimal']").forEach(Util.configurarInputValor);
}

$("btnConfigIR").onclick = () => {
  const modal = $("modalConfigIR");
  modal.style.display = modal.style.display === "none" ? "block" : "none";
  renderizarConfigIR();
};

$("btnFecharConfigIR").onclick = () => { $("modalConfigIR").style.display = "none"; };

$("btnAddFaixaIR").onclick = () => {
  const tab = Store.tabelaIR.length ? Store.tabelaIR : TabelaIRPadrao;
  const ultima = tab[tab.length - 1];
  const novoAte = ultima.acima ? 5000 : ultima.ate + 1000;
  tab.splice(tab.length - 1, 0, { ate: novoAte, aliquota: 27.5, deducao: ultima.deducao + 200 });
  renderizarConfigIR();
};

$("btnSalvarConfigIR").onclick = async () => {
  const linhas = [...document.querySelectorAll("#corpoConfigIR tr")];
  const novaTabela = [];
  linhas.forEach(tr => {
    const inputs = tr.querySelectorAll("input");
    const ateInput = inputs[0];
    const aliq = Util.parseValor(inputs[1].value) || 0;
    const ded = Util.parseValor(inputs[2].value) || 0;
    if (ateInput.disabled) {
      novaTabela.push({ acima: true, aliquota: aliq, deducao: ded });
    } else {
      const ate = Util.parseValor(ateInput.value);
      if (ate > 0) novaTabela.push({ ate, aliquota: aliq, deducao: ded });
    }
  });
  if (novaTabela.length === 0) return;
  if (!novaTabela[novaTabela.length - 1].acima) {
    const ult = novaTabela[novaTabela.length - 1];
    novaTabela.push({ acima: true, aliquota: ult.aliquota, deducao: ult.deducao });
  }
  Store.tabelaIR = novaTabela;
  await salvarTabelaIRFirestore();
  atualizarDashboardIR();
  Util.notificar("Tabela de IR salva!");
  $("modalConfigIR").style.display = "none";
};

document.addEventListener("click", e => {
  if (e.target.classList.contains("btn-delete") && e.target.dataset.idx) {
    const idx = parseInt(e.target.dataset.idx);
    const tab = Store.tabelaIR.length ? Store.tabelaIR : TabelaIRPadrao;
    if (tab.length > 2) {
      tab.splice(idx, 1);
      renderizarConfigIR();
    } else {
      Util.notificar("Deve haver pelo menos 2 faixas", "erro");
    }
  }
});

// =========================
// RENDER: Principal
// =========================

function renderizarTudo() {
  $("corpoTabela").innerHTML = "";
  $("corpoDistribuicao").innerHTML = "";

  getLancamentosFiltrados().forEach(item => criarLinha(item));
  getDistribuicoesFiltradas().forEach(item => criarLinhaDistribuicao(item));
  recalcularSaldosTabela();
  recalcularSaldosDistribuicao();
  atualizarContadores();

  // Remove rows da área de novo lançamento que já foram salvos
  [...$("novaLinhaArea").children].forEach(tr => { if (tr.dataset.id) tr.remove(); });
  [...$("novaDistribuicaoArea").children].forEach(tr => { if (tr.dataset.id) tr.remove(); });

  atualizarDashboard();
  atualizarDashboardDistribuicao();
  atualizarPainelLojas();
  atualizarExtratos();
  if ($("filtroMesIR").value) atualizarDashboardIR();
  if ($("filtroMes").value) atualizarDashboardMensal();
}

// =========================
// INIT
// =========================

const agora = new Date();
$("filtroAnoIR").value = agora.getFullYear();
$("filtroMesIR").value = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;

mostrarLogin();
