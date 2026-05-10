//  ELEMENTOS 
const corpoTabela = document.getElementById("corpoTabela");
const corpoDistribuicao = document.getElementById("corpoDistribuicao");

const btnNovaLinha = document.getElementById("btnNovaLinha");
const btnNovaDistribuicao = document.getElementById("btnNovaDistribuicao");
const btnSalvar = document.getElementById("btnSalvar");
const btnImportar = document.getElementById("btnImportar");

const inputBackup = document.getElementById("inputBackup");
const filtroMes = document.getElementById("filtroMes");

//  DADOS 
let dados = JSON.parse(localStorage.getItem("locacoes")) || [];
let distribuicoes = JSON.parse(localStorage.getItem("distribuicoes")) || [];

// STORAGE 
function salvarStorage() {
    localStorage.setItem("locacoes", JSON.stringify(dados));
    localStorage.setItem("distribuicoes", JSON.stringify(distribuicoes));
}

// =========================
// TABELA PRINCIPAL
// =========================
function criarLinha(item = {}) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td><input type="date" value="${item.data || ""}"></td>
        <td>
            <select>
                <option value="">Selecione</option>
                <option value="Eletronica" ${item.loja === "Eletronica" ? "selected" : ""}>Eletrônica</option>
                <option value="Casa do Norte" ${item.loja === "Casa do Norte" ? "selected" : ""}>Casa do Norte</option>
                <option value="Bar" ${item.loja === "Bar" ? "selected" : ""}>Bar</option>
                <option value="Hotel" ${item.loja === "Hotel" ? "selected" : ""}>Hotel</option>
            </select>
        </td>
        <td>
            <select>
                <option value="">Selecione</option>
                <option value="entrada" ${item.lancamento === "entrada" ? "selected" : ""}>Entrada</option>
                <option value="saida" ${item.lancamento === "saida" ? "selected" : ""}>Saída</option>
            </select>
        </td>
        <td><input type="number" step="0.01" value="${item.valor ? Math.abs(item.valor) : ""}"></td>
        <td class="saldo">0.00</td>
        <td><input type="text" value="${item.observacao || ""}"></td>
        <td><button class="btn-delete">🗑️</button></td>
    `;

    tr.querySelector(".btn-delete").onclick = () => {
        tr.remove();
        atualizarSistema();
    };

    tr.querySelectorAll("input, select").forEach(el =>
        el.addEventListener("change", atualizarSistema)
    );

    corpoTabela.appendChild(tr);
}

function atualizarSistema() {
    let saldo = 0;
    dados = [];

    [...corpoTabela.children].forEach(tr => {
        const data = tr.children[0].querySelector("input").value;
        const loja = tr.children[1].querySelector("select").value;
        const tipo = tr.children[2].querySelector("select").value;
        const valorBase = parseFloat(tr.children[3].querySelector("input").value) || 0;
        const obs = tr.children[5].querySelector("input").value;

        const valor = tipo === "saida" ? -valorBase : valorBase;
        saldo += valor;

        tr.querySelector(".saldo").innerText = saldo.toFixed(2);

        dados.push({ data, loja, lancamento: tipo, valor, observacao: obs, saldo });
    });

    salvarStorage();
    atualizarDashboard();
    atualizarDashboardDistribuicao();
    atualizarPainelLojas();
        atualizarExtratos();
         atualizarLancamentos50();

}

// =========================
// DASHBOARD PRINCIPAL
// =========================
function atualizarDashboard() {
    let entradas = 0;
    let saidas = 0;
    let maiorEntrada = 0;
    let maiorSaida = 0;

    dados.forEach(d => {
        if (d.valor > 0) {
            entradas += d.valor;
            if (d.valor > maiorEntrada) maiorEntrada = d.valor;
        }
        if (d.valor < 0) {
            saidas += Math.abs(d.valor);
            if (Math.abs(d.valor) > maiorSaida) maiorSaida = Math.abs(d.valor);
        }
    });

    const saldoOperacional = entradas - saidas;

    let totalDistribuicao = 0;
    distribuicoes.forEach(d => totalDistribuicao += d.valor);

    const saldoReal = saldoOperacional + totalDistribuicao;
    const metade = saldoReal > 0 ? saldoReal / 2 : 0;

    document.getElementById("dashSaldo").innerText = formatarMoeda(saldoReal);
    document.getElementById("dashEntradas").innerText = formatarMoeda(entradas);
    document.getElementById("dashSaidas").innerText = formatarMoeda(saidas);
    document.getElementById("dashQtd").innerText = dados.length;
    document.getElementById("dashMaiorEntrada").innerText = formatarMoeda(maiorEntrada);
    document.getElementById("dashMaiorSaida").innerText = formatarMoeda(maiorSaida);
    document.getElementById("dashLucroSandra").innerText = formatarMoeda(metade);
    document.getElementById("dashLucroSuely").innerText = formatarMoeda(metade);
}

// =========================
// DISTRIBUIÇÃO
// =========================
function criarLinhaDistribuicao(item = {}) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td><input type="month" value="${item.mes || ""}"></td>
        <td><input type="date" value="${item.data || ""}"></td>
        <td>
            <select>
                <option value="Sandra" ${item.pessoa === "Sandra" ? "selected" : ""}>Sandra</option>

<option value="Suely" ${item.pessoa === "Suely" ? "selected" : ""}>Suely</option>
            </select>
        </td>
        <td>
            <select>
                <option value="saida" ${item.tipo === "saida" ? "selected" : ""}>Saque</option>
                <option value="entrada" ${item.tipo === "entrada" ? "selected" : ""}>Depósito</option>
            </select>
        </td>
        <td><input type="number" step="0.01" value="${item.valor ? Math.abs(item.valor) : ""}"></td>
        <td class="saldo">0.00</td>
        <td><input type="text" value="${item.observacao || ""}"></td>
        <td><button class="btn-delete">🗑️</button></td>
    `;

    tr.querySelector(".btn-delete").onclick = () => {
        tr.remove();
        atualizarDistribuicao();
    };

    tr.querySelectorAll("input, select").forEach(el =>
        el.addEventListener("change", atualizarDistribuicao)
    );

    corpoDistribuicao.appendChild(tr);
}

function atualizarDistribuicao() {
    let acumulado = 0;
    distribuicoes = [];

    [...corpoDistribuicao.children].forEach(tr => {
        const mes = tr.children[0].querySelector("input").value;
        const data = tr.children[1].querySelector("input").value;
        const pessoa = tr.children[2].querySelector("select").value;
        const tipo = tr.children[3].querySelector("select").value;
        const valorBase = parseFloat(tr.children[4].querySelector("input").value) || 0;
        const obs = tr.children[6].querySelector("input").value;

        const valor = tipo === "saida" ? -valorBase : valorBase;
        acumulado += valor;

        tr.querySelector(".saldo").innerText = acumulado.toFixed(2);

        distribuicoes.push({ mes, data, pessoa, tipo, valor, observacao: obs });
    });

    salvarStorage();
    atualizarDashboardDistribuicao();
    atualizarDashboard();
    atualizarExtratos();
}

// =========================
// DASHBOARD DISTRIBUIÇÃO
// =========================
function atualizarDashboardDistribuicao() {
    let distribuido = 0;
    let sandra = 0;
    let suely = 0;
    let ultimaData = null;
    let ultimoMes = null;

    distribuicoes.forEach(d => {
        distribuido += d.valor;

        if (d.pessoa === "Sandra") sandra += d.valor;
        if (d.pessoa === "Suely") suely += d.valor;

        if (d.data) {
            const [ano, mes, dia] = d.data.split("-");
const dataObj = new Date(ano, mes - 1, dia);
            if (!ultimaData || dataObj > ultimaData) {
                ultimaData = dataObj;
            }
        }

        
        if (d.mes) {
            const mesObj = new Date(d.mes + "-01");
            if (!ultimoMes || mesObj > ultimoMes) {
                ultimoMes = mesObj;
            }
        }
    });

    const lucroTotal = dados.length ? dados[dados.length - 1].saldo : 0;
    const saldoPendente = lucroTotal + distribuido;

    document.getElementById("dashLucroTotal").innerText =
        `R$ ${lucroTotal.toFixed(2)}`;

    document.getElementById("dashDistribuido").innerText =
        `R$ ${distribuido.toFixed(2)}`;

    document.getElementById("dashPendente").innerText =
        `R$ ${saldoPendente.toFixed(2)}`;

    document.getElementById("dashDistribuidoSandra").innerText =
        `R$ ${sandra.toFixed(2)}`;

    document.getElementById("dashDistribuidoSuely").innerText =
        `R$ ${suely.toFixed(2)}`;

    document.getElementById("dashQtdEnvios").innerText =
        distribuicoes.length;

    document.getElementById("dashUltimaData").innerText =
        ultimaData ? ultimaData.toLocaleDateString("pt-BR") : "—";

    document.getElementById("dashUltimoMes").innerText =
        ultimoMes
            ? ultimoMes.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric"
            })
            : "—";
}

// =========================
// EVENTOS
// =========================
btnNovaLinha.onclick = () => criarLinha();
btnNovaDistribuicao.onclick = () => criarLinhaDistribuicao();
filtroMes.addEventListener("change", atualizarDashboardMensal);

// =========================
// ANÁLISE MENSAL
// =========================
function atualizarDashboardMensal() {
    const mesSelecionado = filtroMes.value;
    if (!mesSelecionado) return;

    let entradas = 0;
    let saidas = 0;

    dados.forEach(d => {
        if (d.data && d.data.startsWith(mesSelecionado)) {
            if (d.valor > 0) entradas += d.valor;
            else saidas += d.valor;
        }
    });

    document.getElementById("dashMesEntradas").innerText = `R$ ${entradas.toFixed(2)}`;
    document.getElementById("dashMesSaidas").innerText = `R$ ${Math.abs(saidas).toFixed(2)}`;
    document.getElementById("dashMesResultado").innerText = `R$ ${(entradas + saidas).toFixed(2)}`;
}

function atualizarPainelLojas() {
    const lojas = ["Eletronica", "Casa do Norte", "Bar", "Hotel"];
    const painel = document.getElementById("painelLojas");

    if (!painel) return;

    painel.innerHTML = "";

    lojas.forEach(loja => {
        const registros = dados.filter(d => d.loja === loja);

        let status = "🔴";
        let classe = "alerta";
        let textoStatus = "Sem movimentação";

        if (registros.length) {
            const ultimo = registros[registros.length - 1];

            if (ultimo.valor > 0) {
                status = "🟢";
                classe = "entrada";
                textoStatus = "Entrada registrada";
            } else {
                status = "🟡";
                classe = "saida";
                textoStatus = "Somente saída";
            }

            painel.innerHTML += `
                <div class="card ${classe}">
                    <h3>${status} ${loja}</h3>
                    <p><strong>Última data:</strong> ${ultimo.data || "—"}</p>
                    <p><strong>Tipo:</strong> ${ultimo.lancamento || "—"}</p>
                    <p><strong>Valor:</strong> R$ ${Math.abs(ultimo.valor).toFixed(2)}</p>
                    <small>${textoStatus}</small>
                </div>
            `;
        } else {
            painel.innerHTML += `
                <div class="card alerta">
                    <h3>🔴 ${loja}</h3>
                    <p>Sem lançamentos registrados</p>
                    <small>⚠️ Verificar pagamento</small>
                </div>
            `;
        }
    });
}

function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// INIT
dados.forEach(criarLinha);
distribuicoes.forEach(criarLinhaDistribuicao);
atualizarSistema();
atualizarDistribuicao();
atualizarExtratos(); // garante render inicial mesmo sem interação
atualizarLancamentos50();

// =========================
// BACKUP
// =========================
btnSalvar.onclick = salvarManual;
btnImportar.onclick = () => inputBackup.click();

function salvarManual() {
    atualizarSistema();
    atualizarDistribuicao();
    atualizarLancamentos50();


    const backup = {
        data: new Date().toISOString(),
        locacoes: dados,
        distribuicoes: distribuicoes
    };

    const blob = new Blob(
        [JSON.stringify(backup, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-locacoes.json";
    a.click();

    URL.revokeObjectURL(url);
    atualizarLancamentos50();
}

// =========================
// IMPORTAR
// =========================
inputBackup.addEventListener("change", () => {
    const file = inputBackup.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
        const backup = JSON.parse(e.target.result);

        dados = backup.locacoes || [];
        distribuicoes = backup.distribuicoes || [];

        corpoTabela.innerHTML = "";
        corpoDistribuicao.innerHTML = "";

        dados.forEach(criarLinha);
        distribuicoes.forEach(criarLinhaDistribuicao);

        salvarStorage();
        atualizarSistema();
        atualizarDistribuicao();
        atualizarExtratos();
          atualizarLancamentos50(); 
    };

    reader.readAsText(file);
});



// =========================
// EXTRATOS INDIVIDUAIS
// =========================

// =========================
// EXTRATOS INDIVIDUAIS
// =========================
function atualizarExtratos() {
    const tbodySuely  = document.getElementById("extratoSuely");
    const tbodySayuri = document.getElementById("extratoSayuri");
    if (!tbodySuely || !tbodySayuri) return;

    tbodySuely.innerHTML  = "";
    tbodySayuri.innerHTML = "";

    // Helper: filtra por pessoa de forma segura (case-insensitive, sem espaços)
    const ehPessoa = (d, alvo) =>
        d && typeof d.pessoa === "string" &&
        d.pessoa.trim().toLowerCase() === alvo.toLowerCase();

    // Ordena por data crescente para o saldo acumular corretamente
    const ordenadas = [...distribuicoes].sort((a, b) => {
        const da = a.data || "";
        const db = b.data || "";
        return da.localeCompare(db);
    });

    let saldoSuely  = 0;
    let saldoSayuri = 0;

    ordenadas.forEach(d => {
        const valor = Number(d.valor) || 0;

        if (ehPessoa(d, "Suely")) {
            saldoSuely += valor;
            tbodySuely.appendChild(montarLinhaExtrato(d, valor, saldoSuely));
        } else if (ehPessoa(d, "Sayuri")) {
            saldoSayuri += valor;
            tbodySayuri.appendChild(montarLinhaExtrato(d, valor, saldoSayuri));
        }
    });

    document.getElementById("totalSuely").innerText  = formatarMoeda(saldoSuely);
    document.getElementById("totalSayuri").innerText = formatarMoeda(saldoSayuri);
}

function montarLinhaExtrato(d, valor, saldo) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${formatarData(d.data)}</td>
        <td>${d.observacao || "-"}</td>
        <td class="${valor >= 0 ? "valorPositivo" : "valorNegativo"}">
            ${formatarMoeda(valor)}
        </td>
        <td class="saldoExtrato">
            ${formatarMoeda(saldo)}
        </td>
    `;
    return tr;
}

// =========================
// FORMATAR DATA
// =========================
function formatarData(data) {
    if (!data) return "-";
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}


function atualizarLancamentos50() {
    const tbodySuelySeiti = document.getElementById("tbodyLancamentosSuelySeiti");
    const tbodySayuri = document.getElementById("tbodyLancamentosSayuri");

    const totalSuelySeiti = document.getElementById("totalLancamentosSuelySeiti");
    const totalSayuri = document.getElementById("totalLancamentosSayuri");

    if (!tbodySuelySeiti || !tbodySayuri || !totalSuelySeiti || !totalSayuri) {
        return;
    }

    tbodySuelySeiti.innerHTML = "";
    tbodySayuri.innerHTML = "";

    let saldoSuelySeiti = 0;
    let saldoSayuri = 0;

    const lancamentos = dados
        .filter(item => item && item.data && item.valor !== undefined && item.valor !== "")
        .map(item => {
            let valor = Number(
                String(item.valor)
                    .replace("R$", "")
                    .replace(/\./g, "")
                    .replace(",", ".")
                    .trim()
            );

            if (isNaN(valor)) valor = 0;

           const tipo = String(item.lancamento || item.tipo || "").toLowerCase();

            if (
                tipo.includes("saída") ||
                tipo.includes("saida") ||
                tipo.includes("despesa")
            ) {
                valor = -Math.abs(valor);
            } else {
                valor = Math.abs(valor);
            }

            return {
                data: item.data,
                lancamento: item.lancamento || item.descricao || item.categoria || "-",
                valor50: valor / 2
            };
        });

    lancamentos.forEach(item => {
        saldoSuelySeiti += item.valor50;
        saldoSayuri += item.valor50;

        const trSuelySeiti = document.createElement("tr");
        trSuelySeiti.innerHTML = `
            <td>${item.data}</td>
            <td>${item.lancamento}</td>
            <td>${formatarMoeda(item.valor50)}</td>
            <td>${formatarMoeda(saldoSuelySeiti)}</td>
        `;
        tbodySuelySeiti.appendChild(trSuelySeiti);

        const trSayuri = document.createElement("tr");
        trSayuri.innerHTML = `
            <td>${item.data}</td>
            <td>${item.lancamento}</td>
            <td>${formatarMoeda(item.valor50)}</td>
            <td>${formatarMoeda(saldoSayuri)}</td>
        `;
                tbodySayuri.appendChild(trSayuri);
    });

    // ====== Aplica os saques/depósitos da Distribuição de Lucros ======
    const distribOrdenadas = [...distribuicoes].sort((a, b) =>
        (a.data || "").localeCompare(b.data || "")
    );

    distribOrdenadas.forEach(d => {
        const valor = Number(d.valor) || 0;       // já vem negativo se for saque
        const pessoa = (d.pessoa || "").trim().toLowerCase();
        const tipoLabel = d.tipo === "saida" ? "Saque" : "Depósito";
        const descricao = `${tipoLabel} - ${d.observacao || d.pessoa || "-"}`;

        if (pessoa === "suely") {
            saldoSuelySeiti += valor;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${formatarData(d.data)}</td>
                <td>${descricao}</td>
                <td>${formatarMoeda(valor)}</td>
                <td>${formatarMoeda(saldoSuelySeiti)}</td>
            `;
            tbodySuelySeiti.appendChild(tr);
        } else if (pessoa === "sayuri" || pessoa === "sandra") {
            saldoSayuri += valor;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${formatarData(d.data)}</td>
                <td>${descricao}</td>
                <td>${formatarMoeda(valor)}</td>
                <td>${formatarMoeda(saldoSayuri)}</td>
            `;
            tbodySayuri.appendChild(tr);
        }
    });

    totalSuelySeiti.textContent = formatarMoeda(saldoSuelySeiti);
    totalSayuri.textContent = formatarMoeda(saldoSayuri);

}
