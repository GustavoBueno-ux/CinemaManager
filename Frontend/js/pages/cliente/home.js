const nomeUsuario = document.getElementById("nomeUsuario");
const usuarioBtn = document.getElementById("usuarioBtn");
const menuUsuario = document.getElementById("menuUsuario");
const logoutBtn = document.getElementById("logoutBtn");
const usuarioContainer = document.getElementById("usuarioContainer");
const listaFilmes = document.getElementById("listaFilmes");
const listaDatas = document.getElementById("listaDatas");
const listaSessoes = document.getElementById("listaSessoes");

let sessoes = [];
let filmes = [];

function obterUsuarioLogado() {
    const token = localStorage.getItem("token");
    const usuarioSalvo = localStorage.getItem("usuario");

    if (!token || !usuarioSalvo) return null;

    try { return JSON.parse(usuarioSalvo); }
    catch {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        return null;
    }
}

function carregarUsuario() {
    const usuario = obterUsuarioLogado();
    usuarioContainer.classList.toggle("logado", Boolean(usuario));
    usuarioContainer.classList.toggle("deslogado", !usuario);

    if (usuario) nomeUsuario.textContent = usuario.nome || "Minha conta";
}

function configurarMenuUsuario() {
    usuarioBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const ativo = menuUsuario.classList.toggle("ativo");
        usuarioBtn.setAttribute("aria-expanded", String(ativo));
    });

    document.addEventListener("click", () => {
        menuUsuario.classList.remove("ativo");
        usuarioBtn.setAttribute("aria-expanded", "false");
    });

    menuUsuario.addEventListener("click", (event) => event.stopPropagation());
}

function configurarLogout() {
    logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "../../index.html";
    });
}

function mostrarEstado(container, titulo, detalhe) {
    container.innerHTML = `<div class="estado-pagina"><strong>${titulo}</strong><p>${detalhe}</p></div>`;
}

function exigirLogin(destino) {
    if (obterUsuarioLogado()) {
        window.location.href = destino;
        return;
    }

    window.location.href = "../../index.html";
}

async function carregarFilmes() {
    const resposta = await apiRequest("/Filme/ativos");

    if (!resposta.ok) {
        mostrarEstado(listaFilmes, "Não foi possível carregar os filmes", resposta.status === 0 ? "Verifique sua conexão e tente novamente mais tarde." : "Atualize a página para tentar novamente.");
        return;
    }

    filmes = Array.isArray(resposta.data) ? resposta.data : [];
    mostrarFilmes();
}

function mostrarFilmes() {
    listaFilmes.innerHTML = "";

    if (!filmes.length) {
        mostrarEstado(listaFilmes, "Nenhum filme em cartaz", "Em breve teremos novidades na programação.");
        return;
    }

    filmes.forEach((filme) => {
        const card = document.createElement("article");
        card.className = "filme-card";
        card.innerHTML = `
            <img src="${filme.posterUrl}" alt="Poster do filme ${filme.titulo}">
            <h3 title="${filme.titulo}">${filme.titulo}</h3>
            <p>${filme.genero || "Em cartaz"}</p>
            <button type="button">Ver detalhes</button>`;
        card.addEventListener("click", () => { window.location.href = `detalhes.html?id=${filme.id}`; });
        listaFilmes.appendChild(card);
    });
}

async function carregarSessoes() {
    const resposta = await apiRequest("/Sessao/ativas");

    if (!resposta.ok) {
        mostrarEstado(listaSessoes, "Não foi possível carregar as sessões", resposta.status === 0 ? "O servidor está indisponível no momento." : "Atualize a página para tentar novamente.");
        return;
    }

    sessoes = Array.isArray(resposta.data) ? resposta.data : [];
    criarDatas();
}

function criarDatas() {
    listaDatas.innerHTML = "";
    const datas = [...new Set(sessoes.map((sessao) => sessao.dataHora.split("T")[0]))];

    if (!datas.length) {
        listaDatas.innerHTML = "<span class=\"sem-datas\">Nenhuma data disponível</span>";
        mostrarEstado(listaSessoes, "Nenhuma sessão encontrada", "Consulte a programação novamente em breve.");
        return;
    }

    datas.forEach((data, index) => {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = `botao-data${index === 0 ? " ativa" : ""}`;
        botao.textContent = formatarData(data);
        botao.addEventListener("click", () => {
            document.querySelectorAll(".botao-data").forEach((item) => item.classList.remove("ativa"));
            botao.classList.add("ativa");
            mostrarSessoesDaData(data);
        });
        listaDatas.appendChild(botao);
    });

    mostrarSessoesDaData(datas[0]);
}

function mostrarSessoesDaData(data) {
    listaSessoes.innerHTML = "";
    const sessoesDoDia = sessoes.filter((sessao) => sessao.dataHora.startsWith(data));

    if (!sessoesDoDia.length) {
        mostrarEstado(listaSessoes, "Nenhuma sessão nesta data", "Escolha outra data para ver a programação.");
        return;
    }

    sessoesDoDia.forEach((sessao) => {
        const horario = new Date(sessao.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const card = document.createElement("article");
        card.className = "sessao-card";
        card.innerHTML = `<h3>${sessao.tituloFilme}</h3><p class="horario">${horario}</p><button type="button">Comprar ingresso</button>`;
        card.querySelector("button").addEventListener("click", () => exigirLogin(`assentos.html?sessaoId=${sessao.id}`));
        listaSessoes.appendChild(card);
    });
}

function formatarData(data) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}`;
}

function inicializarPagina() {
    carregarUsuario();
    configurarMenuUsuario();
    configurarLogout();
    carregarFilmes();
    carregarSessoes();
}

inicializarPagina();
