const SESSOES_ENDPOINT = "/Sessao";
const FILMES_ENDPOINT = "/Filme";
const MAX_DIGITOS_PRECO = 10;

const elementos = {
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebar-overlay"),
    sidebarOpenButton: document.getElementById("sidebar-open-button"),
    sidebarCloseButton: document.getElementById("sidebar-close-button"),
    logoutButton: document.getElementById("logout-button"),
    sidebarUserAvatar: document.getElementById("sidebar-user-avatar"),
    sidebarUserName: document.getElementById("sidebar-user-name"),

    form: document.getElementById("new-session-form"),

    movieSearch: document.getElementById("session-movie-search"),
    movieId: document.getElementById("session-movie"),
    movieResults: document.getElementById("session-movie-results"),

    sessionDate: document.getElementById("session-date"),
    sessionTime: document.getElementById("session-time"),
    sessionPrice: document.getElementById("session-price"),

    sessionSummary: document.getElementById("session-summary"),
    sessionSummaryMovie: document.getElementById("session-summary-movie"),
    sessionSummaryDate: document.getElementById("session-summary-date"),
    sessionSummaryTime: document.getElementById("session-summary-time"),
    sessionSummaryPrice: document.getElementById("session-summary-price"),

    error: document.getElementById("new-session-error"),
    saveButton: document.getElementById("save-session-button")
};

const estado = {
    filmes: [],
    filmeSelecionado: null,
    salvando: false
};

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", iniciarPagina);

function iniciarPagina() {
    const usuario = obterUsuarioAutenticado();

    if (!usuario) {
        redirecionarParaLogin();
        return;
    }

    if (usuario.tipoUsuario !== "Funcionario") {
        redirecionarParaHomeCliente();
        return;
    }

    configurarFuncionario(usuario);
    configurarEventos();
    configurarDataMinima();
    carregarFilmes();
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function obterUsuarioAutenticado() {
    const token = localStorage.getItem("token");
    const usuarioArmazenado = localStorage.getItem("usuario");

    if (!token || !usuarioArmazenado) {
        return null;
    }

    try {
        const usuario = JSON.parse(usuarioArmazenado);

        return usuario?.nome && usuario?.tipoUsuario
            ? usuario
            : null;
    } catch (erro) {
        console.error("Erro ao ler usuário:", erro);
        return null;
    }
}

function configurarFuncionario(usuario) {
    const nome = usuario.nome.trim();

    if (elementos.sidebarUserName) {
        elementos.sidebarUserName.textContent = nome;
    }

    if (elementos.sidebarUserAvatar) {
        elementos.sidebarUserAvatar.textContent =
            nome.charAt(0).toUpperCase();
    }
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    elementos.sidebarOpenButton?.addEventListener("click", abrirSidebar);
    elementos.sidebarCloseButton?.addEventListener("click", fecharSidebar);
    elementos.sidebarOverlay?.addEventListener("click", fecharSidebar);
    elementos.logoutButton?.addEventListener("click", fazerLogout);

    elementos.movieSearch?.addEventListener(
        "input",
        pesquisarFilmes
    );

    elementos.movieSearch?.addEventListener(
        "focus",
        mostrarSugestoesFilmes
    );

    elementos.movieSearch?.addEventListener(
        "keydown",
        controlarTecladoPesquisa
    );

    elementos.sessionDate?.addEventListener(
        "change",
        atualizarResumo
    );

    elementos.sessionTime?.addEventListener(
        "change",
        atualizarResumo
    );

    elementos.sessionPrice?.addEventListener(
        "input",
        formatarCampoPreco
    );

    elementos.sessionPrice?.addEventListener(
        "focus",
        posicionarCursorPrecoNoFinal
    );

    elementos.sessionPrice?.addEventListener(
        "click",
        posicionarCursorPrecoNoFinal
    );

    elementos.form?.addEventListener(
        "submit",
        cadastrarSessao
    );

    document.addEventListener("click", evento => {
        const container =
            elementos.movieSearch?.closest(
                ".movie-search-container"
            );

        if (
            container &&
            !container.contains(evento.target)
        ) {
            fecharResultadosFilmes();
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape") {
            return;
        }

        if (
            elementos.movieResults &&
            !elementos.movieResults.classList.contains("hidden")
        ) {
            fecharResultadosFilmes();
            return;
        }

        fecharSidebar();
    });
}

/* =========================================================
   SIDEBAR
========================================================= */

function abrirSidebar() {
    elementos.sidebar?.classList.add("open");
    elementos.sidebarOverlay?.classList.add("visible");

    elementos.sidebarOpenButton?.setAttribute(
        "aria-expanded",
        "true"
    );

    document.body.classList.add("sidebar-open");
}

function fecharSidebar() {
    elementos.sidebar?.classList.remove("open");
    elementos.sidebarOverlay?.classList.remove("visible");

    elementos.sidebarOpenButton?.setAttribute(
        "aria-expanded",
        "false"
    );

    document.body.classList.remove("sidebar-open");
}

function fazerLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    redirecionarParaLogin();
}

/* =========================================================
   CARREGAR FILMES
========================================================= */

async function carregarFilmes() {
    try {
        const resposta =
            await apiRequest(FILMES_ENDPOINT);

        if (!resposta.ok) {
            tratarErroCarregamentoFilmes(resposta);
            return;
        }

        if (!Array.isArray(resposta.data)) {
            throw new Error(
                "A API retornou uma lista de filmes inválida."
            );
        }

        estado.filmes = resposta.data;
    } catch (erro) {
        console.error(
            "Erro ao carregar filmes:",
            erro
        );

        exibirErro(
            "Não foi possível se comunicar com o servidor."
        );
    }
}

function tratarErroCarregamentoFilmes(resposta) {
    if (resposta.status === 401) {
        fazerLogout();
        return;
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();
        return;
    }

    exibirErro(
        "Não foi possível carregar os filmes."
    );
}

/* =========================================================
   PESQUISA DE FILMES
========================================================= */

function pesquisarFilmes() {
    const pesquisa = elementos.movieSearch.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    limparFilmeSelecionado(false);

    const filmesEncontrados =
        obterFilmesFiltrados(pesquisa);

    renderizarResultadosFilmes(
        filmesEncontrados
    );

    atualizarResumo();
}

function mostrarSugestoesFilmes() {
    const pesquisa = elementos.movieSearch.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const filmesEncontrados =
        obterFilmesFiltrados(pesquisa);

    renderizarResultadosFilmes(
        filmesEncontrados
    );
}

function obterFilmesFiltrados(pesquisa) {
    return [...estado.filmes]
        .filter(filme => {
            const titulo =
                String(filme.titulo || "")
                    .toLocaleLowerCase("pt-BR");

            return (
                !pesquisa ||
                titulo.includes(pesquisa)
            );
        })
        .sort((a, b) =>
            String(a.titulo || "")
                .localeCompare(
                    String(b.titulo || ""),
                    "pt-BR"
                )
        );
}

function renderizarResultadosFilmes(filmes) {
    elementos.movieResults.replaceChildren();

    if (!filmes.length) {
        const mensagem =
            document.createElement("div");

        mensagem.className =
            "movie-search-empty";

        mensagem.textContent =
            "Nenhum filme encontrado.";

        elementos.movieResults.append(
            mensagem
        );

        elementos.movieResults.classList.remove(
            "hidden"
        );

        return;
    }

    const fragmento =
        document.createDocumentFragment();

    filmes.forEach(filme => {
        const botao =
            document.createElement("button");

        botao.type = "button";
        botao.className =
            "movie-search-result";

        botao.textContent =
            filme.titulo;

        botao.addEventListener(
            "click",
            () => selecionarFilme(filme)
        );

        fragmento.append(botao);
    });

    elementos.movieResults.append(
        fragmento
    );

    elementos.movieResults.classList.remove(
        "hidden"
    );
}

function selecionarFilme(filme) {
    estado.filmeSelecionado = filme;

    elementos.movieId.value = filme.id;
    elementos.movieSearch.value = filme.titulo;

    fecharResultadosFilmes();
    esconderErro();
    atualizarResumo();
}

function limparFilmeSelecionado(
    limparTexto = true
) {
    estado.filmeSelecionado = null;
    elementos.movieId.value = "";

    if (limparTexto) {
        elementos.movieSearch.value = "";
    }
}

function fecharResultadosFilmes() {
    elementos.movieResults?.classList.add(
        "hidden"
    );
}

function controlarTecladoPesquisa(evento) {
    if (evento.key === "Escape") {
        fecharResultadosFilmes();
    }
}

/* =========================================================
   DATA
========================================================= */

function configurarDataMinima() {
    elementos.sessionDate.min =
        obterDataHojeISO();
}

function obterDataHojeISO() {
    const hoje = new Date();

    const ano =
        hoje.getFullYear();

    const mes =
        String(
            hoje.getMonth() + 1
        ).padStart(2, "0");

    const dia =
        String(
            hoje.getDate()
        ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

/* =========================================================
   PREÇO
========================================================= */

function formatarCampoPreco() {
    if (!elementos.sessionPrice) {
        return;
    }

    const digitos =
        elementos.sessionPrice.value
            .replace(/\D/g, "")
            .slice(0, MAX_DIGITOS_PRECO);

    if (!digitos) {
        elementos.sessionPrice.value = "";
        atualizarResumo();
        return;
    }

    const centavos = Number(digitos);
    const valor = centavos / 100;

    elementos.sessionPrice.value =
        formatarMoeda(valor);

    posicionarCursorPrecoNoFinal();
    atualizarResumo();
}

function posicionarCursorPrecoNoFinal() {
    if (
        !elementos.sessionPrice ||
        document.activeElement !== elementos.sessionPrice
    ) {
        return;
    }

    requestAnimationFrame(() => {
        const tamanho =
            elementos.sessionPrice.value.length;

        elementos.sessionPrice.setSelectionRange(
            tamanho,
            tamanho
        );
    });
}

function obterPrecoInformado() {
    if (!elementos.sessionPrice) {
        return null;
    }

    const digitos =
        elementos.sessionPrice.value
            .replace(/\D/g, "");

    if (!digitos) {
        return null;
    }

    const centavos =
        Number(digitos);

    if (
        !Number.isFinite(centavos) ||
        centavos <= 0
    ) {
        return centavos === 0
            ? 0
            : null;
    }

    return centavos / 100;
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );
}

/* =========================================================
   RESUMO
========================================================= */

function atualizarResumo() {
    const filme =
        estado.filmeSelecionado;

    const data =
        elementos.sessionDate.value;

    const horario =
        elementos.sessionTime.value;

    const preco =
        obterPrecoInformado();

    const possuiPreco =
        preco !== null;

    if (
        !filme &&
        !data &&
        !horario &&
        !possuiPreco
    ) {
        elementos.sessionSummary.classList.add(
            "hidden"
        );

        return;
    }

    elementos.sessionSummary.classList.remove(
        "hidden"
    );

    elementos.sessionSummaryMovie.textContent =
        filme?.titulo || "--";

    elementos.sessionSummaryDate.textContent =
        data
            ? formatarDataFormulario(data)
            : "--/--/----";

    elementos.sessionSummaryTime.textContent =
        horario || "--:--";

    elementos.sessionSummaryPrice.textContent =
        preco !== null && preco > 0
            ? formatarMoeda(preco)
            : "R$ --,--";
}

function formatarDataFormulario(data) {
    const partes =
        data.split("-");

    if (partes.length !== 3) {
        return "--/--/----";
    }

    return (
        `${partes[2]}/` +
        `${partes[1]}/` +
        `${partes[0]}`
    );
}

/* =========================================================
   CADASTRO
========================================================= */

async function cadastrarSessao(evento) {
    evento.preventDefault();

    if (estado.salvando) {
        return;
    }

    esconderErro();

    const filmeId =
        Number(elementos.movieId.value);

    const data =
        elementos.sessionDate.value;

    const horario =
        elementos.sessionTime.value;

    const precoIngresso =
        obterPrecoInformado();

    if (
        !filmeId ||
        !data ||
        !horario ||
        precoIngresso === null
    ) {
        exibirErro(
            "Preencha todos os campos e selecione um filme válido."
        );

        return;
    }

    if (precoIngresso <= 0) {
        exibirErro(
            "O preço do ingresso deve ser maior que zero."
        );

        return;
    }

    const filmeExiste =
        estado.filmes.some(
            filme =>
                Number(filme.id) === filmeId
        );

    if (!filmeExiste) {
        exibirErro(
            "Selecione um filme válido."
        );

        return;
    }

    const dataHora =
        criarDataHora(data, horario);

    if (!dataHora) {
        exibirErro(
            "Informe uma data e um horário válidos."
        );

        return;
    }

    if (dataHora <= new Date()) {
        exibirErro(
            "A sessão deve ocorrer em uma data futura."
        );

        return;
    }

    definirEstadoSalvamento(true);

    try {
        await enviarCadastroSessao({
            filmeId,

            dataHora:
                formatarDataHoraParaApi(
                    data,
                    horario
                ),

            precoIngresso
        });

        window.location.href =
            "sessoes.html";

    } catch (erro) {
        console.error(
            "Erro ao cadastrar sessão:",
            erro
        );

        exibirErro(
            erro.message ||
            "Não foi possível cadastrar a sessão."
        );
    } finally {
        definirEstadoSalvamento(false);
    }
}

/* =========================================================
   POST
========================================================= */

async function enviarCadastroSessao(sessao) {
    const token =
        localStorage.getItem("token");

    if (!token) {
        fazerLogout();

        throw new Error(
            "Sua sessão expirou."
        );
    }

    let resposta;

    try {
        resposta = await fetch(
            `${API_URL}${SESSOES_ENDPOINT}`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`
                },

                body: JSON.stringify(
                    sessao
                )
            }
        );

    } catch {
        throw new Error(
            "Não foi possível se comunicar com o servidor."
        );
    }

    if (resposta.status === 401) {
        fazerLogout();

        throw new Error(
            "Sua sessão expirou."
        );
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();

        throw new Error(
            "Você não possui permissão para cadastrar sessões."
        );
    }

    if (!resposta.ok) {
        const mensagem =
            await tentarLerMensagemErro(
                resposta
            );

        throw new Error(
            mensagem ||
            "Não foi possível cadastrar a sessão."
        );
    }

    return resposta;
}

/* =========================================================
   ERROS DA API
========================================================= */

async function tentarLerMensagemErro(resposta) {
    if (resposta.status >= 500) {
        return "Ocorreu um erro interno no servidor. Tente novamente.";
    }

    let texto;

    try {
        texto =
            await resposta.text();
    } catch {
        return null;
    }

    if (!texto) {
        return null;
    }

    try {
        const dados =
            JSON.parse(texto);

        if (
            dados?.errors &&
            typeof dados.errors === "object"
        ) {
            const mensagens =
                Object.values(dados.errors)
                    .flat()
                    .filter(Boolean);

            return mensagens.length
                ? mensagens.join(" ")
                : null;
        }

        return (
            dados?.mensagem ||
            dados?.message ||
            dados?.title ||
            null
        );

    } catch {
        if (
            texto.length > 300 ||
            texto.includes("System.") ||
            texto.includes("Exception")
        ) {
            return "Não foi possível cadastrar a sessão.";
        }

        return texto;
    }
}

/* =========================================================
   ERRO DO FORMULÁRIO
========================================================= */

function exibirErro(mensagem) {
    elementos.error.textContent =
        mensagem;

    elementos.error.classList.remove(
        "hidden"
    );
}

function esconderErro() {
    elementos.error.classList.add(
        "hidden"
    );
}

/* =========================================================
   SALVAMENTO
========================================================= */

function definirEstadoSalvamento(salvando) {
    estado.salvando =
        salvando;

    elementos.saveButton.disabled =
        salvando;

    elementos.movieSearch.disabled =
        salvando;

    elementos.sessionDate.disabled =
        salvando;

    elementos.sessionTime.disabled =
        salvando;

    elementos.sessionPrice.disabled =
        salvando;

    elementos.saveButton.textContent =
        salvando
            ? "Cadastrando..."
            : "Cadastrar sessão";

    if (salvando) {
        fecharResultadosFilmes();
    }
}

/* =========================================================
   DATA E HORÁRIO
========================================================= */

function criarDataHora(data, horario) {
    const valor =
        new Date(
            `${data}T${horario}:00`
        );

    return Number.isNaN(
        valor.getTime()
    )
        ? null
        : valor;
}

function formatarDataHoraParaApi(
    data,
    horario
) {
    return `${data}T${horario}:00`;
}

/* =========================================================
   REDIRECIONAMENTOS
========================================================= */

function redirecionarParaLogin() {
    window.location.replace(
        "../../index.html"
    );
}

function redirecionarParaHomeCliente() {
    window.location.replace(
        "../public/home.html"
    );
}