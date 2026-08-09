/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const RELATORIO_ENDPOINT =
    "/Relatorio";

const LOCALE =
    "pt-BR";

const MOEDA =
    "BRL";


/* =========================================================
   ELEMENTOS
========================================================= */

const elementos = {

    /* SIDEBAR */

    sidebar:
        document.getElementById(
            "sidebar"
        ),

    sidebarOverlay:
        document.getElementById(
            "sidebar-overlay"
        ),

    sidebarOpenButton:
        document.getElementById(
            "sidebar-open-button"
        ),

    sidebarCloseButton:
        document.getElementById(
            "sidebar-close-button"
        ),

    logoutButton:
        document.getElementById(
            "logout-button"
        ),

    sidebarUserAvatar:
        document.getElementById(
            "sidebar-user-avatar"
        ),

    sidebarUserName:
        document.getElementById(
            "sidebar-user-name"
        ),


    /* FILTRO */

    periodButtons:
        document.querySelectorAll(
            ".period-button"
        ),

    selectedPeriod:
        document.getElementById(
            "selected-period"
        ),

    customPeriodForm:
        document.getElementById(
            "custom-period-form"
        ),

    customStartDate:
        document.getElementById(
            "custom-start-date"
        ),

    customEndDate:
        document.getElementById(
            "custom-end-date"
        ),


    /* ESTADOS */

    loading:
        document.getElementById(
            "reports-loading"
        ),

    error:
        document.getElementById(
            "reports-error"
        ),

    errorMessage:
        document.getElementById(
            "reports-error-message"
        ),

    retryButton:
        document.getElementById(
            "reports-retry-button"
        ),

    content:
        document.getElementById(
            "reports-content"
        ),


    /* RESUMO */

    summaryRevenue:
        document.getElementById(
            "summary-revenue"
        ),

    summarySales:
        document.getElementById(
            "summary-sales"
        ),

    summaryTickets:
        document.getElementById(
            "summary-tickets"
        ),

    summaryAttendance:
        document.getElementById(
            "summary-attendance"
        ),

    summaryAttendanceDetail:
        document.getElementById(
            "summary-attendance-detail"
        ),

    summaryCourtesy:
        document.getElementById(
            "summary-courtesy"
        ),


    /* GRÁFICO PRINCIPAL */

    revenueChart:
        document.getElementById(
            "revenue-chart"
        ),


    /* DESTAQUES */

    highlightBestSellingMovie:
        document.getElementById(
            "highlight-best-selling-movie"
        ),

    highlightBestSellingMovieDetail:
        document.getElementById(
            "highlight-best-selling-movie-detail"
        ),

    highlightHighestRevenueMovie:
        document.getElementById(
            "highlight-highest-revenue-movie"
        ),

    highlightHighestRevenueMovieDetail:
        document.getElementById(
            "highlight-highest-revenue-movie-detail"
        ),

    highlightBestSession:
        document.getElementById(
            "highlight-best-session"
        ),

    highlightBestSessionDetail:
        document.getElementById(
            "highlight-best-session-detail"
        ),


    /* FILMES */

    moviesTableWrapper:
        document.getElementById(
            "movies-table-wrapper"
        ),

    moviesPerformanceBody:
        document.getElementById(
            "movies-performance-body"
        ),

    moviesEmpty:
        document.getElementById(
            "movies-empty"
        ),

    movieRowTemplate:
        document.getElementById(
            "movie-row-template"
        ),


    /* ORIGEM */

    salesOriginChart:
        document.getElementById(
            "sales-origin-chart"
        ),

    salesOriginList:
        document.getElementById(
            "sales-origin-list"
        ),

    salesOriginEmpty:
        document.getElementById(
            "sales-origin-empty"
        ),


    /* PAGAMENTO */

    paymentMethodChart:
        document.getElementById(
            "payment-method-chart"
        ),

    paymentMethodList:
        document.getElementById(
            "payment-method-list"
        ),

    paymentMethodEmpty:
        document.getElementById(
            "payment-method-empty"
        ),


    /* TEMPLATE DISTRIBUIÇÃO */

    distributionItemTemplate:
        document.getElementById(
            "distribution-item-template"
        )

};


/* =========================================================
   ESTADO
========================================================= */

const estado = {

    relatorio:
        null,

    periodoAtual:
        "today",

    inicio:
        null,

    fim:
        null,

    carregando:
        false,

    graficos: {
        faturamento:
            null,

        origem:
            null,

        pagamento:
            null
    }

};


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    iniciarPagina
);


async function iniciarPagina() {

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


    configurarFuncionario(
        usuario
    );


    configurarEventos();


    configurarLimitesDatas();


    /*
        Período padrão:
        HOJE
    */

    const periodo =
        calcularPeriodo(
            "today"
        );


    estado.inicio =
        periodo.inicio;

    estado.fim =
        periodo.fim;


    atualizarPeriodoSelecionado();


    await carregarRelatorio();

}


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function obterUsuarioAutenticado() {

    const token =
        localStorage.getItem(
            "token"
        );

    const usuarioArmazenado =
        localStorage.getItem(
            "usuario"
        );


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
        String(
            usuario.nome ||
            "Funcionário"
        ).trim();


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
            carregarRelatorio
        );


    elementos.periodButtons
        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        selecionarPeriodo(
                            botao.dataset.period
                        );

                    }
                );

            }
        );


    elementos.customPeriodForm
        ?.addEventListener(
            "submit",
            aplicarPeriodoPersonalizado
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


    destruirGraficos();


    redirecionarParaLogin();

}


/* =========================================================
   SELEÇÃO DO PERÍODO
========================================================= */

async function selecionarPeriodo(
    periodo
) {

    if (
        estado.carregando
    ) {

        return;

    }


    if (!periodo) {

        return;

    }


    estado.periodoAtual =
        periodo;


    atualizarBotaoPeriodoAtivo(
        periodo
    );


    if (
        periodo ===
        "custom"
    ) {

        elementos.customPeriodForm
            ?.classList.remove(
                "hidden"
            );


        prepararFormularioPersonalizado();


        return;

    }


    elementos.customPeriodForm
        ?.classList.add(
            "hidden"
        );


    const intervalo =
        calcularPeriodo(
            periodo
        );


    if (!intervalo) {

        return;

    }


    estado.inicio =
        intervalo.inicio;

    estado.fim =
        intervalo.fim;


    atualizarPeriodoSelecionado();


    await carregarRelatorio();

}


/* =========================================================
   BOTÃO ATIVO
========================================================= */

function atualizarBotaoPeriodoAtivo(
    periodo
) {

    elementos.periodButtons
        .forEach(
            botao => {

                botao.classList.toggle(
                    "active",
                    botao.dataset.period ===
                        periodo
                );

            }
        );

}


/* =========================================================
   CALCULAR PERÍODOS
========================================================= */

function calcularPeriodo(
    periodo
) {

    const hoje =
        obterHojeLocal();


    switch (periodo) {

        /* HOJE */

        case "today":

            return {

                inicio:
                    formatarDataISO(
                        hoje
                    ),

                fim:
                    formatarDataISO(
                        hoje
                    )

            };


        /* ÚLTIMOS 7 DIAS */

        case "7days": {

            const inicio =
                adicionarDias(
                    hoje,
                    -6
                );


            return {

                inicio:
                    formatarDataISO(
                        inicio
                    ),

                fim:
                    formatarDataISO(
                        hoje
                    )

            };

        }


        /* ÚLTIMOS 30 DIAS */

        case "30days": {

            const inicio =
                adicionarDias(
                    hoje,
                    -29
                );


            return {

                inicio:
                    formatarDataISO(
                        inicio
                    ),

                fim:
                    formatarDataISO(
                        hoje
                    )

            };

        }


        /* ANO ATUAL */

        case "year": {

            const inicio =
                new Date(
                    hoje.getFullYear(),
                    0,
                    1
                );


            /*
                Eu prefiro mandar ATÉ HOJE,
                e não até 31/12.

                Assim "Este ano" significa:
                dados acumulados neste ano até agora.
            */

            return {

                inicio:
                    formatarDataISO(
                        inicio
                    ),

                fim:
                    formatarDataISO(
                        hoje
                    )

            };

        }


        default:

            return null;

    }

}


/* =========================================================
   PERSONALIZADO
========================================================= */

function prepararFormularioPersonalizado() {

    if (
        elementos.customStartDate &&
        !elementos.customStartDate.value
    ) {

        elementos.customStartDate.value =
            estado.inicio ||
            formatarDataISO(
                obterHojeLocal()
            );

    }


    if (
        elementos.customEndDate &&
        !elementos.customEndDate.value
    ) {

        elementos.customEndDate.value =
            estado.fim ||
            formatarDataISO(
                obterHojeLocal()
            );

    }

}


async function aplicarPeriodoPersonalizado(
    evento
) {

    evento.preventDefault();


    if (
        estado.carregando
    ) {

        return;

    }


    const inicio =
        elementos.customStartDate
            ?.value;


    const fim =
        elementos.customEndDate
            ?.value;


    if (
        !inicio ||
        !fim
    ) {

        exibirErro(
            "Informe a data inicial e a data final."
        );


        return;

    }


    const dataInicio =
        criarDataLocalPorISO(
            inicio
        );


    const dataFim =
        criarDataLocalPorISO(
            fim
        );


    if (
        !dataInicio ||
        !dataFim
    ) {

        exibirErro(
            "O período informado é inválido."
        );


        return;

    }


    if (
        dataInicio.getTime() >
        dataFim.getTime()
    ) {

        exibirErro(
            "A data inicial não pode ser maior que a data final."
        );


        return;

    }


    estado.inicio =
        inicio;

    estado.fim =
        fim;


    atualizarPeriodoSelecionado();


    await carregarRelatorio();

}


/* =========================================================
   LIMITES DOS INPUTS
========================================================= */

function configurarLimitesDatas() {

    const hoje =
        formatarDataISO(
            obterHojeLocal()
        );


    if (
        elementos.customStartDate
    ) {

        /*
            Permitimos períodos futuros também,
            porque o backend suporta períodos
            sem vendas.

            Então não definimos max=hoje.
        */

        elementos.customStartDate
            .addEventListener(
                "change",
                () => {

                    if (
                        elementos.customEndDate
                    ) {

                        elementos.customEndDate.min =
                            elementos.customStartDate.value;

                    }

                }
            );

    }


    if (
        elementos.customEndDate
    ) {

        elementos.customEndDate.value =
            elementos.customEndDate.value ||
            hoje;

    }

}


/* =========================================================
   PERÍODO EXIBIDO
========================================================= */

function atualizarPeriodoSelecionado() {

    if (
        !elementos.selectedPeriod ||
        !estado.inicio ||
        !estado.fim
    ) {

        return;

    }


    const inicio =
        formatarDataCurtaISO(
            estado.inicio
        );


    const fim =
        formatarDataCurtaISO(
            estado.fim
        );


    if (
        estado.inicio ===
        estado.fim
    ) {

        elementos.selectedPeriod
            .textContent =
            inicio;


        return;

    }


    elementos.selectedPeriod
        .textContent =
        `${inicio} até ${fim}`;

}


/* =========================================================
   CARREGAR RELATÓRIO
========================================================= */

async function carregarRelatorio() {

    if (
        estado.carregando ||
        !estado.inicio ||
        !estado.fim
    ) {

        return;

    }


    definirCarregando(
        true
    );


    esconderErro();


    try {

        const parametros =
            new URLSearchParams({

                inicio:
                    estado.inicio,

                fim:
                    estado.fim

            });


        const resposta =
            await apiRequest(
                `${RELATORIO_ENDPOINT}?${parametros.toString()}`
            );


        if (!resposta.ok) {

            tratarErroResposta(
                resposta
            );


            return;

        }


        if (
            !resposta.data ||
            typeof resposta.data !==
                "object"
        ) {

            throw new Error(
                "O servidor retornou um relatório inválido."
            );

        }


        estado.relatorio =
            resposta.data;


        renderizarRelatorio(
            estado.relatorio
        );


        esconderErro();


        elementos.content
            ?.classList.remove(
                "hidden"
            );

    }
    catch (erro) {

        console.error(
            "Erro ao carregar relatório:",
            erro
        );


        exibirErro(
            erro.message ||
            "Não foi possível carregar o relatório."
        );

    }
    finally {

        definirCarregando(
            false
        );

    }

}


/* =========================================================
   ERROS DA API
========================================================= */

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
        resposta.data?.mensagem ||
        resposta.data?.message ||
        "Não foi possível carregar o relatório."
    );

}


/* =========================================================
   ESTADO DE LOADING
========================================================= */

function definirCarregando(
    carregando
) {

    estado.carregando =
        carregando;


    elementos.loading
        ?.classList.toggle(
            "hidden",
            !carregando
        );


    /*
        Mantemos o conteúdo antigo escondido
        enquanto troca de período para evitar
        mostrar números de um período com
        o filtro de outro.
    */

    if (carregando) {

        elementos.content
            ?.classList.add(
                "hidden"
            );

    }


    elementos.periodButtons
        .forEach(
            botao => {

                botao.disabled =
                    carregando;

            }
        );


    if (
        elementos.customStartDate
    ) {

        elementos.customStartDate.disabled =
            carregando;

    }


    if (
        elementos.customEndDate
    ) {

        elementos.customEndDate.disabled =
            carregando;

    }

}


/* =========================================================
   ERRO VISUAL
========================================================= */

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

        elementos.errorMessage.textContent =
            mensagem;

    }

}


function esconderErro() {

    elementos.error
        ?.classList.add(
            "hidden"
        );

}


/* =========================================================
   RENDERIZAÇÃO PRINCIPAL
========================================================= */

function renderizarRelatorio(
    relatorio
) {

    renderizarResumo(
        relatorio
    );


    renderizarDestaques(
        relatorio
    );


    renderizarFilmes(
        relatorio.filmes || []
    );


    renderizarOrigemVendas(
        relatorio.origens || []
    );


    renderizarFormasPagamento(
        relatorio.formasPagamento || []
    );


    renderizarGraficoFaturamento(
        relatorio.evolucao || []
    );

}


/* =========================================================
   RESUMO
========================================================= */

function renderizarResumo(
    relatorio
) {

    if (
        elementos.summaryRevenue
    ) {

        elementos.summaryRevenue
            .textContent =
            formatarMoeda(
                relatorio.faturamento
            );

    }


    if (
        elementos.summarySales
    ) {

        elementos.summarySales
            .textContent =
            formatarNumero(
                relatorio.vendasRealizadas
            );

    }


    if (
        elementos.summaryTickets
    ) {

        elementos.summaryTickets
            .textContent =
            formatarNumero(
                relatorio.ingressosVendidos
            );

    }


    if (
        elementos.summaryAttendance
    ) {

        /*
            O BACKEND JÁ RETORNA:
            89.38

            e NÃO:
            0.8938
        */

        elementos.summaryAttendance
            .textContent =
            formatarPercentual(
                relatorio.taxaComparecimento
            );

    }


    if (
        elementos.summaryAttendanceDetail
    ) {

        const utilizados =
            numeroSeguro(
                relatorio.ingressosUtilizados
            );


        const vendidos =
            numeroSeguro(
                relatorio.ingressosVendidos
            );


        elementos.summaryAttendanceDetail
            .textContent =
            `${formatarNumero(utilizados)} de ${formatarNumero(vendidos)} ingressos utilizados`;

    }


    if (
        elementos.summaryCourtesy
    ) {

        elementos.summaryCourtesy
            .textContent =
            formatarNumero(
                relatorio.ingressosCortesia
            );

    }

}


/* =========================================================
   DESTAQUES
========================================================= */

function renderizarDestaques(
    relatorio
) {

    renderizarFilmeMaisVendido(
        relatorio.filmeMaisVendido
    );


    renderizarFilmeMaiorFaturamento(
        relatorio.filmeMaiorFaturamento
    );


    renderizarSessaoMaisVendida(
        relatorio.sessaoMaisVendida
    );

}


/* =========================================================
   FILME MAIS VENDIDO
========================================================= */

function renderizarFilmeMaisVendido(
    filme
) {

    if (!filme) {

        if (
            elementos.highlightBestSellingMovie
        ) {

            elementos.highlightBestSellingMovie
                .textContent =
                "Nenhum dado";

        }


        if (
            elementos.highlightBestSellingMovieDetail
        ) {

            elementos.highlightBestSellingMovieDetail
                .textContent =
                "Nenhum ingresso vendido no período.";

        }


        return;

    }


    if (
        elementos.highlightBestSellingMovie
    ) {

        elementos.highlightBestSellingMovie
            .textContent =
            filme.titulo ||
            "Filme";

    }


    if (
        elementos.highlightBestSellingMovieDetail
    ) {

        const quantidade =
            numeroSeguro(
                filme.ingressosVendidos
            );


        elementos.highlightBestSellingMovieDetail
            .textContent =
            `${formatarNumero(quantidade)} ${quantidade === 1 ? "ingresso vendido" : "ingressos vendidos"}`;

    }

}


/* =========================================================
   MAIOR FATURAMENTO
========================================================= */

function renderizarFilmeMaiorFaturamento(
    filme
) {

    if (!filme) {

        if (
            elementos.highlightHighestRevenueMovie
        ) {

            elementos.highlightHighestRevenueMovie
                .textContent =
                "Nenhum dado";

        }


        if (
            elementos.highlightHighestRevenueMovieDetail
        ) {

            elementos.highlightHighestRevenueMovieDetail
                .textContent =
                "Nenhum faturamento registrado no período.";

        }


        return;

    }


    if (
        elementos.highlightHighestRevenueMovie
    ) {

        elementos.highlightHighestRevenueMovie
            .textContent =
            filme.titulo ||
            "Filme";

    }


    if (
        elementos.highlightHighestRevenueMovieDetail
    ) {

        elementos.highlightHighestRevenueMovieDetail
            .textContent =
            formatarMoeda(
                filme.faturamento
            );

    }

}


/* =========================================================
   SESSÃO MAIS VENDIDA
========================================================= */

function renderizarSessaoMaisVendida(
    sessao
) {

    if (!sessao) {

        if (
            elementos.highlightBestSession
        ) {

            elementos.highlightBestSession
                .textContent =
                "Nenhum dado";

        }


        if (
            elementos.highlightBestSessionDetail
        ) {

            elementos.highlightBestSessionDetail
                .textContent =
                "Nenhuma sessão possui vendas no período.";

        }


        return;

    }


    if (
        elementos.highlightBestSession
    ) {

        elementos.highlightBestSession
            .textContent =
            sessao.filme ||
            "Sessão";

    }


    if (
        elementos.highlightBestSessionDetail
    ) {

        const dataHora =
            converterParaData(
                sessao.dataHora
            );


        const quantidade =
            numeroSeguro(
                sessao.ingressosVendidos
            );


        const textoData =
            dataHora
                ? `${formatarData(dataHora)} às ${formatarHorario(dataHora)}`
                : "Data não informada";


        elementos.highlightBestSessionDetail
            .textContent =
            `${textoData} • ${formatarNumero(quantidade)} ${quantidade === 1 ? "ingresso" : "ingressos"}`;

    }

}


/* =========================================================
   FILMES
========================================================= */

function renderizarFilmes(
    filmes
) {

    elementos.moviesPerformanceBody
        ?.replaceChildren();


    if (
        !Array.isArray(filmes) ||
        filmes.length === 0
    ) {

        elementos.moviesTableWrapper
            ?.classList.add(
                "hidden"
            );


        elementos.moviesEmpty
            ?.classList.remove(
                "hidden"
            );


        return;

    }


    elementos.moviesTableWrapper
        ?.classList.remove(
            "hidden"
        );


    elementos.moviesEmpty
        ?.classList.add(
            "hidden"
        );


    const fragmento =
        document.createDocumentFragment();


    filmes.forEach(
        (
            filme,
            indice
        ) => {

            fragmento.append(
                criarLinhaFilme(
                    filme,
                    indice
                )
            );

        }
    );


    elementos.moviesPerformanceBody
        ?.append(
            fragmento
        );

}


/* =========================================================
   LINHA DO FILME
========================================================= */

function criarLinhaFilme(
    filme,
    indice
) {

    const clone =
        elementos.movieRowTemplate
            .content
            .cloneNode(
                true
            );


    const ranking =
        clone.querySelector(
            ".movie-ranking"
        );


    const titulo =
        clone.querySelector(
            ".movie-title"
        );


    const ingressos =
        clone.querySelector(
            ".movie-tickets"
        );


    const porcentagem =
        clone.querySelector(
            ".movie-percentage"
        );


    const progresso =
        clone.querySelector(
            ".movie-percentage-progress"
        );


    const faturamento =
        clone.querySelector(
            ".movie-revenue"
        );


    if (ranking) {

        ranking.textContent =
            String(
                indice + 1
            );

    }


    if (titulo) {

        titulo.textContent =
            filme.titulo ||
            "Filme";

    }


    if (ingressos) {

        ingressos.textContent =
            formatarNumero(
                filme.ingressosVendidos
            );

    }


    const percentual =
        limitarPercentual(
            filme.percentualIngressos
        );


    if (porcentagem) {

        porcentagem.textContent =
            formatarPercentual(
                percentual
            );

    }


    if (progresso) {

        progresso.style.width =
            `${percentual}%`;

    }


    if (faturamento) {

        faturamento.textContent =
            formatarMoeda(
                filme.faturamento
            );

    }


    return clone;

}


/* =========================================================
   ORIGEM DAS VENDAS
========================================================= */

function renderizarOrigemVendas(
    origens
) {

    elementos.salesOriginList
        ?.replaceChildren();


    destruirGrafico(
        "origem"
    );


    if (
        !Array.isArray(origens) ||
        origens.length === 0
    ) {

        elementos.salesOriginEmpty
            ?.classList.remove(
                "hidden"
            );


        elementos.salesOriginList
            ?.classList.add(
                "hidden"
            );


        if (
            elementos.salesOriginChart
        ) {

            elementos.salesOriginChart
                .parentElement
                ?.classList.add(
                    "hidden"
                );

        }


        return;

    }


    elementos.salesOriginEmpty
        ?.classList.add(
            "hidden"
        );


    elementos.salesOriginList
        ?.classList.remove(
            "hidden"
        );


    elementos.salesOriginChart
        ?.parentElement
        ?.classList.remove(
            "hidden"
        );


    const fragmento =
        document.createDocumentFragment();


    origens.forEach(
        (
            item,
            indice
        ) => {

            fragmento.append(
                criarItemDistribuicao(
                    {
                        nome:
                            formatarOrigem(
                                item.origem
                            ),

                        ingressos:
                            item.ingressos,

                        percentual:
                            item.percentualIngressos,

                        faturamento:
                            item.faturamento,

                        indice
                    }
                )
            );

        }
    );


    elementos.salesOriginList
        ?.append(
            fragmento
        );


    criarGraficoOrigem(
        origens
    );

}


/* =========================================================
   FORMAS DE PAGAMENTO
========================================================= */

function renderizarFormasPagamento(
    formas
) {

    elementos.paymentMethodList
        ?.replaceChildren();


    destruirGrafico(
        "pagamento"
    );


    if (
        !Array.isArray(formas) ||
        formas.length === 0
    ) {

        elementos.paymentMethodEmpty
            ?.classList.remove(
                "hidden"
            );


        elementos.paymentMethodList
            ?.classList.add(
                "hidden"
            );


        elementos.paymentMethodChart
            ?.parentElement
            ?.classList.add(
                "hidden"
            );


        return;

    }


    elementos.paymentMethodEmpty
        ?.classList.add(
            "hidden"
        );


    elementos.paymentMethodList
        ?.classList.remove(
            "hidden"
        );


    elementos.paymentMethodChart
        ?.parentElement
        ?.classList.remove(
            "hidden"
        );


    const fragmento =
        document.createDocumentFragment();


    formas.forEach(
        (
            item,
            indice
        ) => {

            fragmento.append(
                criarItemDistribuicao(
                    {
                        nome:
                            formatarFormaPagamento(
                                item.formaPagamento
                            ),

                        ingressos:
                            item.ingressos,

                        percentual:
                            item.percentualIngressos,

                        faturamento:
                            item.faturamento,

                        indice
                    }
                )
            );

        }
    );


    elementos.paymentMethodList
        ?.append(
            fragmento
        );


    criarGraficoPagamento(
        formas
    );

}


/* =========================================================
   ITEM DE DISTRIBUIÇÃO
========================================================= */

function criarItemDistribuicao(
    dados
) {

    const clone =
        elementos.distributionItemTemplate
            .content
            .cloneNode(
                true
            );


    const cor =
        clone.querySelector(
            ".distribution-color"
        );


    const nome =
        clone.querySelector(
            ".distribution-name"
        );


    const detalhe =
        clone.querySelector(
            ".distribution-detail"
        );


    const percentual =
        clone.querySelector(
            ".distribution-percentage"
        );


    const faturamento =
        clone.querySelector(
            ".distribution-revenue"
        );


    if (cor) {

        cor.dataset.index =
            String(
                dados.indice
            );

    }


    if (nome) {

        nome.textContent =
            dados.nome;

    }


    const quantidade =
        numeroSeguro(
            dados.ingressos
        );


    if (detalhe) {

        detalhe.textContent =
            `${formatarNumero(quantidade)} ${quantidade === 1 ? "ingresso" : "ingressos"}`;

    }


    if (percentual) {

        percentual.textContent =
            formatarPercentual(
                dados.percentual
            );

    }


    if (faturamento) {

        faturamento.textContent =
            formatarMoeda(
                dados.faturamento
            );

    }


    return clone;

}


/* =========================================================
   GRÁFICO DE FATURAMENTO
========================================================= */

function renderizarGraficoFaturamento(
    evolucao
) {

    destruirGrafico(
        "faturamento"
    );


    if (
        typeof Chart ===
            "undefined" ||
        !elementos.revenueChart
    ) {

        console.warn(
            "Chart.js não está disponível."
        );


        return;

    }


    if (
        !Array.isArray(
            evolucao
        )
    ) {

        return;

    }


    const labels =
        evolucao.map(
            item =>
                formatarDataGrafico(
                    item.data
                )
        );


    const valores =
        evolucao.map(
            item =>
                numeroSeguro(
                    item.faturamento
                )
        );


    const contexto =
        elementos.revenueChart
            .getContext(
                "2d"
            );


    const gradiente =
        contexto.createLinearGradient(
            0,
            0,
            0,
            340
        );


    gradiente.addColorStop(
        0,
        "rgba(229, 9, 20, 0.28)"
    );


    gradiente.addColorStop(
        1,
        "rgba(229, 9, 20, 0)"
    );


    estado.graficos.faturamento =
        new Chart(
            contexto,
            {

                type:
                    "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Faturamento",

                            data:
                                valores,

                            borderColor:
                                "#e50914",

                            backgroundColor:
                                gradiente,

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            fill:
                                true,

                            pointRadius:
                                evolucao.length > 45
                                    ? 0
                                    : 3,

                            pointHoverRadius:
                                5,

                            pointBackgroundColor:
                                "#e50914",

                            pointBorderColor:
                                "#ffffff",

                            pointBorderWidth:
                                1

                        }

                    ]

                },

                options:
                    obterOpcoesGraficoFaturamento()

            }
        );

}


/* =========================================================
   OPÇÕES DO GRÁFICO PRINCIPAL
========================================================= */

function obterOpcoesGraficoFaturamento() {

    return {

        responsive:
            true,

        maintainAspectRatio:
            false,

        interaction: {

            mode:
                "index",

            intersect:
                false

        },

        plugins: {

            legend: {
                display:
                    false
            },

            tooltip: {

                backgroundColor:
                    "#151515",

                titleColor:
                    "#ffffff",

                bodyColor:
                    "#bdbdbd",

                borderColor:
                    "rgba(255,255,255,0.1)",

                borderWidth:
                    1,

                padding:
                    11,

                callbacks: {

                    label:
                        contexto =>
                            ` ${formatarMoeda(contexto.parsed.y)}`

                }

            }

        },

        scales: {

            x: {

                grid: {
                    display:
                        false
                },

                ticks: {

                    color:
                        "#777777",

                    maxRotation:
                        0,

                    autoSkip:
                        true,

                    maxTicksLimit:
                        10

                },

                border: {
                    display:
                        false
                }

            },

            y: {

                beginAtZero:
                    true,

                grid: {

                    color:
                        "rgba(255,255,255,0.05)"

                },

                border: {
                    display:
                        false
                },

                ticks: {

                    color:
                        "#777777",

                    callback:
                        valor =>
                            formatarMoedaCompacta(
                                valor
                            )

                }

            }

        }

    };

}


/* =========================================================
   GRÁFICO DE ORIGEM
========================================================= */

function criarGraficoOrigem(
    origens
) {

    if (
        typeof Chart ===
            "undefined" ||
        !elementos.salesOriginChart
    ) {

        return;

    }


    const labels =
        origens.map(
            item =>
                formatarOrigem(
                    item.origem
                )
        );


    const valores =
        origens.map(
            item =>
                numeroSeguro(
                    item.ingressos
                )
        );


    estado.graficos.origem =
        criarGraficoRosca(
            elementos.salesOriginChart,
            labels,
            valores
        );

}


/* =========================================================
   GRÁFICO DE PAGAMENTO
========================================================= */

function criarGraficoPagamento(
    formas
) {

    if (
        typeof Chart ===
            "undefined" ||
        !elementos.paymentMethodChart
    ) {

        return;

    }


    const labels =
        formas.map(
            item =>
                formatarFormaPagamento(
                    item.formaPagamento
                )
        );


    const valores =
        formas.map(
            item =>
                numeroSeguro(
                    item.ingressos
                )
        );


    estado.graficos.pagamento =
        criarGraficoRosca(
            elementos.paymentMethodChart,
            labels,
            valores
        );

}


/* =========================================================
   GRÁFICO ROSCA
========================================================= */

function criarGraficoRosca(
    canvas,
    labels,
    valores
) {

    const cores = [
        "#e50914",
        "#ff5964",
        "#8f0710",
        "#ff8a91",
        "#6b6b6b"
    ];


    return new Chart(
        canvas.getContext(
            "2d"
        ),
        {

            type:
                "doughnut",

            data: {

                labels,

                datasets: [

                    {

                        data:
                            valores,

                        backgroundColor:
                            cores.slice(
                                0,
                                valores.length
                            ),

                        borderColor:
                            "#111111",

                        borderWidth:
                            3,

                        hoverOffset:
                            5

                    }

                ]

            },

            options: {

                responsive:
                    true,

                maintainAspectRatio:
                    false,

                cutout:
                    "70%",

                plugins: {

                    legend: {
                        display:
                            false
                    },

                    tooltip: {

                        backgroundColor:
                            "#151515",

                        titleColor:
                            "#ffffff",

                        bodyColor:
                            "#bdbdbd",

                        borderColor:
                            "rgba(255,255,255,0.1)",

                        borderWidth:
                            1,

                        padding:
                            10,

                        callbacks: {

                            label:
                                contexto => {

                                    const valor =
                                        numeroSeguro(
                                            contexto.raw
                                        );


                                    return ` ${formatarNumero(valor)} ${valor === 1 ? "ingresso" : "ingressos"}`;

                                }

                        }

                    }

                }

            }

        }
    );

}


/* =========================================================
   DESTRUIR GRÁFICOS
========================================================= */

function destruirGrafico(
    nome
) {

    const grafico =
        estado.graficos[
            nome
        ];


    if (grafico) {

        grafico.destroy();


        estado.graficos[
            nome
        ] =
            null;

    }

}


function destruirGraficos() {

    destruirGrafico(
        "faturamento"
    );


    destruirGrafico(
        "origem"
    );


    destruirGrafico(
        "pagamento"
    );

}


/* =========================================================
   ORIGEM
========================================================= */

function formatarOrigem(
    origem
) {

    switch (
        String(
            origem ||
            ""
        ).toLowerCase()
    ) {

        case "online":

            return "Online";


        case "bilheteria":

            return "Bilheteria";


        default:

            return origem ||
                "Não informado";

    }

}


/* =========================================================
   PAGAMENTO
========================================================= */

function formatarFormaPagamento(
    forma
) {

    switch (
        String(
            forma ||
            ""
        ).toLowerCase()
    ) {

        case "pix":

            return "PIX";


        case "cartao":

            return "Cartão";


        case "dinheiro":

            return "Dinheiro";


        case "cortesia":

            return "Cortesia";


        default:

            return forma ||
                "Não informado";

    }

}


/* =========================================================
   NÚMEROS
========================================================= */

function numeroSeguro(
    valor
) {

    const numero =
        Number(
            valor
        );


    return Number.isFinite(
        numero
    )
        ? numero
        : 0;

}


function formatarNumero(
    valor
) {

    return numeroSeguro(
        valor
    )
    .toLocaleString(
        LOCALE
    );

}


/* =========================================================
   MOEDA
========================================================= */

function formatarMoeda(
    valor
) {

    return numeroSeguro(
        valor
    )
    .toLocaleString(
        LOCALE,
        {

            style:
                "currency",

            currency:
                MOEDA

        }
    );

}


function formatarMoedaCompacta(
    valor
) {

    const numero =
        numeroSeguro(
            valor
        );


    if (
        Math.abs(numero) >=
        1000000
    ) {

        return (
            "R$ " +
            (
                numero /
                1000000
            )
            .toLocaleString(
                LOCALE,
                {
                    maximumFractionDigits:
                        1
                }
            ) +
            " mi"
        );

    }


    if (
        Math.abs(numero) >=
        1000
    ) {

        return (
            "R$ " +
            (
                numero /
                1000
            )
            .toLocaleString(
                LOCALE,
                {
                    maximumFractionDigits:
                        1
                }
            ) +
            " mil"
        );

    }


    return (
        "R$ " +
        numero.toLocaleString(
            LOCALE,
            {
                maximumFractionDigits:
                    0
            }
        )
    );

}


/* =========================================================
   PERCENTUAL
========================================================= */

function formatarPercentual(
    valor
) {

    const numero =
        numeroSeguro(
            valor
        );


    return (
        numero.toLocaleString(
            LOCALE,
            {

                minimumFractionDigits:
                    numero % 1 === 0
                        ? 0
                        : 2,

                maximumFractionDigits:
                    2

            }
        ) +
        "%"
    );

}


function limitarPercentual(
    valor
) {

    const numero =
        numeroSeguro(
            valor
        );


    return Math.min(
        100,
        Math.max(
            0,
            numero
        )
    );

}


/* =========================================================
   DATA
========================================================= */

function obterHojeLocal() {

    const agora =
        new Date();


    return new Date(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate()
    );

}


function adicionarDias(
    data,
    quantidade
) {

    const copia =
        new Date(
            data
        );


    copia.setDate(
        copia.getDate() +
        quantidade
    );


    return copia;

}


function formatarDataISO(
    data
) {

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


    return `${ano}-${mes}-${dia}`;

}


function criarDataLocalPorISO(
    valor
) {

    if (!valor) {

        return null;

    }


    const parteData =
        String(
            valor
        )
        .split(
            "T"
        )[0];


    const partes =
        parteData.split(
            "-"
        );


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


function converterParaData(
    valor
) {

    if (!valor) {

        return null;

    }


    const data =
        new Date(
            valor
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


function formatarData(
    data
) {

    if (!data) {

        return "--/--/----";

    }


    return data.toLocaleDateString(
        LOCALE,
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
    data
) {

    if (!data) {

        return "--:--";

    }


    return data.toLocaleTimeString(
        LOCALE,
        {

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    );

}


function formatarDataCurtaISO(
    valor
) {

    const data =
        criarDataLocalPorISO(
            valor
        );


    if (!data) {

        return "--/--/----";

    }


    return formatarData(
        data
    );

}


function formatarDataGrafico(
    valor
) {

    const data =
        criarDataLocalPorISO(
            valor
        );


    if (!data) {

        return valor ||
            "--";

    }


    return data.toLocaleDateString(
        LOCALE,
        {

            day:
                "2-digit",

            month:
                "2-digit"

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

    destruirGraficos();


    window.location.replace(
        "../public/home.html"
    );

}