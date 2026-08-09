/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const SESSOES_ENDPOINT = "/Sessao";


/* =========================================================
   ELEMENTOS
========================================================= */

const elementos = {

    /* SIDEBAR */

    sidebar:
        document.getElementById("sidebar"),

    sidebarOverlay:
        document.getElementById("sidebar-overlay"),

    sidebarOpenButton:
        document.getElementById("sidebar-open-button"),

    sidebarCloseButton:
        document.getElementById("sidebar-close-button"),

    logoutButton:
        document.getElementById("logout-button"),

    sidebarUserAvatar:
        document.getElementById("sidebar-user-avatar"),

    sidebarUserName:
        document.getElementById("sidebar-user-name"),


    /* ESTADOS */

    loading:
        document.getElementById("scanner-sessions-loading"),

    error:
        document.getElementById("scanner-sessions-error"),

    errorMessage:
        document.getElementById("scanner-sessions-error-message"),

    retryButton:
        document.getElementById("scanner-retry-button"),

    content:
        document.getElementById("scanner-sessions-content"),


    /* HOJE */

    todayDate:
        document.getElementById("today-date"),

    todaySessionsList:
        document.getElementById("today-sessions-list"),

    todaySessionsEmpty:
        document.getElementById("today-sessions-empty"),


    /* DATAS FUTURAS */

    dateButtons:
        document.getElementById("scanner-date-buttons"),

    futureDateSessions:
        document.getElementById("future-date-sessions"),

    futureDateTitle:
        document.getElementById("future-date-title"),

    otherSessionsList:
        document.getElementById("other-sessions-list"),

    otherSessionsEmpty:
        document.getElementById("other-sessions-empty"),


    /* TEMPLATE */

    sessionCardTemplate:
        document.getElementById("scanner-session-card-template")
};


/* =========================================================
   ESTADO
========================================================= */

const estado = {

    sessoes: [],

    dataFuturaSelecionada: null

};


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    iniciarPagina
);

function iniciarPagina() {

    const usuario =
        obterUsuarioAutenticado();

    if (!usuario) {

        redirecionarParaLogin();

        return;

    }

    if (
        usuario.tipoUsuario !==
        "Funcionario"
    ) {

        redirecionarParaHomeCliente();

        return;

    }

    configurarFuncionario(usuario);

    configurarEventos();

    atualizarDataHoje();

    carregarSessoes();

}


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function obterUsuarioAutenticado() {

    const token =
        localStorage.getItem("token");

    const usuarioArmazenado =
        localStorage.getItem("usuario");

    if (
        !token ||
        !usuarioArmazenado
    ) {

        return null;

    }

    try {

        const usuario =
            JSON.parse(
                usuarioArmazenado
            );

        if (
            !usuario?.nome ||
            !usuario?.tipoUsuario
        ) {

            return null;

        }

        return usuario;

    }
    catch (erro) {

        console.error(
            "Erro ao ler usuário:",
            erro
        );

        return null;

    }

}


function configurarFuncionario(
    usuario
) {

    const nome =
        String(usuario.nome)
            .trim();

    if (
        elementos.sidebarUserName
    ) {

        elementos.sidebarUserName
            .textContent =
            nome;

    }

    if (
        elementos.sidebarUserAvatar
    ) {

        elementos.sidebarUserAvatar
            .textContent =
            nome
                .charAt(0)
                .toUpperCase();

    }

}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {

    elementos.sidebarOpenButton
        ?.addEventListener(
            "click",
            abrirSidebar
        );

    elementos.sidebarCloseButton
        ?.addEventListener(
            "click",
            fecharSidebar
        );

    elementos.sidebarOverlay
        ?.addEventListener(
            "click",
            fecharSidebar
        );

    elementos.logoutButton
        ?.addEventListener(
            "click",
            fazerLogout
        );

    elementos.retryButton
        ?.addEventListener(
            "click",
            carregarSessoes
        );

    document.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key ===
                "Escape"
            ) {

                fecharSidebar();

            }

        }
    );

}


/* =========================================================
   SIDEBAR
========================================================= */

function abrirSidebar() {

    elementos.sidebar
        ?.classList.add(
            "open"
        );

    elementos.sidebarOverlay
        ?.classList.add(
            "visible"
        );

    elementos.sidebarOpenButton
        ?.setAttribute(
            "aria-expanded",
            "true"
        );

    document.body.classList.add(
        "sidebar-open"
    );

}


function fecharSidebar() {

    elementos.sidebar
        ?.classList.remove(
            "open"
        );

    elementos.sidebarOverlay
        ?.classList.remove(
            "visible"
        );

    elementos.sidebarOpenButton
        ?.setAttribute(
            "aria-expanded",
            "false"
        );

    document.body.classList.remove(
        "sidebar-open"
    );

}


function fazerLogout() {

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "usuario"
    );

    redirecionarParaLogin();

}


/* =========================================================
   DATA DE HOJE
========================================================= */

function atualizarDataHoje() {

    if (
        !elementos.todayDate
    ) {

        return;

    }

    const hoje =
        new Date();

    elementos.todayDate.textContent =
        hoje.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

}


/* =========================================================
   CARREGAMENTO
========================================================= */

async function carregarSessoes() {

    prepararCarregamento();

    try {

        const resposta =
            await apiRequest(
                SESSOES_ENDPOINT
            );

        if (
            !resposta.ok
        ) {

            tratarErroResposta(
                resposta
            );

            return;

        }

        if (
            !Array.isArray(
                resposta.data
            )
        ) {

            throw new Error(
                "A API retornou uma lista de sessões inválida."
            );

        }

        estado.sessoes =
            resposta.data.filter(
                sessao =>
                    sessao &&
                    sessao.id != null &&
                    sessao.dataHora
            );

        renderizarSessoes();

    }
    catch (erro) {

        console.error(
            "Erro ao carregar sessões:",
            erro
        );

        exibirErro(
            "Não foi possível se comunicar com o servidor."
        );

    }

}


function prepararCarregamento() {

    elementos.loading
        ?.classList.remove(
            "hidden"
        );

    elementos.error
        ?.classList.add(
            "hidden"
        );

    elementos.content
        ?.classList.add(
            "hidden"
        );

    elementos.todaySessionsList
        ?.replaceChildren();

    elementos.dateButtons
        ?.replaceChildren();

    elementos.otherSessionsList
        ?.replaceChildren();

    elementos.futureDateSessions
        ?.classList.add(
            "hidden"
        );

    elementos.todaySessionsEmpty
        ?.classList.add(
            "hidden"
        );

    elementos.otherSessionsEmpty
        ?.classList.add(
            "hidden"
        );

    estado.dataFuturaSelecionada =
        null;

}


function tratarErroResposta(
    resposta
) {

    if (
        resposta.status ===
        401
    ) {

        fazerLogout();

        return;

    }

    if (
        resposta.status ===
        403
    ) {

        redirecionarParaHomeCliente();

        return;

    }

    exibirErro(
        resposta.message ||
        "Não foi possível carregar as sessões."
    );

}


function exibirErro(
    mensagem
) {

    elementos.loading
        ?.classList.add(
            "hidden"
        );

    elementos.content
        ?.classList.add(
            "hidden"
        );

    elementos.error
        ?.classList.remove(
            "hidden"
        );

    if (
        elementos.errorMessage
    ) {

        elementos.errorMessage
            .textContent =
            mensagem;

    }

}


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
========================================================= */

function renderizarSessoes() {

    elementos.loading
        ?.classList.add(
            "hidden"
        );

    elementos.error
        ?.classList.add(
            "hidden"
        );

    elementos.content
        ?.classList.remove(
            "hidden"
        );


    const hoje =
        obterInicioDoDia(
            new Date()
        );


    /*
        TODAS AS SESSÕES DE HOJE.

        Inclusive sessões que já começaram.

        O backend continua sendo responsável
        por decidir se a entrada ainda é aceita.
    */

    const sessoesHoje =
        estado.sessoes.filter(
            sessao =>
                ehHoje(
                    sessao.dataHora
                )
        );


    /*
        SOMENTE DATAS FUTURAS.

        Ontem, anteontem, mês passado etc.
        nunca entram nessa tela.
    */

    const sessoesFuturas =
        estado.sessoes.filter(
            sessao => {

                const dataHora =
                    converterParaData(
                        sessao.dataHora
                    );

                if (
                    !dataHora
                ) {

                    return false;

                }

                const inicioDiaSessao =
                    obterInicioDoDia(
                        dataHora
                    );

                return (
                    inicioDiaSessao.getTime() >
                    hoje.getTime()
                );

            }
        );


    renderizarSessoesHoje(
        sessoesHoje
    );

    renderizarDatasFuturas(
        sessoesFuturas
    );

}


/* =========================================================
   SESSÕES DE HOJE
========================================================= */

function renderizarSessoesHoje(
    sessoes
) {

    elementos.todaySessionsList
        ?.replaceChildren();


    if (
        !sessoes.length
    ) {

        elementos.todaySessionsEmpty
            ?.classList.remove(
                "hidden"
            );

        return;

    }


    elementos.todaySessionsEmpty
        ?.classList.add(
            "hidden"
        );


    const sessoesOrdenadas =
        [...sessoes].sort(
            ordenarPorHorario
        );


    const fragmento =
        document.createDocumentFragment();


    sessoesOrdenadas.forEach(
        sessao => {

            fragmento.append(
                criarCardSessao(
                    sessao
                )
            );

        }
    );


    elementos.todaySessionsList
        ?.append(
            fragmento
        );

}


/* =========================================================
   DATAS FUTURAS
========================================================= */

function renderizarDatasFuturas(
    sessoes
) {

    elementos.dateButtons
        ?.replaceChildren();

    elementos.otherSessionsList
        ?.replaceChildren();

    elementos.futureDateSessions
        ?.classList.add(
            "hidden"
        );

    estado.dataFuturaSelecionada =
        null;


    if (
        !sessoes.length
    ) {

        elementos.otherSessionsEmpty
            ?.classList.remove(
                "hidden"
            );

        return;

    }


    elementos.otherSessionsEmpty
        ?.classList.add(
            "hidden"
        );


    const grupos =
        agruparSessoesPorData(
            sessoes
        );


    const datas =
        Object.keys(
            grupos
        )
        .sort(
            ordenarDatasISO
        );


    const fragmento =
        document.createDocumentFragment();


    datas.forEach(
        dataISO => {

            fragmento.append(
                criarBotaoData(
                    dataISO,
                    grupos[dataISO]
                )
            );

        }
    );


    elementos.dateButtons
        ?.append(
            fragmento
        );

}


/* =========================================================
   BOTÃO DE DATA
========================================================= */

function criarBotaoData(
    dataISO,
    sessoes
) {

    const botao =
        document.createElement(
            "button"
        );

    botao.type =
        "button";

    botao.className =
        "scanner-date-button";

    botao.dataset.date =
        dataISO;


    const diaSemana =
        document.createElement(
            "span"
        );

    diaSemana.className =
        "scanner-date-button-weekday";

    diaSemana.textContent =
        obterDiaSemanaCurto(
            dataISO
        );


    const data =
        document.createElement(
            "strong"
        );

    data.className =
        "scanner-date-button-date";

    data.textContent =
        formatarDataBotao(
            dataISO
        );


    const quantidade =
        document.createElement(
            "small"
        );

    quantidade.className =
        "scanner-date-button-count";

    quantidade.textContent =
        sessoes.length === 1
            ? "1 sessão"
            : `${sessoes.length} sessões`;


    botao.append(
        diaSemana,
        data,
        quantidade
    );


    botao.addEventListener(
        "click",
        () => {

            selecionarDataFutura(
                dataISO,
                sessoes,
                botao
            );

        }
    );


    return botao;

}


/* =========================================================
   SELECIONAR DATA FUTURA
========================================================= */

function selecionarDataFutura(
    dataISO,
    sessoes,
    botaoSelecionado
) {

    estado.dataFuturaSelecionada =
        dataISO;


    elementos.dateButtons
        ?.querySelectorAll(
            ".scanner-date-button"
        )
        .forEach(
            botao => {

                botao.classList.toggle(
                    "active",
                    botao ===
                        botaoSelecionado
                );

            }
        );


    if (
        elementos.futureDateTitle
    ) {

        elementos.futureDateTitle
            .textContent =
            formatarTituloData(
                dataISO
            );

    }


    elementos.otherSessionsList
        ?.replaceChildren();


    const sessoesOrdenadas =
        [...sessoes].sort(
            ordenarPorHorario
        );


    const fragmento =
        document.createDocumentFragment();


    sessoesOrdenadas.forEach(
        sessao => {

            fragmento.append(
                criarCardSessao(
                    sessao
                )
            );

        }
    );


    elementos.otherSessionsList
        ?.append(
            fragmento
        );


    elementos.futureDateSessions
        ?.classList.remove(
            "hidden"
        );

}


/* =========================================================
   AGRUPAMENTO
========================================================= */

function agruparSessoesPorData(
    sessoes
) {

    const grupos = {};


    sessoes.forEach(
        sessao => {

            const dataISO =
                obterDataISO(
                    sessao.dataHora
                );

            if (
                !dataISO
            ) {

                return;

            }


            if (
                !grupos[dataISO]
            ) {

                grupos[dataISO] =
                    [];

            }


            grupos[dataISO].push(
                sessao
            );

        }
    );


    return grupos;

}


/* =========================================================
   CARD
========================================================= */

function criarCardSessao(
    sessao
) {

    const clone =
        elementos.sessionCardTemplate
            .content
            .cloneNode(
                true
            );


    const card =
        clone.querySelector(
            ".scanner-session-card"
        );

    const titulo =
        clone.querySelector(
            ".scanner-session-title"
        );

    const data =
        clone.querySelector(
            ".scanner-session-date"
        );

    const horario =
        clone.querySelector(
            ".scanner-session-time"
        );

    const status =
        clone.querySelector(
            ".scanner-session-status"
        );

    const botaoEscanear =
        clone.querySelector(
            ".scanner-session-button"
        );


    if (
        card
    ) {

        card.dataset.sessionId =
            String(
                sessao.id
            );

    }


    if (
        titulo
    ) {

        titulo.textContent =
            obterTituloFilme(
                sessao
            );

    }


    if (
        data
    ) {

        data.textContent =
            formatarData(
                sessao.dataHora
            );

    }


    if (
        horario
    ) {

        horario.textContent =
            formatarHorario(
                sessao.dataHora
            );

    }


    const statusSessao =
        obterStatusSessao(
            sessao
        );


    if (
        status
    ) {

        status.textContent =
            statusSessao.texto;

        status.dataset.status =
            statusSessao.codigo;

    }


    configurarBotaoEscanear(
        botaoEscanear,
        sessao,
        statusSessao
    );


    return clone;

}


/* =========================================================
   FILME
========================================================= */

function obterTituloFilme(
    sessao
) {

    return (
        sessao.tituloFilme ||
        sessao.filme?.titulo ||
        sessao.nomeFilme ||
        "Filme não informado"
    );

}


/* =========================================================
   STATUS
========================================================= */

function obterStatusSessao(
    sessao
) {

    if (
        sessao.ativa === false
    ) {

        return {

            codigo:
                "inativa",

            texto:
                "Encerrada"

        };

    }


    const dataHora =
        converterParaData(
            sessao.dataHora
        );


    if (
        !dataHora
    ) {

        return {

            codigo:
                "indefinida",

            texto:
                "Indefinida"

        };

    }


    const agora =
        new Date();


    if (
        ehHoje(
            dataHora
        ) &&
        dataHora.getTime() <
            agora.getTime()
    ) {

        return {

            codigo:
                "iniciada",

            texto:
                "Iniciada"

        };

    }


    if (
        ehHoje(
            dataHora
        )
    ) {

        return {

            codigo:
                "hoje",

            texto:
                "Hoje"

        };

    }


    return {

        codigo:
            "futura",

        texto:
            "Futura"

    };

}


/* =========================================================
   BOTÃO ESCANEAR
========================================================= */

function configurarBotaoEscanear(
    botao,
    sessao,
    statusSessao
) {

    if (
        !botao
    ) {

        return;

    }


    /*
        Só bloqueamos sessão explicitamente
        inativa/encerrada.

        Não recriamos no frontend as regras
        de horário da validação.
    */

    if (
        statusSessao.codigo ===
        "inativa"
    ) {

        botao.classList.add(
            "disabled"
        );

        botao.setAttribute(
            "aria-disabled",
            "true"
        );

        botao.removeAttribute(
            "href"
        );

        botao.title =
            "Esta sessão já foi encerrada.";

        return;

    }


    botao.href =
        `camera-ingresso.html?sessaoId=${encodeURIComponent(sessao.id)}`;

}


/* =========================================================
   ORDENAÇÃO
========================================================= */

function ordenarPorHorario(
    sessaoA,
    sessaoB
) {

    const dataA =
        converterParaData(
            sessaoA.dataHora
        );

    const dataB =
        converterParaData(
            sessaoB.dataHora
        );


    if (
        !dataA &&
        !dataB
    ) {

        return 0;

    }


    if (
        !dataA
    ) {

        return 1;

    }


    if (
        !dataB
    ) {

        return -1;

    }


    return (
        dataA.getTime() -
        dataB.getTime()
    );

}


function ordenarDatasISO(
    dataA,
    dataB
) {

    const valorA =
        criarDataLocalPorISO(
            dataA
        );

    const valorB =
        criarDataLocalPorISO(
            dataB
        );


    if (
        !valorA &&
        !valorB
    ) {

        return 0;

    }


    if (
        !valorA
    ) {

        return 1;

    }


    if (
        !valorB
    ) {

        return -1;

    }


    return (
        valorA.getTime() -
        valorB.getTime()
    );

}


/* =========================================================
   DATAS
========================================================= */

function converterParaData(
    valor
) {

    if (
        !valor
    ) {

        return null;

    }


    const data =
        valor instanceof Date
            ? valor
            : new Date(valor);


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return null;

    }


    return data;

}


function ehHoje(
    valor
) {

    const data =
        converterParaData(
            valor
        );


    if (
        !data
    ) {

        return false;

    }


    const hoje =
        new Date();


    return (

        data.getFullYear() ===
            hoje.getFullYear()

        &&

        data.getMonth() ===
            hoje.getMonth()

        &&

        data.getDate() ===
            hoje.getDate()

    );

}


function obterInicioDoDia(
    data
) {

    return new Date(
        data.getFullYear(),
        data.getMonth(),
        data.getDate()
    );

}


function obterDataISO(
    valor
) {

    const data =
        converterParaData(
            valor
        );


    if (
        !data
    ) {

        return "";

    }


    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const dia =
        String(
            data.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${ano}-${mes}-${dia}`
    );

}


function criarDataLocalPorISO(
    dataISO
) {

    if (
        !dataISO
    ) {

        return null;

    }


    const partes =
        dataISO.split("-");


    if (
        partes.length !==
        3
    ) {

        return null;

    }


    const ano =
        Number(
            partes[0]
        );

    const mes =
        Number(
            partes[1]
        );

    const dia =
        Number(
            partes[2]
        );


    const data =
        new Date(
            ano,
            mes - 1,
            dia
        );


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return null;

    }


    return data;

}


/* =========================================================
   FORMATAÇÕES
========================================================= */

function formatarData(
    valor
) {

    const data =
        converterParaData(
            valor
        );


    if (
        !data
    ) {

        return "--/--/----";

    }


    return data.toLocaleDateString(
        "pt-BR",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"
        }
    );

}


function formatarHorario(
    valor
) {

    const data =
        converterParaData(
            valor
        );


    if (
        !data
    ) {

        return "--:--";

    }


    return data.toLocaleTimeString(
        "pt-BR",
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


function obterDiaSemanaCurto(
    dataISO
) {

    const data =
        criarDataLocalPorISO(
            dataISO
        );


    if (
        !data
    ) {

        return "";

    }


    const texto =
        data.toLocaleDateString(
            "pt-BR",
            {
                weekday:
                    "short"
            }
        )
        .replace(
            ".",
            ""
        );


    return primeiraLetraMaiuscula(
        texto
    );

}


function formatarDataBotao(
    dataISO
) {

    const data =
        criarDataLocalPorISO(
            dataISO
        );


    if (
        !data
    ) {

        return "--/--";

    }


    return data.toLocaleDateString(
        "pt-BR",
        {
            day:
                "2-digit",

            month:
                "2-digit"
        }
    );

}


function formatarTituloData(
    dataISO
) {

    const data =
        criarDataLocalPorISO(
            dataISO
        );


    if (
        !data
    ) {

        return "";

    }


    return primeiraLetraMaiuscula(
        data.toLocaleDateString(
            "pt-BR",
            {
                weekday:
                    "long",

                day:
                    "2-digit",

                month:
                    "long",

                year:
                    "numeric"
            }
        )
    );

}


function primeiraLetraMaiuscula(
    texto
) {

    if (
        !texto
    ) {

        return "";

    }


    return (
        texto
            .charAt(0)
            .toUpperCase()
        +
        texto.slice(1)
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