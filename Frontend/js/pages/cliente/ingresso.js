document.addEventListener("DOMContentLoaded", iniciarPaginaIngresso);

async function iniciarPaginaIngresso() {

    configurarBotaoVoltar();

    const ingressoId = obterIngressoIdDaUrl();

    if (!ingressoId) {

        exibirErro("Ingresso inválido ou não informado.");

        return;

    }

    await carregarIngresso(ingressoId);

}


/* =========================
   CONFIGURAÇÕES
========================= */

function configurarBotaoVoltar() {

    const botaoVoltar = document.getElementById("botao-voltar");

    botaoVoltar.addEventListener("click", () => {

        window.location.href = "meus-ingressos.html";

    });

}


function obterIngressoIdDaUrl() {

    const parametros = new URLSearchParams(
        window.location.search
    );

    const ingressoId = parametros.get("id");

    if (
        !ingressoId ||
        Number.isNaN(Number(ingressoId)) ||
        Number(ingressoId) <= 0
    ) {
        return null;
    }

    return Number(ingressoId);

}


/* =========================
   BUSCAR INGRESSO
========================= */

async function carregarIngresso(ingressoId) {

    const token = localStorage.getItem("token");

    if (!token) {

        redirecionarParaLogin();

        return;

    }

    try {

        const resposta = await fetch(
            `${API_URL}/Ingresso/${ingressoId}`,
            {
                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (resposta.status === 401) {

            localStorage.removeItem("token");

            redirecionarParaLogin();

            return;

        }

        if (resposta.status === 404) {

            exibirErro(
                "Ingresso não encontrado ou você não possui acesso a ele."
            );

            return;

        }

        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar o ingresso."
            );

        }

        const ingresso = await resposta.json();

        preencherIngresso(ingresso);

    }
    catch (erro) {

        console.error(
            "Erro ao carregar ingresso:",
            erro
        );

        exibirErro(
            "Não foi possível carregar o ingresso. Tente novamente."
        );

    }

}


/* =========================
   PREENCHER TELA
========================= */

function preencherIngresso(ingresso) {

    document.getElementById("filme-titulo").textContent =
        ingresso.filme;

    const dataSessao = new Date(
        ingresso.dataSessao
    );

    document.getElementById("data-sessao").textContent =
        formatarData(dataSessao);

    document.getElementById("horario-sessao").textContent =
        formatarHorario(dataSessao);

    document.getElementById("codigo-assento").textContent =
        ingresso.codigoAssento;

    document.getElementById("data-compra").textContent =
        formatarDataHora(ingresso.dataCompra);

    document.getElementById("valor-pago").textContent =
        formatarValor(ingresso.valorPago);

    preencherStatus(ingresso);

    gerarQrCode(ingresso.tokenQrCode);

    document.getElementById("mensagem-status").hidden = true;

    document.getElementById("ingresso-card").hidden = false;

}


/* =========================
   QR CODE
========================= */

function gerarQrCode(tokenQrCode) {

    const qrCodeContainer =
        document.getElementById("qr-code");

    qrCodeContainer.innerHTML = "";

    if (!tokenQrCode) {

        qrCodeContainer.textContent =
            "QR Code indisponível.";

        return;

    }

    new QRCode(qrCodeContainer, {

        text: tokenQrCode,

        width: 300,

        height: 300,

        colorDark: "#000000",

        colorLight: "#ffffff",

        correctLevel: QRCode.CorrectLevel.H

    });

}


/* =========================
   STATUS
========================= */

function preencherStatus(ingresso) {

    const elementoStatus =
        document.getElementById("status-ingresso");

    elementoStatus.classList.remove(
        "status-valido",
        "status-utilizado",
        "status-expirado"
    );

    const status = obterStatusIngresso(ingresso);

    elementoStatus.textContent = status.texto;

    elementoStatus.classList.add(status.classe);

}


function obterStatusIngresso(ingresso) {

    if (ingresso.utilizado) {

        return {
            texto: "Utilizado",
            classe: "status-utilizado"
        };

    }

    const dataSessao = new Date(
        ingresso.dataSessao
    );

    if (dataSessao.getTime() < Date.now()) {

        return {
            texto: "Expirado",
            classe: "status-expirado"
        };

    }

    return {
        texto: "Válido",
        classe: "status-valido"
    };

}


/* =========================
   FORMATAÇÕES
========================= */

function formatarData(data) {

    if (Number.isNaN(data.getTime())) {
        return "--";
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


function formatarHorario(data) {

    if (Number.isNaN(data.getTime())) {
        return "--";
    }

    return data.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function formatarDataHora(dataCompra) {

    const data = new Date(dataCompra);

    if (Number.isNaN(data.getTime())) {
        return "--";
    }

    const dataFormatada = data.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit"
        }
    );

    const horarioFormatado = data.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

    return `${dataFormatada} - ${horarioFormatado}`;

}


function formatarValor(valor) {

    const valorNumerico = Number(valor);

    if (Number.isNaN(valorNumerico)) {
        return "--";
    }

    return valorNumerico.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );

}


/* =========================
   ERROS E REDIRECIONAMENTO
========================= */

function exibirErro(mensagem) {

    const mensagemStatus =
        document.getElementById("mensagem-status");

    const ingressoCard =
        document.getElementById("ingresso-card");

    ingressoCard.hidden = true;

    mensagemStatus.textContent = mensagem;

    mensagemStatus.classList.add("erro");

    mensagemStatus.hidden = false;

}


function redirecionarParaLogin() {

    window.location.href = "login.html";

}