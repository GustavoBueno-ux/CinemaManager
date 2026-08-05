const SESSOES_ENDPOINT = "/Sessao";
const FILMES_ENDPOINT = "/Filme";

const elementos = {
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebar-overlay"),
    sidebarOpenButton: document.getElementById("sidebar-open-button"),
    sidebarCloseButton: document.getElementById("sidebar-close-button"),
    logoutButton: document.getElementById("logout-button"),
    sidebarUserAvatar: document.getElementById("sidebar-user-avatar"),
    sidebarUserName: document.getElementById("sidebar-user-name"),

    sessionSearch: document.getElementById("session-search"),
    sessionStatusButtons: document.querySelectorAll(".session-status-button"),
    sessionDate: document.getElementById("session-date"),
    clearDateButton: document.getElementById("clear-date-button"),
    clearFiltersButton: document.getElementById("clear-filters-button"),

    sessionsResultsCount: document.getElementById("sessions-results-count"),
    sessionsLoading: document.getElementById("sessions-loading"),
    sessionsError: document.getElementById("sessions-error"),
    sessionsErrorMessage: document.getElementById("sessions-error-message"),
    sessionsRetryButton: document.getElementById("sessions-retry-button"),

    sessionsListSection: document.getElementById("sessions-list-section"),
    sessionsList: document.getElementById("sessions-list"),
    sessionsEmptyState: document.getElementById("sessions-empty-state"),
    sessionCardTemplate: document.getElementById("session-card-template"),

    editSessionModal: document.getElementById("edit-session-modal"),
    editSessionCloseButton: document.getElementById("edit-session-close-button"),
    editSessionCancelButton: document.getElementById("edit-session-cancel-button"),
    editSessionForm: document.getElementById("edit-session-form"),

    editSessionId: document.getElementById("edit-session-id"),

    editSessionMovie: document.getElementById("edit-session-movie"),
    editSessionMovieSearch: document.getElementById("edit-session-movie-search"),
    editSessionMovieResults: document.getElementById("edit-session-movie-results"),

    editSessionDate: document.getElementById("edit-session-date"),
    editSessionTime: document.getElementById("edit-session-time"),

    editSessionWarning: document.getElementById("edit-session-warning"),
    editSessionError: document.getElementById("edit-session-error"),
    editSessionSaveButton: document.getElementById("edit-session-save-button")
};

const estado = {
    sessoes: [],
    filmes: [],
    filtroStatus: "todas",
    sessaoEmEdicao: null,
    salvandoEdicao: false
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
    carregarDados();
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function obterUsuarioAutenticado() {
    const token = localStorage.getItem("token");
    const usuarioArmazenado = localStorage.getItem("usuario");

    if (!token || !usuarioArmazenado) return null;

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

    elementos.sessionsRetryButton?.addEventListener("click", carregarDados);
    elementos.sessionSearch?.addEventListener("input", aplicarFiltros);

    elementos.sessionDate?.addEventListener("change", () => {
        atualizarBotaoLimparData();
        aplicarFiltros();
    });

    elementos.clearDateButton?.addEventListener("click", limparData);
    elementos.clearFiltersButton?.addEventListener("click", limparFiltros);

    elementos.sessionStatusButtons.forEach(botao => {
        botao.addEventListener("click", () => selecionarFiltroStatus(botao));
    });

    elementos.editSessionCloseButton?.addEventListener(
        "click",
        fecharModalEdicao
    );

    elementos.editSessionCancelButton?.addEventListener(
        "click",
        fecharModalEdicao
    );

    elementos.editSessionForm?.addEventListener(
        "submit",
        salvarEdicao
    );

    elementos.editSessionMovieSearch?.addEventListener(
        "input",
        pesquisarFilmesModal
    );

    elementos.editSessionMovieSearch?.addEventListener(
        "focus",
        mostrarSugestoesFilmes
    );

    elementos.editSessionMovieSearch?.addEventListener(
        "keydown",
        controlarTecladoPesquisaFilme
    );

    elementos.editSessionModal?.addEventListener("click", evento => {
        if (evento.target === elementos.editSessionModal) {
            fecharModalEdicao();
        }
    });

    document.addEventListener("click", evento => {
        const container =
            elementos.editSessionMovieSearch?.closest(
                ".movie-search-container"
            );

        if (container && !container.contains(evento.target)) {
            fecharResultadosFilmes();
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape") return;

        if (
            elementos.editSessionMovieResults &&
            !elementos.editSessionMovieResults.classList.contains("hidden")
        ) {
            fecharResultadosFilmes();
            return;
        }

        if (!elementos.editSessionModal.classList.contains("hidden")) {
            fecharModalEdicao();
        } else {
            fecharSidebar();
        }
    });
}

/* =========================================================
   SIDEBAR
========================================================= */

function abrirSidebar() {
    elementos.sidebar?.classList.add("open");
    elementos.sidebarOverlay?.classList.add("visible");
    elementos.sidebarOpenButton?.setAttribute("aria-expanded", "true");

    document.body.classList.add("sidebar-open");
}

function fecharSidebar() {
    elementos.sidebar?.classList.remove("open");
    elementos.sidebarOverlay?.classList.remove("visible");
    elementos.sidebarOpenButton?.setAttribute("aria-expanded", "false");

    document.body.classList.remove("sidebar-open");
}

function fazerLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    redirecionarParaLogin();
}

/* =========================================================
   CARREGAMENTO
========================================================= */

async function carregarDados() {
    prepararCarregamento();

    try {
        const [respostaSessoes, respostaFilmes] = await Promise.all([
            apiRequest(SESSOES_ENDPOINT),
            apiRequest(FILMES_ENDPOINT)
        ]);

        if (!respostaSessoes.ok) {
            tratarErroCarregamento(respostaSessoes);
            return;
        }

        if (!respostaFilmes.ok) {
            tratarErroCarregamento(respostaFilmes);
            return;
        }

        if (
            !Array.isArray(respostaSessoes.data) ||
            !Array.isArray(respostaFilmes.data)
        ) {
            throw new Error("A API retornou dados inválidos.");
        }

        estado.sessoes = respostaSessoes.data;
        estado.filmes = respostaFilmes.data;

        aplicarFiltros();
    } catch (erro) {
        console.error("Erro ao carregar sessões:", erro);

        exibirErro(
            "Não foi possível se comunicar com o servidor."
        );
    }
}

function prepararCarregamento() {
    elementos.sessionsLoading.classList.remove("hidden");
    elementos.sessionsError.classList.add("hidden");
    elementos.sessionsListSection.classList.add("hidden");
    elementos.sessionsEmptyState.classList.add("hidden");

    elementos.sessionsList.replaceChildren();

    elementos.sessionsResultsCount.textContent =
        "Carregando sessões...";
}

/* =========================================================
   PESQUISA DE FILME NO MODAL
========================================================= */

function pesquisarFilmesModal() {
    elementos.editSessionMovie.value = "";

    const pesquisa = elementos.editSessionMovieSearch.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const filmesEncontrados = obterFilmesFiltrados(pesquisa);

    renderizarResultadosFilmes(filmesEncontrados);
}

function mostrarSugestoesFilmes() {
    const pesquisa = elementos.editSessionMovieSearch.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const filmesEncontrados = obterFilmesFiltrados(pesquisa);

    renderizarResultadosFilmes(filmesEncontrados);
}

function obterFilmesFiltrados(pesquisa) {
    return [...estado.filmes]
        .filter(filme => {
            const titulo = String(filme.titulo || "")
                .toLocaleLowerCase("pt-BR");

            return !pesquisa || titulo.includes(pesquisa);
        })
        .sort((a, b) =>
            String(a.titulo || "").localeCompare(
                String(b.titulo || ""),
                "pt-BR"
            )
        );
}

function renderizarResultadosFilmes(filmes) {
    elementos.editSessionMovieResults.replaceChildren();

    if (!filmes.length) {
        const mensagem = document.createElement("div");

        mensagem.className = "movie-search-empty";
        mensagem.textContent = "Nenhum filme encontrado.";

        elementos.editSessionMovieResults.append(mensagem);
        elementos.editSessionMovieResults.classList.remove("hidden");

        return;
    }

    const fragmento = document.createDocumentFragment();

    filmes.forEach(filme => {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "movie-search-result";
        botao.textContent = filme.titulo;

        botao.addEventListener("click", () => {
            selecionarFilmeModal(filme);
        });

        fragmento.append(botao);
    });

    elementos.editSessionMovieResults.append(fragmento);
    elementos.editSessionMovieResults.classList.remove("hidden");
}

function selecionarFilmeModal(filme) {
    elementos.editSessionMovie.value = filme.id;
    elementos.editSessionMovieSearch.value = filme.titulo;

    esconderErroEdicao();
    fecharResultadosFilmes();
}

function fecharResultadosFilmes() {
    elementos.editSessionMovieResults?.classList.add("hidden");
}

function controlarTecladoPesquisaFilme(evento) {
    if (evento.key === "Escape") {
        fecharResultadosFilmes();
    }
}

/* =========================================================
   FILTROS
========================================================= */

function selecionarFiltroStatus(botao) {
    if (!botao) return;

    estado.filtroStatus = botao.dataset.status;

    elementos.sessionStatusButtons.forEach(item => {
        item.classList.toggle("active", item === botao);
    });

    aplicarFiltros();
}

function aplicarFiltros() {
    const pesquisa = elementos.sessionSearch.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const dataSelecionada = elementos.sessionDate.value;
    const agora = new Date();

    const sessoesFiltradas = estado.sessoes
        .filter(sessao => {
            const dataHora = new Date(sessao.dataHora);

            const titulo = String(sessao.tituloFilme || "")
                .toLocaleLowerCase("pt-BR");

            const correspondePesquisa =
                !pesquisa ||
                titulo.includes(pesquisa);

            const correspondeData =
                !dataSelecionada ||
                obterDataISO(sessao.dataHora) === dataSelecionada;

            let correspondeStatus = true;

            if (estado.filtroStatus === "futuras") {
                correspondeStatus = dataHora > agora;
            }

            if (estado.filtroStatus === "encerradas") {
                correspondeStatus = dataHora <= agora;
            }

            return (
                correspondePesquisa &&
                correspondeData &&
                correspondeStatus
            );
        });

    ordenarSessoes(sessoesFiltradas);

    renderizarSessoes(sessoesFiltradas);
}

function ordenarSessoes(sessoes) {
    if (estado.filtroStatus === "futuras") {
        sessoes.sort(
            (a, b) =>
                new Date(a.dataHora) -
                new Date(b.dataHora)
        );

        return;
    }

    sessoes.sort(
        (a, b) =>
            new Date(b.dataHora) -
            new Date(a.dataHora)
    );
}

function limparData() {
    elementos.sessionDate.value = "";

    atualizarBotaoLimparData();
    aplicarFiltros();
}

function atualizarBotaoLimparData() {
    elementos.clearDateButton.classList.toggle(
        "hidden",
        !elementos.sessionDate.value
    );
}

function limparFiltros() {
    elementos.sessionSearch.value = "";
    elementos.sessionDate.value = "";

    atualizarBotaoLimparData();

    const botaoTodas = [...elementos.sessionStatusButtons]
        .find(botao => botao.dataset.status === "todas");

    selecionarFiltroStatus(botaoTodas);
}

/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function renderizarSessoes(sessoes) {
    elementos.sessionsLoading.classList.add("hidden");
    elementos.sessionsError.classList.add("hidden");
    elementos.sessionsList.replaceChildren();

    atualizarContadorResultados(sessoes.length);

    elementos.sessionsEmptyState.classList.toggle(
        "hidden",
        sessoes.length !== 0
    );

    elementos.sessionsListSection.classList.toggle(
        "hidden",
        sessoes.length === 0
    );

    if (!sessoes.length) return;

    const fragmento = document.createDocumentFragment();

    sessoes.forEach(sessao => {
        fragmento.append(criarCardSessao(sessao));
    });

    elementos.sessionsList.append(fragmento);
}

function criarCardSessao(sessao) {
    const clone =
        elementos.sessionCardTemplate.content.cloneNode(true);

    const card = clone.querySelector(".session-card");
    const titulo = clone.querySelector(".session-movie-title");
    const data = clone.querySelector(".session-date");
    const horario = clone.querySelector(".session-time");
    const status = clone.querySelector(".session-status");
    const botaoEditar = clone.querySelector(".edit-session-button");
    const botaoComprar = clone.querySelector(".buy-ticket-button");

    const dataHora = new Date(sessao.dataHora);
    const encerrada = dataHora <= new Date();

    const statusSessao = obterStatusSessao(sessao);
    const podeEditar = sessaoPodeSerEditada(sessao);

    card.dataset.sessionId = sessao.id;

    titulo.textContent =
        sessao.tituloFilme || "Filme não informado";

    data.textContent =
        formatarData(sessao.dataHora);

    data.dateTime =
        obterDataISO(sessao.dataHora);

    horario.textContent =
        formatarHorario(sessao.dataHora);

    horario.dateTime =
        sessao.dataHora;

    status.textContent =
        obterTextoStatus(statusSessao);

    status.dataset.status =
        statusSessao;

    configurarBotaoEditar(
        botaoEditar,
        sessao,
        podeEditar
    );

    configurarBotaoComprar(
        botaoComprar,
        sessao,
        encerrada
    );

    return clone;
}

function obterStatusSessao(sessao) {
    if (!sessao.ativa) {
        return "inativa";
    }

    if (new Date(sessao.dataHora) <= new Date()) {
        return "encerrada";
    }

    return "futura";
}

function obterTextoStatus(status) {
    switch (status) {
        case "futura":
            return "Futura";

        case "encerrada":
            return "Encerrada";

        case "inativa":
            return "Inativa";

        default:
            return "Indefinido";
    }
}

/* =========================================================
   REGRAS DOS BOTÕES
========================================================= */

function sessaoPodeSerEditada(sessao) {
    if (!sessao.ativa) {
        return false;
    }

    if (new Date(sessao.dataHora) <= new Date()) {
        return false;
    }

    /*
        Já deixamos compatibilidade para quando o backend
        começar a retornar uma dessas propriedades.
    */

    if (sessao.podeEditar === false) {
        return false;
    }

    if (sessao.possuiIngressosVendidos === true) {
        return false;
    }

    return true;
}

function configurarBotaoEditar(botao, sessao, podeEditar) {
    if (!podeEditar) {
        botao.disabled = true;
        botao.classList.add("disabled");

        if (sessao.possuiIngressosVendidos === true) {
            botao.title =
                "Esta sessão possui ingressos vendidos e não pode ser editada.";
        } else {
            botao.title =
                "Esta sessão não pode mais ser editada.";
        }

        return;
    }

    botao.addEventListener(
        "click",
        () => abrirModalEdicao(sessao.id)
    );
}

function configurarBotaoComprar(botao, sessao, encerrada) {
    if (encerrada || !sessao.ativa) {
        botao.classList.add("disabled");

        botao.setAttribute(
            "aria-disabled",
            "true"
        );

        botao.removeAttribute("href");

        return;
    }

    botao.href =
        `../admin/venda-ingressos.html?sessaoId=${sessao.id}`;
}

/* =========================================================
   CONTADOR
========================================================= */

function atualizarContadorResultados(quantidade) {
    if (quantidade === 0) {
        elementos.sessionsResultsCount.textContent =
            "Nenhuma sessão encontrada";

        return;
    }

    elementos.sessionsResultsCount.textContent =
        quantidade === 1
            ? "1 sessão encontrada"
            : `${quantidade} sessões encontradas`;
}

/* =========================================================
   MODAL DE EDIÇÃO
========================================================= */

function abrirModalEdicao(sessaoId) {
    const sessao = estado.sessoes.find(
        item => item.id === sessaoId
    );

    if (!sessao) return;

    if (!sessaoPodeSerEditada(sessao)) {
        return;
    }

    estado.sessaoEmEdicao = sessao;

    const partes =
        separarDataHora(sessao.dataHora);

    elementos.editSessionId.value =
        sessao.id;

    elementos.editSessionMovie.value =
        sessao.filmeId;

    elementos.editSessionMovieSearch.value =
        sessao.tituloFilme;

    elementos.editSessionDate.value =
        partes.data;

    elementos.editSessionTime.value =
        partes.horario;

    esconderErroEdicao();
    fecharResultadosFilmes();

    elementos.editSessionWarning.classList.add(
        "hidden"
    );

    elementos.editSessionModal.classList.remove(
        "hidden"
    );

    elementos.editSessionModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    elementos.editSessionMovieSearch.focus();
}

function fecharModalEdicao() {
    if (estado.salvandoEdicao) return;

    elementos.editSessionModal.classList.add(
        "hidden"
    );

    elementos.editSessionModal.setAttribute(
        "aria-hidden",
        "true"
    );

    elementos.editSessionForm.reset();

    if (elementos.editSessionMovie) {
        elementos.editSessionMovie.value = "";
    }

    if (elementos.editSessionMovieSearch) {
        elementos.editSessionMovieSearch.value = "";
    }

    fecharResultadosFilmes();

    document.body.classList.remove(
        "modal-open"
    );

    estado.sessaoEmEdicao = null;

    esconderErroEdicao();
}

/* =========================================================
   SALVAR EDIÇÃO
========================================================= */

async function salvarEdicao(evento) {
    evento.preventDefault();

    if (
        estado.salvandoEdicao ||
        !estado.sessaoEmEdicao
    ) {
        return;
    }

    esconderErroEdicao();

    const filmeId =
        Number(elementos.editSessionMovie.value);

    const data =
        elementos.editSessionDate.value;

    const horario =
        elementos.editSessionTime.value;

    if (!filmeId || !data || !horario) {
        exibirErroEdicao(
            "Preencha todos os campos e selecione um filme válido."
        );

        return;
    }

    const filmeExiste =
        estado.filmes.some(
            filme => Number(filme.id) === filmeId
        );

    if (!filmeExiste) {
        exibirErroEdicao(
            "Selecione um filme válido."
        );

        return;
    }

    const dataHora =
        criarDataHora(data, horario);

    if (!dataHora) {
        exibirErroEdicao(
            "Informe uma data e um horário válidos."
        );

        return;
    }

    if (dataHora <= new Date()) {
        exibirErroEdicao(
            "A sessão deve ocorrer em uma data futura."
        );

        return;
    }

    const sessao =
        estado.sessaoEmEdicao;

    const alteracoes = {};

    if (filmeId !== Number(sessao.filmeId)) {
        alteracoes.filmeId =
            filmeId;
    }

    const dataHoraOriginal =
        new Date(sessao.dataHora);

    if (
        dataHora.getTime() !==
        dataHoraOriginal.getTime()
    ) {
        alteracoes.dataHora =
            formatarDataHoraParaApi(
                data,
                horario
            );
    }

    if (!Object.keys(alteracoes).length) {
        fecharModalEdicao();
        return;
    }

    definirEstadoSalvamento(true);

    try {
        await atualizarSessao(
            sessao.id,
            alteracoes
        );

        fecharModalAposSucesso();

        await carregarDados();
    } catch (erro) {
        console.error(
            "Erro ao editar sessão:",
            erro
        );

        exibirErroEdicao(
            erro.message ||
            "Não foi possível atualizar a sessão."
        );
    } finally {
        definirEstadoSalvamento(false);
    }
}

/* =========================================================
   PATCH
========================================================= */

async function atualizarSessao(sessaoId, alteracoes) {
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
            `${API_URL}${SESSOES_ENDPOINT}/${sessaoId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(alteracoes)
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
            "Você não possui permissão para editar sessões."
        );
    }

    if (resposta.status === 404) {
        throw new Error(
            "A sessão não foi encontrada."
        );
    }

    if (!resposta.ok) {
        const mensagem =
            await tentarLerMensagemErro(resposta);

        throw new Error(
            mensagem ||
            "Não foi possível atualizar a sessão."
        );
    }
}

/* =========================================================
   ERROS
========================================================= */

function tratarErroCarregamento(resposta) {
    if (resposta.status === 401) {
        fazerLogout();
        return;
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();
        return;
    }

    exibirErro(
        "Não foi possível se comunicar com o servidor."
    );
}

function exibirErro(mensagem) {
    elementos.sessionsLoading.classList.add(
        "hidden"
    );

    elementos.sessionsListSection.classList.add(
        "hidden"
    );

    elementos.sessionsEmptyState.classList.add(
        "hidden"
    );

    elementos.sessionsError.classList.remove(
        "hidden"
    );

    elementos.sessionsErrorMessage.textContent =
        mensagem;

    elementos.sessionsResultsCount.textContent =
        "Não foi possível carregar as sessões";
}

function exibirErroEdicao(mensagem) {
    elementos.editSessionError.textContent =
        mensagem;

    elementos.editSessionError.classList.remove(
        "hidden"
    );
}

function esconderErroEdicao() {
    elementos.editSessionError.classList.add(
        "hidden"
    );
}

async function tentarLerMensagemErro(resposta) {
    let texto;

    try {
        texto = await resposta.text();
    } catch {
        return null;
    }

    if (!texto) {
        return null;
    }

    try {
        const dados = JSON.parse(texto);

        return (
            dados?.mensagem ||
            dados?.message ||
            null
        );
    } catch {
        return texto;
    }
}

/* =========================================================
   ESTADO DE SALVAMENTO
========================================================= */

function definirEstadoSalvamento(salvando) {
    estado.salvandoEdicao =
        salvando;

    elementos.editSessionSaveButton.disabled =
        salvando;

    elementos.editSessionCancelButton.disabled =
        salvando;

    elementos.editSessionCloseButton.disabled =
        salvando;

    elementos.editSessionMovieSearch.disabled =
        salvando;

    elementos.editSessionDate.disabled =
        salvando;

    elementos.editSessionTime.disabled =
        salvando;

    elementos.editSessionSaveButton.textContent =
        salvando
            ? "Salvando..."
            : "Salvar alterações";

    if (salvando) {
        fecharResultadosFilmes();
    }
}

function fecharModalAposSucesso() {
    estado.salvandoEdicao = false;
    fecharModalEdicao();
}

/* =========================================================
   DATA E HORÁRIO
========================================================= */

function separarDataHora(dataHora) {
    const data = new Date(dataHora);

    return {
        data: obterDataISO(data),
        horario:
            `${String(data.getHours()).padStart(2, "0")}:` +
            `${String(data.getMinutes()).padStart(2, "0")}`
    };
}

function criarDataHora(data, horario) {
    const valor =
        new Date(`${data}T${horario}:00`);

    return Number.isNaN(valor.getTime())
        ? null
        : valor;
}

function formatarDataHoraParaApi(data, horario) {
    return `${data}T${horario}:00`;
}

function obterDataISO(valor) {
    const data =
        valor instanceof Date
            ? valor
            : new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "";
    }

    const ano =
        data.getFullYear();

    const mes =
        String(data.getMonth() + 1)
            .padStart(2, "0");

    const dia =
        String(data.getDate())
            .padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function formatarData(dataHora) {
    const data =
        new Date(dataHora);

    if (Number.isNaN(data.getTime())) {
        return "--/--/----";
    }

    return data.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function formatarHorario(dataHora) {
    const data =
        new Date(dataHora);

    if (Number.isNaN(data.getTime())) {
        return "--:--";
    }

    return data.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
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