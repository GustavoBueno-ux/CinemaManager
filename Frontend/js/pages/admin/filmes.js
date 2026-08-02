const FILMES_ENDPOINT = "/Filme";
const FILMES_ATIVOS_ENDPOINT = "/Filme/ativos";
const UPLOAD_POSTER_ENDPOINT = "/Filme/upload-poster";

const TAMANHO_MAXIMO_POSTER = 5 * 1024 * 1024;
const TIPOS_POSTER_PERMITIDOS = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

const classificacoes = [
    { valor: 0, texto: "Livre" },
    { valor: 10, texto: "10 anos" },
    { valor: 12, texto: "12 anos" },
    { valor: 14, texto: "14 anos" },
    { valor: 16, texto: "16 anos" },
    { valor: 18, texto: "18 anos" }
];

/* =========================================================
   ELEMENTOS
========================================================= */

const elementos = {
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebar-overlay"),
    sidebarOpenButton: document.getElementById("sidebar-open-button"),
    sidebarCloseButton: document.getElementById("sidebar-close-button"),
    logoutButton: document.getElementById("logout-button"),
    sidebarUserAvatar: document.getElementById("sidebar-user-avatar"),
    sidebarUserName: document.getElementById("sidebar-user-name"),

    movieSearch: document.getElementById("movie-search"),
    genreFilter: document.getElementById("genre-filter"),
    classificationFilter: document.getElementById("classification-filter"),
    statusFilterButtons: document.querySelectorAll(".status-filter-button"),
    clearFiltersButton: document.getElementById("clear-filters-button"),

    moviesResultsCount: document.getElementById("movies-results-count"),
    moviesLoading: document.getElementById("movies-loading"),
    moviesError: document.getElementById("movies-error"),
    moviesErrorMessage: document.getElementById("movies-error-message"),
    moviesRetryButton: document.getElementById("movies-retry-button"),
    moviesListSection: document.getElementById("movies-list-section"),
    moviesList: document.getElementById("movies-list"),
    moviesEmptyState: document.getElementById("movies-empty-state"),
    movieCardTemplate: document.getElementById("movie-card-template"),

    editMovieModal: document.getElementById("edit-movie-modal"),
    editMovieCloseButton: document.getElementById("edit-movie-close-button"),
    editMovieCancelButton: document.getElementById("edit-movie-cancel-button"),
    editMovieForm: document.getElementById("edit-movie-form"),
    editMovieId: document.getElementById("edit-movie-id"),
    editMovieName: document.getElementById("edit-movie-name"),
    editMovieGenre: document.getElementById("edit-movie-genre"),
    editMovieClassification: document.getElementById("edit-movie-classification"),
    editMovieDuration: document.getElementById("edit-movie-duration"),
    editMoviePoster: document.getElementById("edit-movie-poster"),
    editMoviePosterImage: document.getElementById("edit-movie-poster-image"),
    editMoviePosterPlaceholder: document.getElementById("edit-movie-poster-placeholder"),
    editMovieError: document.getElementById("edit-movie-error"),
    editMovieSaveButton: document.getElementById("edit-movie-save-button")
};

/* =========================================================
   ESTADO
========================================================= */

const estado = {
    todosFilmes: [],
    idsFilmesAtivos: new Set(),
    statusSelecionado: "todos",
    filmeEmEdicao: null,
    salvandoEdicao: false,
    posterObjectUrl: null,
    posterSelecionado: null
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
    configurarClassificacoes();
    configurarEventos();
    carregarFilmes();
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
        return usuario?.nome && usuario?.tipoUsuario ? usuario : null;
    } catch (erro) {
        console.error("Não foi possível ler os dados do usuário:", erro);
        return null;
    }
}

function configurarFuncionario(usuario) {
    const nome = usuario.nome.trim();

    if (elementos.sidebarUserName) {
        elementos.sidebarUserName.textContent = nome;
    }

    if (elementos.sidebarUserAvatar) {
        elementos.sidebarUserAvatar.textContent = nome.charAt(0).toUpperCase();
    }
}

/* =========================================================
   CLASSIFICAÇÕES
========================================================= */

function configurarClassificacoes() {
    elementos.classificationFilter.innerHTML =
        '<option value="">Todas as classificações</option>';

    elementos.editMovieClassification.innerHTML = "";

    classificacoes.forEach(({ valor, texto }) => {
        elementos.classificationFilter.add(new Option(texto, valor));
        elementos.editMovieClassification.add(new Option(texto, valor));
    });
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    elementos.sidebarOpenButton?.addEventListener("click", abrirSidebar);
    elementos.sidebarCloseButton?.addEventListener("click", fecharSidebar);
    elementos.sidebarOverlay?.addEventListener("click", fecharSidebar);
    elementos.logoutButton?.addEventListener("click", fazerLogout);

    elementos.moviesRetryButton?.addEventListener("click", carregarFilmes);
    elementos.movieSearch?.addEventListener("input", aplicarFiltros);
    elementos.genreFilter?.addEventListener("change", aplicarFiltros);
    elementos.classificationFilter?.addEventListener("change", aplicarFiltros);
    elementos.clearFiltersButton?.addEventListener("click", limparFiltros);

    elementos.statusFilterButtons.forEach(botao => {
        botao.addEventListener("click", () => selecionarFiltroStatus(botao));
    });

    elementos.editMovieCloseButton?.addEventListener("click", fecharModalEdicao);
    elementos.editMovieCancelButton?.addEventListener("click", fecharModalEdicao);
    elementos.editMovieForm?.addEventListener("submit", salvarEdicao);
    elementos.editMoviePoster?.addEventListener("change", atualizarPreviaPosterSelecionado);

    elementos.editMovieModal?.addEventListener("click", evento => {
        if (evento.target === elementos.editMovieModal) {
            fecharModalEdicao();
        }
    });

    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape") return;

        if (!elementos.editMovieModal.classList.contains("hidden")) {
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

async function carregarFilmes() {
    prepararCarregamento();

    try {
        const [todos, ativos] = await Promise.all([
            apiRequest(FILMES_ENDPOINT),
            apiRequest(FILMES_ATIVOS_ENDPOINT)
        ]);

        if (!todos.ok) {
            tratarErroCarregamento(todos);
            return;
        }

        if (!ativos.ok) {
            tratarErroCarregamento(ativos);
            return;
        }

        if (!Array.isArray(todos.data) || !Array.isArray(ativos.data)) {
            throw new Error("A API retornou uma lista de filmes inválida.");
        }

        estado.todosFilmes = todos.data;
        estado.idsFilmesAtivos = new Set(ativos.data.map(filme => filme.id));

        configurarGeneros();
        aplicarFiltros();
    } catch (erro) {
        console.error("Erro ao carregar filmes:", erro);
        exibirErro("Não foi possível carregar os filmes.");
    }
}

function prepararCarregamento() {
    elementos.moviesLoading.classList.remove("hidden");
    elementos.moviesError.classList.add("hidden");
    elementos.moviesListSection.classList.add("hidden");
    elementos.moviesEmptyState.classList.add("hidden");
    elementos.moviesList.replaceChildren();
    elementos.moviesResultsCount.textContent = "Carregando filmes...";
}

/* =========================================================
   GÊNEROS
========================================================= */

function configurarGeneros() {
    const selecionado = elementos.genreFilter.value;

    const generos = [...new Set(
        estado.todosFilmes
            .map(filme => filme.genero?.trim())
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "pt-BR"));

    elementos.genreFilter.replaceChildren(
        new Option("Todos os gêneros", "")
    );

    generos.forEach(genero => {
        elementos.genreFilter.add(new Option(genero, genero));
    });

    if (generos.includes(selecionado)) {
        elementos.genreFilter.value = selecionado;
    }
}

/* =========================================================
   FILTROS
========================================================= */

function selecionarFiltroStatus(botao) {
    if (!botao) return;

    estado.statusSelecionado = botao.dataset.status;

    elementos.statusFilterButtons.forEach(item => {
        item.classList.toggle("active", item === botao);
    });

    aplicarFiltros();
}

function aplicarFiltros() {
    const pesquisa = elementos.movieSearch.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const genero = elementos.genreFilter.value;
    const classificacao = elementos.classificationFilter.value;

    const filmes = estado.todosFilmes.filter(filme => {
        const ativo = estado.idsFilmesAtivos.has(filme.id);

        const correspondeStatus =
            estado.statusSelecionado === "todos" ||
            (estado.statusSelecionado === "ativo" && ativo) ||
            (estado.statusSelecionado === "inativo" && !ativo);

        const correspondePesquisa =
            !pesquisa ||
            filme.titulo.toLocaleLowerCase("pt-BR").includes(pesquisa);

        const correspondeGenero =
            !genero ||
            filme.genero === genero;

        const correspondeClassificacao =
            !classificacao ||
            Number(filme.classificacao) === Number(classificacao);

        return (
            correspondePesquisa &&
            correspondeGenero &&
            correspondeClassificacao &&
            correspondeStatus
        );
    });

    renderizarFilmes(filmes);
}

function limparFiltros() {
    elementos.movieSearch.value = "";
    elementos.genreFilter.value = "";
    elementos.classificationFilter.value = "";

    const botaoTodos = [...elementos.statusFilterButtons]
        .find(botao => botao.dataset.status === "todos");

    selecionarFiltroStatus(botaoTodos);
}

/* =========================================================
   RENDERIZAÇÃO
========================================================= */

function renderizarFilmes(filmes) {
    elementos.moviesLoading.classList.add("hidden");
    elementos.moviesError.classList.add("hidden");
    elementos.moviesList.replaceChildren();

    atualizarContadorResultados(filmes.length);

    elementos.moviesEmptyState.classList.toggle(
        "hidden",
        filmes.length !== 0
    );

    elementos.moviesListSection.classList.toggle(
        "hidden",
        filmes.length === 0
    );

    if (!filmes.length) return;

    const fragmento = document.createDocumentFragment();

    filmes.forEach(filme => {
        fragmento.append(criarCardFilme(filme));
    });

    elementos.moviesList.append(fragmento);
}

function criarCardFilme(filme) {
    const clone = elementos.movieCardTemplate.content.cloneNode(true);

    const card = clone.querySelector(".movie-card");
    const poster = clone.querySelector(".movie-poster");
    const placeholder = clone.querySelector(".movie-poster-placeholder");
    const status = clone.querySelector(".movie-status");
    const ativo = estado.idsFilmesAtivos.has(filme.id);

    card.dataset.movieId = filme.id;

    clone.querySelector(".movie-title").textContent = filme.titulo;
    clone.querySelector(".movie-genre").textContent = filme.genero;

    clone.querySelector(".movie-classification").textContent =
        formatarClassificacao(filme.classificacao);

    clone.querySelector(".movie-duration").textContent =
        formatarDuracao(filme.duracaoMinutos);

    status.textContent = ativo ? "Em cartaz" : "Inativo";
    status.dataset.status = ativo ? "ativo" : "inativo";

    configurarPoster(
        poster,
        placeholder,
        filme.posterUrl,
        `Pôster do filme ${filme.titulo}`
    );

    clone.querySelector(".edit-movie-button").addEventListener(
        "click",
        () => abrirModalEdicao(filme.id)
    );

    return clone;
}

function configurarPoster(imagem, placeholder, posterUrl, alt) {
    if (!imagem || !placeholder) return;

    const caminho = obterCaminhoPoster(posterUrl);

    imagem.alt = alt;
    imagem.classList.add("hidden");
    placeholder.classList.remove("hidden");

    imagem.onload = null;
    imagem.onerror = null;
    imagem.removeAttribute("src");

    if (!caminho) return;

    imagem.onload = () => {
        imagem.classList.remove("hidden");
        placeholder.classList.add("hidden");
    };

    imagem.onerror = () => {
        imagem.onload = null;
        imagem.onerror = null;
        imagem.removeAttribute("src");
        imagem.classList.add("hidden");
        placeholder.classList.remove("hidden");
    };

    imagem.src = caminho;
}

function atualizarContadorResultados(quantidade) {
    if (quantidade === 0) {
        elementos.moviesResultsCount.textContent = "Nenhum filme encontrado";
        return;
    }

    elementos.moviesResultsCount.textContent =
        quantidade === 1
            ? "1 filme encontrado"
            : `${quantidade} filmes encontrados`;
}

/* =========================================================
   MODAL
========================================================= */

function abrirModalEdicao(filmeId) {
    const filme = estado.todosFilmes.find(item => item.id === filmeId);
    if (!filme) return;

    estado.filmeEmEdicao = filme;
    estado.posterSelecionado = null;

    limparObjectUrlPoster();

    elementos.editMovieId.value = filme.id;
    elementos.editMovieName.value = filme.titulo;
    elementos.editMovieGenre.value = filme.genero;
    elementos.editMovieClassification.value = filme.classificacao;
    elementos.editMovieDuration.value = filme.duracaoMinutos;
    elementos.editMoviePoster.value = "";

    configurarPoster(
        elementos.editMoviePosterImage,
        elementos.editMoviePosterPlaceholder,
        filme.posterUrl,
        `Pôster atual de ${filme.titulo}`
    );

    esconderErroEdicao();

    elementos.editMovieModal.classList.remove("hidden");
    elementos.editMovieModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    elementos.editMovieName.focus();
}

function fecharModalEdicao() {
    if (estado.salvandoEdicao) return;

    elementos.editMovieModal.classList.add("hidden");
    elementos.editMovieModal.setAttribute("aria-hidden", "true");

    elementos.editMovieForm.reset();
    document.body.classList.remove("modal-open");

    estado.filmeEmEdicao = null;
    estado.posterSelecionado = null;

    limparObjectUrlPoster();
    esconderErroEdicao();
}

/* =========================================================
   PÔSTER / PREVIEW
========================================================= */

function atualizarPreviaPosterSelecionado() {
    const arquivo = elementos.editMoviePoster.files?.[0];

    if (!arquivo) {
        estado.posterSelecionado = null;
        return;
    }

    const erro = validarArquivoPoster(arquivo);

    if (erro) {
        elementos.editMoviePoster.value = "";
        estado.posterSelecionado = null;

        exibirErroEdicao(erro);
        restaurarPosterAtualNoPreview();
        return;
    }

    esconderErroEdicao();
    limparObjectUrlPoster();

    estado.posterSelecionado = arquivo;
    estado.posterObjectUrl = URL.createObjectURL(arquivo);

    configurarPoster(
        elementos.editMoviePosterImage,
        elementos.editMoviePosterPlaceholder,
        estado.posterObjectUrl,
        `Prévia de ${arquivo.name}`
    );
}

function validarArquivoPoster(arquivo) {
    if (!TIPOS_POSTER_PERMITIDOS.has(arquivo.type)) {
        return "Selecione uma imagem JPG, PNG ou WEBP.";
    }

    if (arquivo.size > TAMANHO_MAXIMO_POSTER) {
        return "A imagem deve ter no máximo 5 MB.";
    }

    return null;
}

function restaurarPosterAtualNoPreview() {
    if (!estado.filmeEmEdicao) return;

    limparObjectUrlPoster();

    configurarPoster(
        elementos.editMoviePosterImage,
        elementos.editMoviePosterPlaceholder,
        estado.filmeEmEdicao.posterUrl,
        `Pôster atual de ${estado.filmeEmEdicao.titulo}`
    );
}

function limparObjectUrlPoster() {
    if (estado.posterObjectUrl) {
        URL.revokeObjectURL(estado.posterObjectUrl);
    }

    estado.posterObjectUrl = null;
}

/* =========================================================
   SALVAR EDIÇÃO
========================================================= */

async function salvarEdicao(evento) {
    evento.preventDefault();

    if (estado.salvandoEdicao || !estado.filmeEmEdicao) return;

    esconderErroEdicao();

    const titulo = elementos.editMovieName.value.trim();
    const genero = elementos.editMovieGenre.value.trim();
    const duracaoMinutos = Number(elementos.editMovieDuration.value);
    const classificacao = Number(elementos.editMovieClassification.value);

    if (!titulo || !genero) {
        exibirErroEdicao("Informe o título e o gênero do filme.");
        return;
    }

    if (
        !Number.isInteger(duracaoMinutos) ||
        duracaoMinutos < 1 ||
        duracaoMinutos > 500
    ) {
        exibirErroEdicao("A duração deve estar entre 1 e 500 minutos.");
        return;
    }

    if (!classificacoes.some(item => item.valor === classificacao)) {
        exibirErroEdicao("Selecione uma classificação válida.");
        return;
    }

    if (estado.posterSelecionado) {
        const erroPoster = validarArquivoPoster(estado.posterSelecionado);

        if (erroPoster) {
            exibirErroEdicao(erroPoster);
            return;
        }
    }

    const filme = estado.filmeEmEdicao;

    const alteracoes = montarAlteracoesFilme(filme, {
        titulo,
        genero,
        duracaoMinutos,
        classificacao
    });

    if (!Object.keys(alteracoes).length && !estado.posterSelecionado) {
        fecharModalEdicao();
        return;
    }

    definirEstadoSalvamento(true);

    try {
        if (estado.posterSelecionado) {
            alteracoes.posterUrl = await enviarPoster(
                estado.posterSelecionado
            );
        }

        await atualizarFilme(filme.id, alteracoes);

        fecharModalEdicaoAposSucesso();
        await carregarFilmes();
    } catch (erro) {
        console.error("Erro ao editar filme:", erro);

        exibirErroEdicao(
            erro.message || "Não foi possível salvar as alterações."
        );
    } finally {
        definirEstadoSalvamento(false);
    }
}

function montarAlteracoesFilme(filme, valores) {
    const alteracoes = {};

    if (valores.titulo !== filme.titulo) {
        alteracoes.titulo = valores.titulo;
    }

    if (valores.genero !== filme.genero) {
        alteracoes.genero = valores.genero;
    }

    if (valores.duracaoMinutos !== filme.duracaoMinutos) {
        alteracoes.duracaoMinutos = valores.duracaoMinutos;
    }

    if (valores.classificacao !== Number(filme.classificacao)) {
        alteracoes.classificacao = valores.classificacao;
    }

    return alteracoes;
}

/* =========================================================
   UPLOAD
========================================================= */

async function enviarPoster(arquivo) {
    const token = localStorage.getItem("token");

    if (!token) {
        fazerLogout();
        throw new Error("Sua sessão expirou.");
    }

    const formData = new FormData();
    formData.append("file", arquivo);

    let resposta;

    try {
        resposta = await fetch(
            `${API_URL}${UPLOAD_POSTER_ENDPOINT}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            }
        );
    } catch {
        throw new Error(
            "Não foi possível conectar ao servidor para enviar o pôster."
        );
    }

    if (resposta.status === 401) {
        fazerLogout();
        throw new Error("Sua sessão expirou.");
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();
        throw new Error(
            "Você não possui permissão para enviar pôsteres."
        );
    }

    if (!resposta.ok) {
        const mensagem = await tentarLerMensagemErro(resposta);

        throw new Error(
            mensagem || "Não foi possível enviar o pôster."
        );
    }

    let dados;

    try {
        dados = await resposta.json();
    } catch {
        throw new Error(
            "O servidor não retornou os dados do pôster corretamente."
        );
    }

    if (!dados?.posterUrl || typeof dados.posterUrl !== "string") {
        throw new Error(
            "O servidor não retornou a URL do pôster."
        );
    }

    return dados.posterUrl;
}

/* =========================================================
   PATCH
========================================================= */

async function atualizarFilme(filmeId, alteracoes) {
    const token = localStorage.getItem("token");

    let resposta;

    try {
        resposta = await fetch(
            `${API_URL}${FILMES_ENDPOINT}/${filmeId}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    ...(token
                        ? { Authorization: `Bearer ${token}` }
                        : {})
                },
                body: JSON.stringify(alteracoes)
            }
        );
    } catch {
        throw new Error("Não foi possível conectar ao servidor.");
    }

    if (resposta.status === 401) {
        fazerLogout();
        throw new Error("Sua sessão expirou.");
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();

        throw new Error(
            "Você não possui permissão para editar filmes."
        );
    }

    if (resposta.status === 404) {
        throw new Error("O filme não foi encontrado.");
    }

    if (!resposta.ok) {
        const mensagem = await tentarLerMensagemErro(resposta);

        throw new Error(
            mensagem || "Não foi possível atualizar o filme."
        );
    }
}

/* =========================================================
   ERROS
========================================================= */

async function tentarLerMensagemErro(resposta) {
    try {
        const dados = await resposta.json();
        return dados?.mensagem || dados?.message || null;
    } catch {
        return null;
    }
}

function tratarErroCarregamento(resposta) {
    if (resposta.status === 401) {
        fazerLogout();
        return;
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();
        return;
    }

    const mensagem =
        resposta.status === 0 || resposta.error
            ? "Não foi possível conectar ao servidor."
            : resposta.data?.mensagem ||
              "O servidor não conseguiu carregar os filmes.";

    exibirErro(mensagem);
}

function exibirErro(mensagem) {
    elementos.moviesLoading.classList.add("hidden");
    elementos.moviesListSection.classList.add("hidden");
    elementos.moviesEmptyState.classList.add("hidden");
    elementos.moviesError.classList.remove("hidden");

    elementos.moviesErrorMessage.textContent = mensagem;
    elementos.moviesResultsCount.textContent =
        "Não foi possível carregar os filmes";
}

function exibirErroEdicao(mensagem) {
    elementos.editMovieError.textContent = mensagem;
    elementos.editMovieError.classList.remove("hidden");
}

function esconderErroEdicao() {
    elementos.editMovieError.classList.add("hidden");
}

/* =========================================================
   SALVAMENTO
========================================================= */

function definirEstadoSalvamento(salvando) {
    estado.salvandoEdicao = salvando;

    elementos.editMovieSaveButton.disabled = salvando;
    elementos.editMovieCancelButton.disabled = salvando;
    elementos.editMovieCloseButton.disabled = salvando;
    elementos.editMoviePoster.disabled = salvando;

    elementos.editMovieSaveButton.textContent =
        salvando
            ? "Salvando..."
            : "Salvar alterações";
}

function fecharModalEdicaoAposSucesso() {
    estado.salvandoEdicao = false;
    fecharModalEdicao();
}

/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatarClassificacao(classificacao) {
    return classificacoes.find(
        item => item.valor === Number(classificacao)
    )?.texto || "Não informada";
}

function formatarDuracao(minutos) {
    const duracao = Number(minutos);

    if (!Number.isFinite(duracao) || duracao <= 0) {
        return "--";
    }

    const horas = Math.floor(duracao / 60);
    const restantes = duracao % 60;

    if (!horas) {
        return `${restantes} min`;
    }

    return restantes
        ? `${horas}h ${restantes}min`
        : `${horas}h`;
}

function obterCaminhoPoster(posterUrl) {
    if (!posterUrl) return "";

    const url = posterUrl.trim();

    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("blob:") ||
        url.startsWith("data:") ||
        url.startsWith("/")
    ) {
        return url;
    }

    return `/Frontend/assets/posters/${url}`;
}

/* =========================================================
   REDIRECIONAMENTOS
========================================================= */

function redirecionarParaLogin() {
    window.location.replace("../../index.html");
}

function redirecionarParaHomeCliente() {
    window.location.replace("../public/home.html");
}