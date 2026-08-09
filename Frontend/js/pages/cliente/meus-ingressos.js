document.addEventListener(
    "DOMContentLoaded",
    inicializarPagina
);

function inicializarPagina() {

    configurarBotaoVoltar();
    carregarIngressos();

}

function configurarBotaoVoltar() {

    const botaoVoltar =
        document.getElementById("botao-voltar");

    botaoVoltar.addEventListener(
        "click",
        () => {

            window.location.href = "/pages/public/home.html";

        }
    );

}

async function carregarIngressos() {

    const mensagemStatus =
        document.getElementById("mensagem-status");

    const listaIngressos =
        document.getElementById("lista-ingressos");

    const token =
        localStorage.getItem("token");

    listaIngressos.innerHTML = "";

    if (!token) {

        window.location.href = "login.html";
        return;

    }

    exibirMensagem(
        "Carregando ingressos..."
    );

    try {

        const response = await fetch(
            `${API_URL}/Ingresso/meus`,
            {
                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const dados =
            await lerResposta(response);

        if (response.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.href = "login.html";
            return;

        }

        if (!response.ok) {

            throw new Error(
                dados?.mensagem ||
                "Não foi possível carregar seus ingressos."
            );

        }

        if (!Array.isArray(dados)) {

            throw new Error(
                "A resposta da API possui um formato inválido."
            );

        }

        if (dados.length === 0) {

            exibirMensagem(
                "Você ainda não possui ingressos."
            );

            return;

        }

        ocultarMensagem();

        dados.forEach(
            ingresso => {

                const card =
                    criarCardIngresso(ingresso);

                listaIngressos.appendChild(card);

            }
        );

    } catch (error) {

        console.error(
            "Erro ao carregar ingressos:",
            error
        );

        mensagemStatus.classList.add("erro");

        exibirMensagem(
            error.message ||
            "Não foi possível carregar seus ingressos."
        );

    }

}


function formatarDataCompra(dataCompra) {

    const data =
        new Date(dataCompra);

    if (Number.isNaN(data.getTime())) {
        return "Data inválida";
    }

    const dataFormatada =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit"
            }
        ).format(data);

    const horarioFormatado =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        ).format(data);

    return `${dataFormatada} - ${horarioFormatado}`;

}


function criarCardIngresso(ingresso) {

    const card =
        document.createElement("article");

    card.classList.add("ingresso-card");

    const containerFilme =
        document.createElement("div");

    containerFilme.classList.add(
        "ingresso-filme"
    );

    const tituloFilme =
        document.createElement("h2");

    tituloFilme.textContent =
        ingresso.filme ||
        "Filme não informado";

    containerFilme.appendChild(
        tituloFilme
    );

    const informacoes =
        document.createElement("div");

    informacoes.classList.add(
        "ingresso-informacoes"
    );

    const dataHora =
        formatarDataSessao(
            ingresso.dataSessao
        );

    informacoes.appendChild(
        criarInformacao(
            "Data da sessão",
            dataHora.data
        )
    );

    informacoes.appendChild(
        criarInformacao(
            "Horário",
            dataHora.horario
        )
    );

    informacoes.appendChild(
        criarInformacao(
            "Assento",
            ingresso.codigoAssento ||
            "Não informado"
        )
    );

    informacoes.appendChild(
        criarInformacao(
            "Data da compra",
            formatarDataCompra(
                ingresso.dataCompra
            )
        )
    );

    const botaoQrCode =
        document.createElement("button");

    botaoQrCode.type = "button";

    botaoQrCode.classList.add(
        "botao-qr-code"
    );

    botaoQrCode.textContent =
        "Ver QR Code";

    botaoQrCode.setAttribute(
        "aria-label",
        `Ver QR Code do ingresso para o assento ${
            ingresso.codigoAssento ||
            ""
        }`
    );

    botaoQrCode.addEventListener(
        "click",
        () => abrirIngresso(ingresso.id)
    );

    card.append(
        containerFilme,
        informacoes,
        botaoQrCode
    );

    return card;

}

function criarInformacao(
    titulo,
    valor
) {

    const container =
        document.createElement("div");

    container.classList.add(
        "ingresso-informacao"
    );

    const rotulo =
        document.createElement("span");

    rotulo.textContent = titulo;

    const conteudo =
        document.createElement("strong");

    conteudo.textContent = valor;

    container.append(
        rotulo,
        conteudo
    );

    return container;

}

function formatarDataSessao(dataSessao) {

    const data =
        new Date(dataSessao);

    if (Number.isNaN(data.getTime())) {

        return {
            data: "Data inválida",
            horario: "--:--"
        };

    }

    return {
        data: new Intl.DateTimeFormat(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(data),

        horario: new Intl.DateTimeFormat(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            }
        ).format(data)
    };

}

function abrirIngresso(ingressoId) {

    if (!ingressoId) {

        console.error(
            "O ingresso não possui um ID válido."
        );

        return;

    }

    window.location.href =
        `ingresso.html?id=${encodeURIComponent(
            ingressoId
        )}`;

}

async function lerResposta(response) {

    const texto =
        await response.text();

    if (!texto) {
        return null;
    }

    try {
        return JSON.parse(texto);
    } catch {
        return null;
    }

}

function exibirMensagem(texto) {

    const mensagemStatus =
        document.getElementById(
            "mensagem-status"
        );

    mensagemStatus.textContent = texto;
    mensagemStatus.hidden = false;

}

function ocultarMensagem() {

    const mensagemStatus =
        document.getElementById(
            "mensagem-status"
        );

    mensagemStatus.hidden = true;

}