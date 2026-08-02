const DASHBOARD_ENDPOINT = "/Dashboard";

const elementos = {
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebar-overlay"),
    sidebarOpenButton: document.getElementById("sidebar-open-button"),
    sidebarCloseButton: document.getElementById("sidebar-close-button"),

    logoutButton: document.getElementById("logout-button"),

    sidebarUserAvatar: document.getElementById("sidebar-user-avatar"),
    sidebarUserName: document.getElementById("sidebar-user-name"),
    employeeFirstName: document.getElementById("employee-first-name"),
    currentDate: document.getElementById("current-date"),

    dashboardError: document.getElementById("dashboard-error"),
    dashboardErrorMessage: document.getElementById(
        "dashboard-error-message"
    ),
    retryButton: document.getElementById("retry-button"),

    todaySessionsCount: document.getElementById(
        "today-sessions-count"
    ),
    todayTicketsCount: document.getElementById(
        "today-tickets-count"
    ),
    todayRevenue: document.getElementById("today-revenue"),

    nextSessionTime: document.getElementById("next-session-time"),
    nextSessionMovie: document.getElementById("next-session-movie"),

    sessionsLoading: document.getElementById("sessions-loading"),
    sessionsList: document.getElementById("sessions-list"),
    sessionsEmptyState: document.getElementById(
        "sessions-empty-state"
    ),
    sessionsError: document.getElementById("sessions-error"),
    sessionsRetryButton: document.getElementById(
        "sessions-retry-button"
    ),

    sessionItemTemplate: document.getElementById(
        "session-item-template"
    )
};


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
    configurarDataAtual();
    configurarEventos();

    carregarDashboard();
}


function obterUsuarioAutenticado() {
    const token = localStorage.getItem("token");
    const usuarioArmazenado = localStorage.getItem("usuario");

    if (!token || !usuarioArmazenado) {
        return null;
    }

    try {
        const usuario = JSON.parse(usuarioArmazenado);

        if (!usuario || !usuario.nome || !usuario.tipoUsuario) {
            return null;
        }

        return usuario;
    } catch (erro) {
        console.error(
            "Não foi possível ler os dados do usuário:",
            erro
        );

        return null;
    }
}


function configurarFuncionario(usuario) {
    const nomeCompleto = usuario.nome.trim();
    const primeiroNome = nomeCompleto.split(/\s+/)[0];
    const inicial = primeiroNome.charAt(0).toUpperCase();

    elementos.sidebarUserName.textContent = nomeCompleto;
    elementos.employeeFirstName.textContent = primeiroNome;
    elementos.sidebarUserAvatar.textContent = inicial;
}


function configurarDataAtual() {
    const agora = new Date();

    const dataFormatada = agora.toLocaleDateString(
        "pt-BR",
        {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );

    elementos.currentDate.textContent =
        primeiraLetraMaiuscula(dataFormatada);

    elementos.currentDate.dateTime = formatarDataISO(agora);
}


function configurarEventos() {
    elementos.sidebarOpenButton?.addEventListener(
        "click",
        abrirSidebar
    );

    elementos.sidebarCloseButton?.addEventListener(
        "click",
        fecharSidebar
    );

    elementos.sidebarOverlay?.addEventListener(
        "click",
        fecharSidebar
    );

    elementos.logoutButton?.addEventListener(
        "click",
        fazerLogout
    );

    elementos.retryButton?.addEventListener(
        "click",
        carregarDashboard
    );

    elementos.sessionsRetryButton?.addEventListener(
        "click",
        carregarDashboard
    );

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            fecharSidebar();
        }
    });
}


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


async function carregarDashboard() {
    prepararCarregamento();

    try {
        const resposta = await apiRequest(
            DASHBOARD_ENDPOINT,
            {
                method: "GET"
            }
        );

        if (!resposta.ok) {
            tratarErroDashboard(resposta);
            return;
        }

        const dashboard = resposta.data;

        validarDashboard(dashboard);
        preencherResumo(dashboard);
        renderizarSessoes(dashboard.sessoesHoje);

        esconderErroGeral();
    } catch (erro) {
        console.error(
            "Erro inesperado ao carregar o dashboard:",
            erro
        );

        exibirErroGeral(
            "Não foi possível carregar as informações da página."
        );

        exibirErroSessoes();
    }
}


function prepararCarregamento() {
    esconderErroGeral();

    elementos.sessionsList?.classList.add("hidden");
    elementos.sessionsEmptyState?.classList.add("hidden");
    elementos.sessionsError?.classList.add("hidden");
    elementos.sessionsLoading?.classList.remove("hidden");

    elementos.sessionsList?.replaceChildren();

    elementos.todaySessionsCount.textContent = "--";
    elementos.todayTicketsCount.textContent = "--";
    elementos.todayRevenue.textContent = "R$ --,--";

    elementos.nextSessionTime.textContent = "--:--";
    elementos.nextSessionMovie.textContent = "Carregando...";
}


function tratarErroDashboard(resposta) {
    elementos.sessionsLoading?.classList.add("hidden");

    if (resposta.status === 401) {
        fazerLogout();
        return;
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();
        return;
    }

    exibirErroSessoes();

    if (resposta.status === 0 || resposta.error) {
        exibirErroGeral(
            "Não foi possível conectar ao servidor."
        );

        return;
    }

    const mensagem =
        resposta.data?.mensagem ||
        "O servidor não conseguiu carregar as informações.";

    exibirErroGeral(mensagem);
}


function validarDashboard(dashboard) {
    if (!dashboard || typeof dashboard !== "object") {
        throw new Error("Dashboard não informado.");
    }

    if (!Array.isArray(dashboard.sessoesHoje)) {
        throw new Error("A lista de sessões é inválida.");
    }
}


function preencherResumo(dashboard) {
    const quantidadeSessoes =
        Number(dashboard.quantidadeSessoesHoje) || 0;

    const quantidadeIngressos =
        Number(dashboard.quantidadeIngressosVendidosHoje) || 0;

    const faturamento =
        Number(dashboard.faturamentoHoje) || 0;

    elementos.todaySessionsCount.textContent =
        quantidadeSessoes.toLocaleString("pt-BR");

    elementos.todayTicketsCount.textContent =
        quantidadeIngressos.toLocaleString("pt-BR");

    elementos.todayRevenue.textContent =
        formatarDinheiro(faturamento);

    preencherProximaSessao(dashboard.proximaSessao);
}


function preencherProximaSessao(proximaSessao) {
    if (!proximaSessao) {
        elementos.nextSessionTime.textContent = "--:--";

        elementos.nextSessionMovie.textContent =
            "Nenhuma próxima sessão";

        return;
    }

    elementos.nextSessionTime.textContent =
        formatarHorario(proximaSessao.dataHora);

    elementos.nextSessionMovie.textContent =
        proximaSessao.nomeFilme || "Filme não informado";
}


function renderizarSessoes(sessoes) {
    elementos.sessionsLoading?.classList.add("hidden");
    elementos.sessionsError?.classList.add("hidden");
    elementos.sessionsList?.replaceChildren();

    if (sessoes.length === 0) {
        elementos.sessionsList?.classList.add("hidden");

        elementos.sessionsEmptyState?.classList.remove(
            "hidden"
        );

        return;
    }

    const fragmento = document.createDocumentFragment();

    sessoes.forEach((sessao) => {
        const elementoSessao = criarElementoSessao(sessao);

        fragmento.appendChild(elementoSessao);
    });

    elementos.sessionsEmptyState?.classList.add("hidden");
    elementos.sessionsList?.classList.remove("hidden");
    elementos.sessionsList?.appendChild(fragmento);
}


function criarElementoSessao(sessao) {
    const clone =
        elementos.sessionItemTemplate.content.cloneNode(true);

    const artigo = clone.querySelector(".session-item");
    const horario = clone.querySelector(".session-time");
    const status = clone.querySelector(".session-status");

    const tituloFilme = clone.querySelector(
        ".session-movie-title"
    );

    const quantidadeOcupada = clone.querySelector(
        ".session-sales-count"
    );

    const progresso = clone.querySelector(
        ".session-progress"
    );

    const progressoValor = clone.querySelector(
        ".session-progress-value"
    );

    const botaoVenda = clone.querySelector(
        ".session-sale-button"
    );

    const vendidos = Number(sessao.ingressosVendidos) || 0;
    const capacidade = Number(sessao.capacidadeSala) || 0;

    const porcentagemOcupacao =
        calcularPorcentagemOcupacao(
            vendidos,
            capacidade
        );

    horario.textContent = formatarHorario(sessao.dataHora);
    horario.dateTime = sessao.dataHora || "";

    tituloFilme.textContent =
        sessao.nomeFilme || "Filme não informado";

    quantidadeOcupada.textContent =
        `${vendidos}/${capacidade} ingressos`;

    const statusNormalizado =
        normalizarStatus(sessao.status);

    status.textContent =
        obterTextoStatus(statusNormalizado);

    status.dataset.status = statusNormalizado;

    progresso.setAttribute(
        "aria-valuenow",
        porcentagemOcupacao.toString()
    );

    progresso.setAttribute(
        "aria-valuetext",
        `${vendidos} de ${capacidade} assentos ocupados`
    );

    progressoValor.style.width =
        `${porcentagemOcupacao}%`;

    artigo.dataset.sessionId = sessao.id || "";

    configurarBotaoVenda(
        botaoVenda,
        sessao.id,
        statusNormalizado
    );

    return clone;
}


function configurarBotaoVenda(
    botaoVenda,
    sessaoId,
    status
) {
    if (!sessaoId || !podeVenderIngressos(status)) {
        botaoVenda.removeAttribute("href");
        botaoVenda.classList.add("disabled");
        botaoVenda.setAttribute("aria-disabled", "true");
        botaoVenda.textContent = "Indisponível";

        return;
    }

    botaoVenda.href =
        `venda-ingressos.html?sessaoId=${sessaoId}`;
}


function podeVenderIngressos(status) {
    return status === "proxima";
}


function obterTextoStatus(status) {
    const textos = {
        proxima: "Próxima",
        emandamento: "Em andamento",
        finalizada: "Finalizada"
    };

    return textos[status] || "Status não informado";
}


function normalizarStatus(status) {
    return String(status || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();
}


function calcularPorcentagemOcupacao(
    quantidadeVendida,
    capacidade
) {
    if (capacidade <= 0) {
        return 0;
    }

    const porcentagem =
        (quantidadeVendida / capacidade) * 100;

    return Math.min(
        100,
        Math.max(0, Math.round(porcentagem))
    );
}


function exibirErroGeral(mensagem) {
    elementos.dashboardErrorMessage.textContent = mensagem;
    elementos.dashboardError?.classList.remove("hidden");
}


function esconderErroGeral() {
    elementos.dashboardError?.classList.add("hidden");
}


function exibirErroSessoes() {
    elementos.sessionsLoading?.classList.add("hidden");
    elementos.sessionsList?.classList.add("hidden");
    elementos.sessionsEmptyState?.classList.add("hidden");
    elementos.sessionsError?.classList.remove("hidden");
}


function formatarHorario(dataHora) {
    if (!dataHora) {
        return "--:--";
    }

    const data = new Date(dataHora);

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


function formatarDinheiro(valor) {
    return Number(valor).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function formatarDataISO(data) {
    const ano = data.getFullYear();

    const mes = String(
        data.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        data.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


function primeiraLetraMaiuscula(texto) {
    if (!texto) {
        return "";
    }

    return texto.charAt(0).toUpperCase() + texto.slice(1);
}


function redirecionarParaLogin() {
    window.location.replace("../../index.html");
}


function redirecionarParaHomeCliente() {
    window.location.replace("../public/home.html");
}