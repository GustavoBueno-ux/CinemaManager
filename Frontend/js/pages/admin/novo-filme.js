const FILMES_ENDPOINT = "/Filme";
const UPLOAD_POSTER_ENDPOINT = "/Filme/upload-poster";

const TAMANHO_MAXIMO_POSTER = 5 * 1024 * 1024;

const TIPOS_POSTER_PERMITIDOS = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
]);

const CLASSIFICACOES_VALIDAS = new Set([
    0,
    10,
    12,
    14,
    16,
    18
]);

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

    form: document.getElementById("new-movie-form"),
    titulo: document.getElementById("movie-title"),
    genero: document.getElementById("movie-genre"),
    duracao: document.getElementById("movie-duration"),
    classificacao: document.getElementById("movie-classification"),

    posterInput: document.getElementById("movie-poster"),
    posterPreview: document.getElementById("movie-poster-preview"),
    posterPlaceholder: document.getElementById("movie-poster-placeholder"),
    posterFileName: document.getElementById("poster-file-name"),

    erro: document.getElementById("new-movie-error"),
    salvarButton: document.getElementById("save-movie-button")
};

/* =========================================================
   ESTADO
========================================================= */

const estado = {
    salvando: false,
    posterSelecionado: null,
    posterObjectUrl: null
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

    elementos.posterInput?.addEventListener(
        "change",
        selecionarPoster
    );

    elementos.form?.addEventListener(
        "submit",
        cadastrarFilme
    );

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            fecharSidebar();
        }
    });

    window.addEventListener(
        "beforeunload",
        limparPosterObjectUrl
    );
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
   PÔSTER
========================================================= */

function selecionarPoster() {
    const arquivo = elementos.posterInput.files?.[0];

    if (!arquivo) {
        limparPosterSelecionado();
        return;
    }

    const erro = validarPoster(arquivo);

    if (erro) {
        elementos.posterInput.value = "";

        limparPosterSelecionado();
        exibirErro(erro);

        return;
    }

    esconderErro();
    limparPosterObjectUrl();

    estado.posterSelecionado = arquivo;
    estado.posterObjectUrl = URL.createObjectURL(arquivo);

    elementos.posterPreview.src = estado.posterObjectUrl;
    elementos.posterPreview.classList.remove("hidden");
    elementos.posterPlaceholder.classList.add("hidden");

    elementos.posterFileName.textContent = arquivo.name;
    elementos.posterFileName.classList.remove("hidden");
}

function validarPoster(arquivo) {
    if (!TIPOS_POSTER_PERMITIDOS.has(arquivo.type)) {
        return "Selecione uma imagem JPG, PNG ou WEBP.";
    }

    if (arquivo.size > TAMANHO_MAXIMO_POSTER) {
        return "A imagem deve ter no máximo 5 MB.";
    }

    return null;
}

function limparPosterSelecionado() {
    limparPosterObjectUrl();

    estado.posterSelecionado = null;

    elementos.posterPreview.removeAttribute("src");
    elementos.posterPreview.classList.add("hidden");

    elementos.posterPlaceholder.classList.remove("hidden");

    elementos.posterFileName.textContent = "";
    elementos.posterFileName.classList.add("hidden");
}

function limparPosterObjectUrl() {
    if (estado.posterObjectUrl) {
        URL.revokeObjectURL(estado.posterObjectUrl);
    }

    estado.posterObjectUrl = null;
}

/* =========================================================
   CADASTRO
========================================================= */

async function cadastrarFilme(evento) {
    evento.preventDefault();

    if (estado.salvando) return;

    esconderErro();

    const dados = obterDadosFormulario();
    const erro = validarFormulario(dados);

    if (erro) {
        exibirErro(erro);
        return;
    }

    definirEstadoSalvamento(true);

    try {
        const posterUrl = await enviarPoster(
            estado.posterSelecionado
        );

        await enviarCadastroFilme({
            titulo: dados.titulo,
            genero: dados.genero,
            duracaoMinutos: dados.duracaoMinutos,
            classificacao: dados.classificacao,
            posterUrl
        });

        limparPosterObjectUrl();

        window.location.href = "filmes.html";
    } catch (erro) {
        console.error("Erro ao cadastrar filme:", erro);

        exibirErro(
            erro.message ||
            "Não foi possível cadastrar o filme."
        );
    } finally {
        definirEstadoSalvamento(false);
    }
}

function obterDadosFormulario() {
    const classificacaoValor =
        elementos.classificacao.value;

    return {
        titulo: elementos.titulo.value.trim(),
        genero: elementos.genero.value.trim(),
        duracao: elementos.duracao.value.trim(),
        classificacaoValor,
        classificacao: Number(classificacaoValor),
        duracaoMinutos: Number(elementos.duracao.value)
    };
}

/* =========================================================
   VALIDAÇÃO
========================================================= */

function validarFormulario(dados) {
    const algumCampoVazio =
        !dados.titulo ||
        !dados.genero ||
        !dados.duracao ||
        dados.classificacaoValor === "" ||
        !estado.posterSelecionado;

    if (algumCampoVazio) {
        return "Preencha todos os campos para cadastrar o filme.";
    }

    if (dados.titulo.length > 100) {
        return "O título deve possuir no máximo 100 caracteres.";
    }

    if (
        !Number.isInteger(dados.duracaoMinutos) ||
        dados.duracaoMinutos < 1 ||
        dados.duracaoMinutos > 500
    ) {
        return "A duração deve estar entre 1 e 500 minutos.";
    }

    if (!CLASSIFICACOES_VALIDAS.has(dados.classificacao)) {
        return "Selecione uma classificação indicativa válida.";
    }

    return validarPoster(estado.posterSelecionado);
}

/* =========================================================
   UPLOAD DO PÔSTER
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
            "Não foi possível se comunicar com o servidor."
        );
    }

    tratarErroAutorizacao(resposta);

    if (!resposta.ok) {
        const mensagem = await tentarLerMensagemErro(resposta);

        throw new Error(
            mensagem ||
            "Não foi possível cadastrar o filme."
        );
    }

    let dados;

    try {
        dados = await resposta.json();
    } catch {
        throw new Error(
            "Não foi possível processar a resposta do servidor."
        );
    }

    if (!dados?.posterUrl) {
        throw new Error(
            "Não foi possível cadastrar o filme."
        );
    }

    return dados.posterUrl;
}

/* =========================================================
   POST DO FILME
========================================================= */

async function enviarCadastroFilme(filme) {
    const token = localStorage.getItem("token");

    if (!token) {
        fazerLogout();
        throw new Error("Sua sessão expirou.");
    }

    let resposta;

    try {
        resposta = await fetch(
            `${API_URL}${FILMES_ENDPOINT}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(filme)
            }
        );
    } catch {
        throw new Error(
            "Não foi possível se comunicar com o servidor."
        );
    }

    tratarErroAutorizacao(resposta);

    if (!resposta.ok) {
        const mensagem = await tentarLerMensagemErro(resposta);

        throw new Error(
            mensagem ||
            "Não foi possível cadastrar o filme."
        );
    }
}

/* =========================================================
   ERROS DA API
========================================================= */

function tratarErroAutorizacao(resposta) {
    if (resposta.status === 401) {
        fazerLogout();

        throw new Error(
            "Sua sessão expirou."
        );
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();

        throw new Error(
            "Você não possui permissão para realizar esta operação."
        );
    }
}

async function tentarLerMensagemErro(resposta) {
    try {
        const dados = await resposta.json();

        return (
            dados?.mensagem ||
            dados?.message ||
            null
        );
    } catch {
        return null;
    }
}

/* =========================================================
   ERRO DO FORMULÁRIO
========================================================= */

function exibirErro(mensagem) {
    elementos.erro.textContent = mensagem;
    elementos.erro.classList.remove("hidden");
}

function esconderErro() {
    elementos.erro.classList.add("hidden");
}

/* =========================================================
   ESTADO DE SALVAMENTO
========================================================= */

function definirEstadoSalvamento(salvando) {
    estado.salvando = salvando;

    elementos.salvarButton.disabled = salvando;
    elementos.posterInput.disabled = salvando;
    elementos.titulo.disabled = salvando;
    elementos.genero.disabled = salvando;
    elementos.duracao.disabled = salvando;
    elementos.classificacao.disabled = salvando;

    elementos.salvarButton.textContent =
        salvando
            ? "Cadastrando..."
            : "Cadastrar filme";
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