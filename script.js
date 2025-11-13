// script.js - lógica do planner (criação, salvar, carregar e integração com banco interno)

const plannerBody = document.getElementById('plannerBody');
const toast = document.getElementById('toast');
const filtroDia = document.getElementById("filtroDia");
const filtroHora = document.getElementById("filtroHora");
const horas = Array.from({ length: 12 }, (_, i) => 8 + i); // 8h..19h
const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// ====== CALENDÁRIO SEMANAL ======
let dataBase = new Date();
let inicioSemana = getInicioDaSemana(dataBase);
atualizarCabecalhoDias();

// Função para obter o domingo da semana
function getInicioDaSemana(data) {
  const d = new Date(data);
  const dia = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() - dia);
  return d;
}

// Gera uma chave única para cada semana (ex: "2025-11-03")
function getSemanaKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // volta até segunda
  const segunda = new Date(d.setDate(diff));
  return segunda.toISOString().split('T')[0];
}

// Atualiza cabeçalhos e datas
function atualizarCabecalhoDias() {
  const ths = document.querySelectorAll("#planner thead th");
  if (ths.length < 8) return;

  let data = new Date(inicioSemana);
  let fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);

  const tituloSemana = document.getElementById("tituloSemana");
  if (tituloSemana) {
    const opcoes = { day: "2-digit", month: "2-digit" };
    tituloSemana.textContent = `Semana de ${inicioSemana.toLocaleDateString("pt-BR", opcoes)} a ${fimSemana.toLocaleDateString("pt-BR", opcoes)}`;
  }

  for (let i = 1; i < ths.length; i++) {
    const nomeDia = dias[i - 1];
    const diaNum = data.getDate().toString().padStart(2, "0");
    const mesNum = (data.getMonth() + 1).toString().padStart(2, "0");
    ths[i].textContent = `${nomeDia} (${diaNum}/${mesNum})`;
    data.setDate(data.getDate() + 1);
  }

  // 👉 Atualiza a tabela ao trocar de semana
  carregarPlanner();
}

// Botões de navegação
document.getElementById("btnSemanaAnterior").addEventListener("click", () => {
  inicioSemana.setDate(inicioSemana.getDate() - 7);
  atualizarCabecalhoDias();
});

document.getElementById("btnSemanaProxima").addEventListener("click", () => {
  inicioSemana.setDate(inicioSemana.getDate() + 7);
  atualizarCabecalhoDias();
});

// cria grade editável com inputs e popup
function criarTabela() {
  if (!plannerBody) return;
  plannerBody.innerHTML = '';

  horas.forEach(hora => {
    const tr = document.createElement('tr');

    // Coluna da hora
    const tdHora = document.createElement('td');
    tdHora.textContent = `${hora}:00`;
    tr.appendChild(tdHora);

    // Cria 7 colunas (dias)
    for (let diaIndex = 0; diaIndex < 7; diaIndex++) {
      const td = document.createElement('td');
      td.dataset.hora = String(hora);
      td.dataset.dia = String(diaIndex);

      // input
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Adicionar...';
      input.classList.add('input-procedimento');
      input.readOnly = true;

      // evento de clique
      input.addEventListener('click', () => abrirPopupProcedimento(hora, diaIndex));

      td.appendChild(input);
      tr.appendChild(td);
    }

    plannerBody.appendChild(tr);
  });
}

// abre popup de seleção de procedimento
function abrirPopupProcedimento(hora, diaIndex) {
  const bancoProcedimentos = JSON.parse(localStorage.getItem('bancoProcedimentos')) || [];

  const popup = document.createElement('div');
  popup.classList.add('popup-procedimento');

  // se não há procedimentos
  if (bancoProcedimentos.length === 0) {
    popup.innerHTML = `
      <div class="popup-conteudo">
        <h3>Nenhum procedimento encontrado</h3>
        <p>Cadastre um procedimento antes de adicionar.</p>
        <button id="btnFecharPopup">Fechar</button>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#btnFecharPopup').onclick = () => popup.remove();
    return;
  }

  popup.innerHTML = `
    <div class="popup-conteudo">
      <h3>Escolher procedimento</h3>
      <select id="selectProcedimento" style="width:100%;padding:8px;margin-top:8px;">
        <option value="">Selecione...</option>
        ${bancoProcedimentos.map((p, i) => `<option value="${i}">${p.procedimento} (${p.nome})</option>`).join('')}
      </select>
      <div class="popup-acoes">
        <button id="btnConfirmarPopup">Avançar</button>
        <button id="btnCancelarPopup">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  popup.querySelector('#btnCancelarPopup').onclick = () => popup.remove();
  popup.querySelector('#btnConfirmarPopup').onclick = () => {
    const idx = popup.querySelector('#selectProcedimento').value;
    if (idx === '') {
      alert('Selecione um procedimento!');
      return;
    }
    const procedimentoSelecionado = bancoProcedimentos[idx];
    popup.remove();
    abrirPopupCliente(hora, diaIndex, procedimentoSelecionado);
  };
}

// abre popup de seleção de cliente
function abrirPopupCliente(hora, diaIndex, procedimentoSelecionado) {
  const bancoClientes = JSON.parse(localStorage.getItem('bancoClientes')) || [];

  const popup = document.createElement('div');
  popup.classList.add('popup-procedimento');

  // se não há clientes
  if (bancoClientes.length === 0) {
    popup.innerHTML = `
      <div class="popup-conteudo">
        <h3>Nenhum cliente encontrado</h3>
        <p>Cadastre um cliente antes de adicionar.</p>
        <button id="btnFecharPopup">Fechar</button>
      </div>
    `;
    document.body.appendChild(popup);
    popup.querySelector('#btnFecharPopup').onclick = () => popup.remove();
    return;
  }

  popup.innerHTML = `
    <div class="popup-conteudo">
      <h3>Escolher cliente</h3>
      <select id="selectCliente" style="width:100%;padding:8px;margin-top:8px;">
        <option value="">Selecione...</option>
        ${bancoClientes.map((c, i) => `<option value="${i}">${c.nome}</option>`).join('')}
      </select>
      <div class="popup-acoes">
        <button id="btnConfirmarCliente">Adicionar</button>
        <button id="btnCancelarCliente">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  popup.querySelector('#btnCancelarCliente').onclick = () => popup.remove();
  popup.querySelector('#btnConfirmarCliente').onclick = () => {
    const idx = popup.querySelector('#selectCliente').value;
    if (idx === '') {
      alert('Selecione uma cliente!');
      return;
    }
    const cliente = bancoClientes[idx];
    popup.remove();

    // insere na célula
    const td = plannerBody.querySelector(`td[data-hora="${hora}"][data-dia="${diaIndex}"]`);
    if (td) {
      const input = td.querySelector('input');
      input.value = `${cliente.nome} - ${procedimentoSelecionado.procedimento}`;
    }
  };
}


// toast util
function showToast(msg, ms = 2200) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(()=> t.style.display = 'none', ms);
}

// inserir procedimento
function inserirProcedimento() {
  const banco = JSON.parse(localStorage.getItem('bancoProcedimentos')) || [];
  if (banco.length === 0) {
    alert('Nenhum procedimento cadastrado. Vá em Banco Interno.');
    return;
  }
  const lista = banco.map((b,i) => `${i+1}. ${b.nome} - ${b.procedimento} (${b.duracao}h)`).join('\n');
  const escolha = prompt('Escolha um procedimento:\n' + lista);
  const idx = parseInt(escolha,10)-1;
  if (isNaN(idx) || idx < 0 || idx >= banco.length) {
    alert('Escolha inválida ou cancelada.');
    return;
  }
  const proc = banco[idx];
  alert(`Procedimento selecionado: ${proc.procedimento} de ${proc.nome} (${proc.duracao}h). Clique na célula inicial para inserir.`);
  
  document.querySelectorAll('#plannerBody td[contenteditable="true"]').forEach(td => {
    td.onclick = () => {
      preencherCelulas(td, proc);
      document.querySelectorAll('#plannerBody td[contenteditable="true"]').forEach(t => t.onclick = null);
    };
  });
}

// preencher células
function preencherCelulas(startTd, proc) {
  const duracao = parseInt(proc.duracao, 10) || 1;
  const horaInicial = parseInt(startTd.dataset.hora, 10);
  const diaIndex = parseInt(startTd.dataset.dia, 10);

  const linhas = Array.from(plannerBody.querySelectorAll('tr'));
  for (let offset = 0; offset < duracao; offset++) {
    const horaAlvo = horaInicial + offset;
    const linha = linhas.find(tr => tr.children[0].textContent.trim().startsWith(`${horaAlvo}:`));
    if (!linha) {
      alert(`Sem espaço para completar ${duracao}h — falta horário a partir de ${horaAlvo}:00.`);
      break;
    }
    const celula = linha.children[diaIndex + 1];
    if (!celula) continue;
    celula.textContent = proc.nome;
    celula.classList.add('reservado');
  }

  salvarPlanner(false);
}

// salva planner da semana atual
function salvarPlanner(showAlert = true) {
  const semanaKey = getSemanaKey(inicioSemana);
  const trs = Array.from(plannerBody.querySelectorAll('tr'));
  const dados = [];

  trs.forEach(tr => {
    const hora = tr.children[0].textContent.trim();
    for (let d = 0; d < 7; d++) {
      const celula = tr.children[d + 1];
      const texto = celula.textContent.trim();
      if (texto !== '') {
        dados.push({ dia: dias[d], hora, conteudo: texto });
      }
    }
  });

  let agendas = JSON.parse(localStorage.getItem('plannerSemanas')) || {};
  agendas[semanaKey] = dados;
  localStorage.setItem('plannerSemanas', JSON.stringify(agendas));

  if (showAlert) alert('Agenda salva com sucesso!');
  showToast('Agenda salva ✔');
}

// carrega planner da semana atual
function carregarPlanner() {
  const semanaKey = getSemanaKey(inicioSemana);
  const agendas = JSON.parse(localStorage.getItem('plannerSemanas')) || {};
  const dados = agendas[semanaKey] || [];

  document.querySelectorAll('#plannerBody td[contenteditable="true"]').forEach(td => {
    td.textContent = '';
    td.classList.remove('reservado');
  });

  dados.forEach(item => {
    const trs = Array.from(plannerBody.querySelectorAll('tr'));
    const tr = trs.find(t => t.children[0].textContent.trim() === item.hora);
    if (!tr) return;
    const idx = dias.indexOf(item.dia);
    if (idx < 0) return;
    const celula = tr.children[idx + 1];
    if (celula) {
      celula.textContent = item.conteudo;
      celula.classList.add('reservado');
    }
  });
}

// inicialização
criarTabela();
carregarPlanner();

window.addEventListener('beforeunload', () => salvarPlanner(false));

// filtros
dias.forEach(dia => {
  const opt = document.createElement("option");
  opt.value = dia;
  opt.textContent = dia;
  filtroDia.appendChild(opt);
});
horas.forEach(h => {
  const opt = document.createElement("option");
  opt.value = h;
  opt.textContent = h;
  filtroHora.appendChild(opt);
});

document.getElementById("btnFiltrar").addEventListener("click", () => {
  const diaSel = filtroDia.value;
  const horaSel = filtroHora.value;

  document.querySelectorAll("#plannerBody tr").forEach(row => {
    const horaLinha = row.children[0].textContent.replace(":00", "").trim();
    const exibirLinha = !horaSel || horaLinha === horaSel;
    row.style.display = exibirLinha ? "" : "none";

    row.querySelectorAll("td[contenteditable='true']").forEach(td => {
      const diaCelula = dias[parseInt(td.dataset.dia, 10)];
      const exibirCelula = !diaSel || diaCelula === diaSel;
      td.style.display = exibirCelula ? "" : "none";
    });
  });
});

document.getElementById("btnMostrarTudo").addEventListener("click", () => {
  filtroDia.value = "";
  filtroHora.value = "";
  document.querySelectorAll("#plannerBody tr").forEach(row => {
    row.style.display = "";
    row.querySelectorAll("td").forEach(td => td.style.display = "");
  });
});

// ---------- Controle de temas ----------
const btnTema = document.getElementById("btnTema");
const themeOptions = document.getElementById("themeOptions");

btnTema.addEventListener("click", () => {
  themeOptions.style.display =
    themeOptions.style.display === "block" ? "none" : "block";
});

document.querySelectorAll(".theme-options button").forEach(btn => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;
    aplicarTema(theme);
    localStorage.setItem("temaAtivo", theme);
    themeOptions.style.display = "none";
  });
});

function aplicarTema(theme) {
  document.body.className = "";
  document.body.classList.add("tema-" + theme);
}

const temaSalvo = localStorage.getItem("temaAtivo");
if (temaSalvo) aplicarTema(temaSalvo);
