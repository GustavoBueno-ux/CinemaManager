/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const INGRESSO_RECUPERACAO_ENDPOINT =
    "/Ingresso/bilheteria/codigo";

const CARACTERES_VALIDOS_CODIGO =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const TAMANHO_CODIGO_RECUPERACAO = 8;


/* =========================================================
   ELEMENTOS - SIDEBAR
========================================================= */

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebar-overlay");

const sidebarOpenButton =
    document.getElementById("sidebar-open-button");

const sidebarCloseButton =
    document.getElementById("sidebar-close-button");

const logoutButton =
    document.getElementById("logout-button");

const sidebarUserAvatar =
    document.getElementById("sidebar-user-avatar");

const sidebarUserName =
    document.getElementById("sidebar-user-name");


/* =========================================================
   ELEMENTOS - BUSCA
========================================================= */

const formularioBusca =
    document.getElementById("ticket-search-form");

const campoCodigo =
    document.getElementById("ticket-code");

const botaoBuscar =
    document.getElementById("ticket-search-button");

const mensagemBusca =
    document.getElementById("ticket-search-message");

const mensagemBuscaTexto =
    document.getElementById("ticket-search-message-text");

const spinnerBusca =
    document.getElementById("ticket-search-spinner");


/* =========================================================
   ELEMENTOS - RESULTADO
========================================================= */

const resultadoIngresso =
    document.getElementById("ticket-result");

const statusIngresso =
    document.getElementById("ticket-status");

const avisoUtilizado =
    document.getElementById("ticket-used-warning");

const avisoUtilizadoDescricao =
    document.getElementById(
        "ticket-used-warning-description"
    );

const qrCodeContainer =
    document.getElementById("ticket-qr-code");

const tituloFilme =
    document.getElementById("ticket-movie-title");

const numeroIngresso =
    document.getElementById("ticket-number");

const dataSessao =
    document.getElementById("ticket-session-date");

const horarioSessao =
    document.getElementById("ticket-session-time");

const assento =
    document.getElementById("ticket-seat");

const valorPago =
    document.getElementById("ticket-value");

const formaPagamento =
    document.getElementById("ticket-payment-method");

const dataCompra =
    document.getElementById("ticket-purchase-date");

const codigoRecuperacao =
    document.getElementById("ticket-recovery-code");

const botaoImprimir =
    document.getElementById("ticket-print-button");


/* =========================================================
   ESTADO
========================================================= */

let ingressoAtual = null;
let buscaEmAndamento = false;


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

    campoCodigo?.focus();
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

    } catch (erro) {
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

    if (sidebarUserName) {
        sidebarUserName.textContent =
            nome;
    }

    if (sidebarUserAvatar) {
        sidebarUserAvatar.textContent =
            nome
                .charAt(0)
                .toUpperCase();
    }
}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    sidebarOpenButton?.addEventListener(
        "click",
        abrirSidebar
    );

    sidebarCloseButton?.addEventListener(
        "click",
        fecharSidebar
    );

    sidebarOverlay?.addEventListener(
        "click",
        fecharSidebar
    );

    logoutButton?.addEventListener(
        "click",
        fazerLogout
    );

    campoCodigo?.addEventListener(
        "input",
        normalizarCampoCodigo
    );

    formularioBusca?.addEventListener(
        "submit",
        buscarIngresso
    );

    botaoImprimir?.addEventListener(
        "click",
        imprimirIngresso
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

    window.addEventListener(
        "afterprint",
        finalizarModoImpressao
    );
}


/* =========================================================
   SIDEBAR
========================================================= */

function abrirSidebar() {
    sidebar?.classList.add(
        "open"
    );

    sidebarOverlay?.classList.add(
        "visible"
    );

    sidebarOpenButton?.setAttribute(
        "aria-expanded",
        "true"
    );

    document.body.classList.add(
        "sidebar-open"
    );
}

function fecharSidebar() {
    sidebar?.classList.remove(
        "open"
    );

    sidebarOverlay?.classList.remove(
        "visible"
    );

    sidebarOpenButton?.setAttribute(
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
   CAMPO DO CÓDIGO
========================================================= */

function normalizarCampoCodigo() {
    if (!campoCodigo) {
        return;
    }

    let codigo =
        campoCodigo.value
            .toUpperCase();

    codigo = codigo
        .split("")
        .filter(caractere =>
            CARACTERES_VALIDOS_CODIGO
                .includes(caractere)
        )
        .join("")
        .slice(
            0,
            TAMANHO_CODIGO_RECUPERACAO
        );

    campoCodigo.value =
        codigo;

    esconderMensagemBusca();
}


/* =========================================================
   BUSCAR INGRESSO
========================================================= */

async function buscarIngresso(
    evento
) {
    evento.preventDefault();

    if (buscaEmAndamento) {
        return;
    }

    const codigo =
        obterCodigoDigitado();

    esconderResultado();
    esconderMensagemBusca();

    if (!codigo) {
        exibirMensagem(
            "Informe o código do ingresso.",
            "erro"
        );

        campoCodigo?.focus();

        return;
    }

    if (
        codigo.length !==
        TAMANHO_CODIGO_RECUPERACAO
    ) {
        exibirMensagem(
            "O código do ingresso deve possuir 8 caracteres.",
            "erro"
        );

        campoCodigo?.focus();

        return;
    }

    definirEstadoBusca(true);

    try {
        const ingresso =
            await consultarIngresso(
                codigo
            );

        ingressoAtual =
            ingresso;

        preencherIngresso(
            ingresso
        );

        esconderMensagemBusca();
        mostrarResultado();

    } catch (erro) {
        console.error(
            "Erro ao buscar ingresso:",
            erro
        );

        ingressoAtual =
            null;

        esconderResultado();

        if (
            erro.status === 401
        ) {
            fazerLogout();
            return;
        }

        if (
            erro.status === 403
        ) {
            redirecionarParaHomeCliente();
            return;
        }

        if (
            erro.status === 404
        ) {
            exibirMensagem(
                "Ingresso não encontrado ou indisponível para recuperação.",
                "erro"
            );

            return;
        }

        exibirMensagem(
            erro.message ||
            "Não foi possível buscar o ingresso.",
            "erro"
        );

    } finally {
        definirEstadoBusca(false);
    }
}

function obterCodigoDigitado() {
    return String(
        campoCodigo?.value ||
        ""
    )
        .trim()
        .toUpperCase();
}


/* =========================================================
   REQUISIÇÃO
========================================================= */

async function consultarIngresso(
    codigo
) {
    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {
        const erro =
            new Error(
                "Sua sessão expirou."
            );

        erro.status = 401;

        throw erro;
    }

    let resposta;

    try {
        resposta = await fetch(
            `${API_URL}${INGRESSO_RECUPERACAO_ENDPOINT}/${encodeURIComponent(codigo)}`,
            {
                method: "GET",

                headers: {
                    Accept:
                        "application/json",

                    Authorization:
                        `Bearer ${token}`
                }
            }
        );

    } catch {
        throw new Error(
            "Não foi possível se comunicar com o servidor."
        );
    }

    const dados =
        await lerRespostaApi(
            resposta
        );

    if (!resposta.ok) {
        const erro =
            new Error(
                obterMensagemResposta(
                    dados
                ) ||
                "Não foi possível buscar o ingresso."
            );

        erro.status =
            resposta.status;

        erro.dados =
            dados;

        throw erro;
    }

    if (
        !dados ||
        typeof dados !== "object"
    ) {
        throw new Error(
            "O servidor retornou dados inválidos para o ingresso."
        );
    }

    return dados;
}


/* =========================================================
   RESPOSTA DA API
========================================================= */

async function lerRespostaApi(
    resposta
) {
    if (
        resposta.status === 204
    ) {
        return null;
    }

    const tipoConteudo =
        resposta.headers.get(
            "content-type"
        ) || "";

    if (
        tipoConteudo.includes(
            "application/json"
        )
    ) {
        try {
            return await resposta.json();
        } catch {
            return null;
        }
    }

    try {
        const texto =
            await resposta.text();

        return texto || null;

    } catch {
        return null;
    }
}

function obterMensagemResposta(
    dados
) {
    if (!dados) {
        return null;
    }

    if (
        typeof dados ===
        "string"
    ) {
        /*
            Evita exibir stack trace
            gigantesca na interface.
        */

        if (
            dados.length > 300 ||
            dados.includes("System.") ||
            dados.includes("Exception")
        ) {
            return null;
        }

        return dados;
    }

    if (
        dados.errors &&
        typeof dados.errors ===
        "object"
    ) {
        const mensagens =
            Object.values(
                dados.errors
            )
                .flat()
                .filter(Boolean);

        return mensagens.length
            ? mensagens.join(" ")
            : null;
    }

    return (
        dados.mensagem ??
        dados.Mensagem ??
        dados.message ??
        dados.Message ??
        dados.title ??
        dados.Title ??
        dados.erro ??
        dados.error ??
        null
    );
}


/* =========================================================
   PREENCHER INGRESSO
========================================================= */

function preencherIngresso(
    ingresso
) {
    const dataHoraSessao =
        converterParaData(
            ingresso.dataSessao
        );

    const dataHoraCompra =
        converterParaData(
            ingresso.dataCompra
        );

    if (tituloFilme) {
        tituloFilme.textContent =
            ingresso.filme ||
            "Filme não informado";
    }

    if (numeroIngresso) {
        numeroIngresso.textContent =
            ingresso.id
                ? `Ingresso #${ingresso.id}`
                : "Ingresso";
    }

    if (dataSessao) {
        dataSessao.textContent =
            formatarData(
                dataHoraSessao
            );
    }

    if (horarioSessao) {
        horarioSessao.textContent =
            formatarHorario(
                dataHoraSessao
            );
    }

    if (assento) {
        assento.textContent =
            ingresso.codigoAssento ||
            "--";
    }

    if (valorPago) {
        valorPago.textContent =
            formatarValor(
                ingresso.valorPago
            );
    }

    if (formaPagamento) {
        formaPagamento.textContent =
            formatarFormaPagamento(
                ingresso.formaPagamento
            );
    }

    if (dataCompra) {
        dataCompra.textContent =
            formatarDataHora(
                dataHoraCompra
            );
    }

    if (codigoRecuperacao) {
        codigoRecuperacao.textContent =
            ingresso.codigoRecuperacao ||
            "--------";
    }

    preencherStatus(
        ingresso
    );

    gerarQrCode(
        ingresso.tokenQrCode
    );
}


/* =========================================================
   QR CODE
========================================================= */

function gerarQrCode(
    tokenQrCode
) {
    if (!qrCodeContainer) {
        return;
    }

    qrCodeContainer.innerHTML =
        "";

    if (!tokenQrCode) {
        qrCodeContainer.textContent =
            "QR Code indisponível.";

        return;
    }

    if (
        typeof QRCode ===
        "undefined"
    ) {
        console.error(
            "Biblioteca QRCode não carregada."
        );

        qrCodeContainer.textContent =
            "Não foi possível gerar o QR Code.";

        return;
    }

    new QRCode(
        qrCodeContainer,
        {
            text:
                tokenQrCode,

            width:
                300,

            height:
                300,

            colorDark:
                "#000000",

            colorLight:
                "#ffffff",

            correctLevel:
                QRCode.CorrectLevel.H
        }
    );
}


/* =========================================================
   STATUS DO INGRESSO
========================================================= */

function preencherStatus(
    ingresso
) {
    if (!statusIngresso) {
        return;
    }

    statusIngresso.classList.remove(
        "status-valid",
        "status-used",
        "status-expired"
    );

    avisoUtilizado?.classList.add(
        "hidden"
    );

    if (
        ingresso.utilizado ===
        true
    ) {
        statusIngresso.textContent =
            "Utilizado";

        statusIngresso.classList.add(
            "status-used"
        );

        mostrarAvisoUtilizado(
            ingresso
        );

        return;
    }

    const dataHoraSessao =
        converterParaData(
            ingresso.dataSessao
        );

    if (
        dataHoraSessao &&
        dataHoraSessao.getTime() <
            Date.now()
    ) {
        statusIngresso.textContent =
            "Expirado";

        statusIngresso.classList.add(
            "status-expired"
        );

        return;
    }

    statusIngresso.textContent =
        "Válido";

    statusIngresso.classList.add(
        "status-valid"
    );
}

function mostrarAvisoUtilizado(
    ingresso
) {
    if (!avisoUtilizado) {
        return;
    }

    avisoUtilizado.classList.remove(
        "hidden"
    );

    if (
        !avisoUtilizadoDescricao
    ) {
        return;
    }

    const dataUtilizacao =
        converterParaData(
            ingresso.dataUtilizacao
        );

    if (dataUtilizacao) {
        avisoUtilizadoDescricao.textContent =
            `A entrada correspondente a este ingresso foi registrada em ${formatarDataHora(dataUtilizacao)}.`;

        return;
    }

    avisoUtilizadoDescricao.textContent =
        "A entrada correspondente a este ingresso já foi registrada.";
}


/* =========================================================
   ESTADOS DA INTERFACE
========================================================= */

function definirEstadoBusca(
    buscando
) {
    buscaEmAndamento =
        buscando;

    if (campoCodigo) {
        campoCodigo.disabled =
            buscando;
    }

    if (botaoBuscar) {
        botaoBuscar.disabled =
            buscando;

        botaoBuscar.innerHTML =
            buscando
                ? `
                    <span>
                        Buscando...
                    </span>
                `
                : `
                    <span aria-hidden="true">
                        🔎
                    </span>

                    <span>
                        Buscar ingresso
                    </span>
                `;
    }

    if (buscando) {
        exibirMensagem(
            "Buscando ingresso...",
            "carregando"
        );
    }
}

function exibirMensagem(
    mensagem,
    tipo = "info"
) {
    if (
        !mensagemBusca ||
        !mensagemBuscaTexto
    ) {
        return;
    }

    mensagemBusca.classList.remove(
        "hidden",
        "erro",
        "sucesso",
        "carregando"
    );

    mensagemBusca.classList.add(
        tipo
    );

    mensagemBuscaTexto.textContent =
        mensagem;

    if (spinnerBusca) {
        spinnerBusca.classList.toggle(
            "hidden",
            tipo !== "carregando"
        );
    }
}

function esconderMensagemBusca() {
    mensagemBusca?.classList.add(
        "hidden"
    );

    spinnerBusca?.classList.add(
        "hidden"
    );
}

function mostrarResultado() {
    resultadoIngresso?.classList.remove(
        "hidden"
    );
}

function esconderResultado() {
    resultadoIngresso?.classList.add(
        "hidden"
    );

    avisoUtilizado?.classList.add(
        "hidden"
    );

    if (qrCodeContainer) {
        qrCodeContainer.innerHTML =
            "";
    }
}


/* =========================================================
   IMPRESSÃO
========================================================= */

function imprimirIngresso() {
    if (!ingressoAtual) {
        return;
    }

    document.body.classList.add(
        "ticket-print-mode"
    );

    window.print();
}

function finalizarModoImpressao() {
    document.body.classList.remove(
        "ticket-print-mode"
    );
}


/* =========================================================
   FORMATAÇÕES
========================================================= */

function converterParaData(
    valor
) {
    if (!valor) {
        return null;
    }

    const data =
        new Date(valor);

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
    data
) {
    if (!data) {
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

function formatarDataHora(
    data
) {
    if (!data) {
        return "--";
    }

    const dataFormatada =
        data.toLocaleDateString(
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

    const horarioFormatado =
        data.toLocaleTimeString(
            "pt-BR",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit"
            }
        );

    return `${dataFormatada} às ${horarioFormatado}`;
}

function formatarValor(
    valor
) {
    const numero =
        Number(valor);

    if (
        !Number.isFinite(
            numero
        )
    ) {
        return "--";
    }

    return numero.toLocaleString(
        "pt-BR",
        {
            style:
                "currency",

            currency:
                "BRL"
        }
    );
}

function formatarFormaPagamento(
    forma
) {
    if (!forma) {
        return "--";
    }

    switch (
        String(forma)
            .toLowerCase()
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
            return String(forma);
    }
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