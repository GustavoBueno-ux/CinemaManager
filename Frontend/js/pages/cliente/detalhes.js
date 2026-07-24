// =========================
// ELEMENTOS
// =========================

const nomeUsuario = document.getElementById("nomeUsuario");

const usuarioBtn = document.getElementById("usuarioBtn");

const menuUsuario = document.getElementById("menuUsuario");

const logoutBtn = document.getElementById("logoutBtn");

const posterFilme = document.getElementById("posterFilme");

const tituloFilme = document.getElementById("tituloFilme");

const generoFilme = document.getElementById("generoFilme");

const duracaoFilme = document.getElementById("duracaoFilme");

const classificacaoFilme = document.getElementById("classificacaoFilme");

const listaSessoes = document.getElementById("listaSessoes");

// =========================
// VARIÁVEIS
// =========================

const parametros = new URLSearchParams(window.location.search);

const filmeId = Number(parametros.get("id"));

let filme = null;

let sessoes = [];

// =========================
// LOGIN
// =========================

function verificarLogin() {

    const token = localStorage.getItem("token");

    const usuario = localStorage.getItem("usuario");

    if (!token || !usuario) {

        window.location.href = "../../index.html";

        return null;

    }

    return JSON.parse(usuario);

}

// =========================
// CARREGAR USUÁRIO
// =========================

function carregarUsuario() {

    const usuario = verificarLogin();

    if (!usuario)
        return;

    nomeUsuario.textContent = usuario.nome;

}

// =========================
// MENU USUÁRIO
// =========================

function configurarMenuUsuario() {

    usuarioBtn.addEventListener("click", function (event) {

        event.stopPropagation();

        menuUsuario.classList.toggle("ativo");

    });

    document.addEventListener("click", function () {

        menuUsuario.classList.remove("ativo");

    });

    menuUsuario.addEventListener("click", function (event) {

        event.stopPropagation();

    });

}

// =========================
// LOGOUT
// =========================

function configurarLogout() {

    logoutBtn.addEventListener("click", function () {

        localStorage.removeItem("token");

        localStorage.removeItem("usuario");

        window.location.href = "../../index.html";

    });

}

// =========================
// CARREGAR FILME
// =========================

async function carregarFilme() {

    const resposta = await apiRequest(`/Filme/${filmeId}`);

    if (!resposta.ok) {

        console.error("Erro ao carregar filme.");

        return;

    }

    filme = resposta.data;

    mostrarFilme();

}

// =========================
// MOSTRAR FILME
// =========================

function mostrarFilme() {

    tituloFilme.textContent = filme.titulo;

    generoFilme.textContent = filme.genero;

    duracaoFilme.textContent = `${filme.duracaoMinutos} minutos`;

    classificacaoFilme.textContent = obterClassificacao(filme.classificacao);

    //posterFilme.src = filme.posterUrl;
    posterFilme.src = "../../assets/posters/layout tela matricula desenho.jpeg";

}

// =========================
// OBTER CLASSIFICAÇÃO
// =========================

function obterClassificacao(numero) {

    switch(numero) {

        case 0:
            return "Livre";

        case 1:
            return "10 anos";

        case 2:
            return "12 anos";

        case 3:
            return "14 anos";

        case 4:
            return "16 anos";

        case 5:
            return "18 anos";

        default:
            return "Não informada";

    }

}

// =========================
// CARREGAR SESSÕES
// =========================

async function carregarSessoes() {

    const resposta = await apiRequest("/Sessao/filme/" + filmeId);

    if (!resposta.ok) {

        console.error("Erro ao carregar sessões.");

        return;

    }

    sessoes = resposta.data.filter(sessao =>

        sessao.filmeId === filmeId

    );

    mostrarSessoes();

}

// =========================
// MOSTRAR SESSÕES
// =========================

function mostrarSessoes() {

    listaSessoes.innerHTML = "";

    if (sessoes.length === 0) {

        listaSessoes.innerHTML = `

            <p class="mensagem-vazia">

                Nenhuma sessão disponível para este filme.

            </p>

        `;

        return;

    }

    sessoes.forEach(sessao => {

        const dataHora = new Date(sessao.dataHora);

        const data = dataHora.toLocaleDateString("pt-BR");

        const horario = dataHora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const card = document.createElement("div");

        card.classList.add("sessao-card");

        card.innerHTML = `

            <div class="sessao-info">

                <div>

                    <p class="data-sessao">

                        ${data}

                    </p>

                    <p class="horario-sessao">

                        ${horario}

                    </p>

                </div>

            </div>

            <button>

                Comprar ingresso

            </button>

        `;

        const botao = card.querySelector("button");

        botao.addEventListener("click", function () {

            window.location.href =
                `assentos.html?sessaoId=${sessao.id}`;

        });

        listaSessoes.appendChild(card);

    });

}

// =========================
// INICIALIZAÇÃO
// =========================

function inicializarPagina() {

    carregarUsuario();

    configurarMenuUsuario();

    configurarLogout();

    carregarFilme();

    carregarSessoes();

}

inicializarPagina();