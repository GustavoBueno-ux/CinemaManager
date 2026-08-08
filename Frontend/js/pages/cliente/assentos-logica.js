/* =========================================
   ELEMENTOS DA PÁGINA
========================================= */

const mapaAssentos = document.getElementById("mapaAssentos");

const quantidadeDisponiveis =
    document.getElementById("quantidade-disponiveis");

const quantidadeOcupados =
    document.getElementById("quantidade-ocupados");

const quantidadeSelecionados =
    document.getElementById("quantidade-selecionados");

const listaAssentosSelecionados =
    document.getElementById("listaAssentosSelecionados");

const valorTotal =
    document.getElementById("valorTotal");

const botaoContinuar =
    document.getElementById("botaoContinuar");

const tituloFilme =
    document.getElementById("tituloFilme")
    ?? document.getElementById("titulo-filme");

const dataSessao =
    document.getElementById("dataSessao")
    ?? document.getElementById("data-sessao");

const horarioSessao =
    document.getElementById("horarioSessao")
    ?? document.getElementById("horario-sessao");


/* =========================================
   ESTADO DA TELA
========================================= */

export let PRECO_INGRESSO = 0;

let assentosSelecionados = [];
let todosAssentos = [];
let dadosSessaoAtual = null;


/* =========================================
   ACESSO CONTROLADO AO ESTADO
========================================= */

export function obterAssentosSelecionados() {
    return [...assentosSelecionados];
}

export function obterDadosSessaoAtual() {
    return dadosSessaoAtual;
}

export function obterValorTotal() {
    return assentosSelecionados.length * PRECO_INGRESSO;
}


/* =========================================
   SESSÃO
========================================= */

export function obterSessaoId() {
    const parametros =
        new URLSearchParams(window.location.search);

    const sessaoId =
        parametros.get("sessaoId");

    if (!sessaoId) {
        throw new Error(
            "O ID da sessão não foi informado."
        );
    }

    return sessaoId;
}

async function carregarDadosSessao() {
    try {
        const sessaoId = obterSessaoId();

        const resposta = await apiRequest(
            `/Sessao/${sessaoId}`
        );

        if (!resposta.ok) {
            throw new Error(
                resposta.message
                ?? "Não foi possível carregar a sessão."
            );
        }

        dadosSessaoAtual = resposta.data;

        const precoIngresso = Number(
            dadosSessaoAtual.precoIngresso
            ?? dadosSessaoAtual.PrecoIngresso
        );

        if (
            !Number.isFinite(precoIngresso)
            || precoIngresso <= 0
        ) {
            throw new Error(
                "Não foi possível identificar o preço da sessão."
            );
        }

        PRECO_INGRESSO = precoIngresso;

        mostrarDadosSessao(
            dadosSessaoAtual
        );

        atualizarResumoSelecao();
    } catch (erro) {
        console.error(
            "Erro ao carregar dados da sessão:",
            erro
        );

        if (tituloFilme) {
            tituloFilme.textContent =
                "Não foi possível carregar o filme";
        }

        if (dataSessao) {
            dataSessao.textContent =
                "--/--/----";
        }

        if (horarioSessao) {
            horarioSessao.textContent =
                "--:--";
        }
    }
}

function mostrarDadosSessao(sessao) {
    if (!sessao) {
        return;
    }

    const filme =
        sessao.filme
        ?? sessao.Filme
        ?? {};

    const titulo =
        filme.titulo
        ?? filme.Titulo
        ?? sessao.tituloFilme
        ?? sessao.TituloFilme
        ?? sessao.nomeFilme
        ?? sessao.NomeFilme
        ?? "Filme";

    if (tituloFilme) {
        tituloFilme.textContent =
            titulo;
    }

    const valorDataHora =
        sessao.dataHora
        ?? sessao.DataHora
        ?? sessao.dataHorario
        ?? sessao.DataHorario
        ?? sessao.horario
        ?? sessao.Horario
        ?? sessao.data
        ?? sessao.Data;

    const dataHora =
        converterParaData(valorDataHora);

    if (!dataHora) {
        if (dataSessao) {
            dataSessao.textContent =
                formatarDataSeparada(sessao);
        }

        if (horarioSessao) {
            horarioSessao.textContent =
                formatarHorarioSeparado(sessao);
        }

        return;
    }

    if (dataSessao) {
        dataSessao.textContent =
            dataHora.toLocaleDateString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );
    }

    if (horarioSessao) {
        horarioSessao.textContent =
            dataHora.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }
}

function converterParaData(valor) {
    if (!valor) {
        return null;
    }

    const data =
        new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return null;
    }

    return data;
}

function formatarDataSeparada(sessao) {
    const valorData =
        sessao.data
        ?? sessao.Data
        ?? sessao.dataSessao
        ?? sessao.DataSessao;

    const data =
        converterParaData(valorData);

    if (!data) {
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

function formatarHorarioSeparado(sessao) {
    const horario =
        sessao.horario
        ?? sessao.Horario
        ?? sessao.hora
        ?? sessao.Hora;

    if (!horario) {
        return "--:--";
    }

    if (
        typeof horario === "string"
        && horario.includes(":")
    ) {
        return horario.substring(0, 5);
    }

    return String(horario);
}


/* =========================================
   CONFIGURAÇÃO DAS RESERVAS
========================================= */

const INTERVALO_ATUALIZACAO_MS = 5000;

let operacaoAssentoEmAndamento = false;
let intervaloAtualizacao = null;
let paginaAtiva = true;


/* =========================================
   CARREGAMENTO DOS ASSENTOS
========================================= */

async function carregarAssentos() {
    await sincronizarAssentosComServidor({
        exibirCarregamento: true,
        exibirErro: true
    });
}

export async function sincronizarAssentosComServidor(
    opcoes = {}
) {
    const {
        exibirCarregamento = false,
        exibirErro = false
    } = opcoes;

    if (exibirCarregamento && mapaAssentos) {
        mapaAssentos.innerHTML = `
            <p class="mensagem-carregamento">
                Carregando assentos...
            </p>
        `;
    }

    try {
        const sessaoId = obterSessaoIdNumerico();

        const resposta = await requisicaoReserva(
            `/ReservaAssento/sessao/${sessaoId}`
        );

        if (!Array.isArray(resposta)) {
            throw new Error(
                "A API não retornou uma lista de assentos."
            );
        }

        todosAssentos = resposta.map(
            normalizarStatusAssento
        );

        assentosSelecionados = todosAssentos
            .filter(assento =>
                assento.status === "reservado"
                && assento.reservadoPeloUsuarioAtual
            );

        mostrarAssentos(todosAssentos);

        return todosAssentos;
    } catch (erro) {
        console.error(
            "Erro ao carregar o status dos assentos:",
            erro
        );

        if (exibirErro && mapaAssentos) {
            mapaAssentos.innerHTML = `
                <p class="mensagem-erro">
                    Não foi possível carregar os assentos.
                </p>
            `;
        }

        if (erro.status === 401) {
            redirecionarParaLogin();
        }

        throw erro;
    }
}

function normalizarStatusAssento(assento) {
    const id = Number(
        assento.assentoId
        ?? assento.AssentoId
        ?? assento.id
        ?? assento.Id
    );

    const codigo = String(
        assento.codigo
        ?? assento.Codigo
        ?? ""
    );

    const status = String(
        assento.status
        ?? assento.Status
        ?? "disponivel"
    ).toLowerCase();

    const reservadoPeloUsuarioAtual = Boolean(
        assento.reservadoPeloUsuarioAtual
        ?? assento.ReservadoPeloUsuarioAtual
    );

    return {
        id,
        assentoId: id,
        codigo,
        status,
        reservadoPeloUsuarioAtual,
        reservaExpiraEm:
            assento.reservaExpiraEm
            ?? assento.ReservaExpiraEm
            ?? null
    };
}

function mostrarAssentos(assentos) {
    if (!mapaAssentos) {
        console.error(
            'Elemento com ID "mapaAssentos" não encontrado.'
        );

        return;
    }

    mapaAssentos.innerHTML = "";

    atualizarContadores(assentos);

    const assentosPorFileira =
        organizarAssentosPorFileira(assentos);

    const ordemFileiras = [
        "J",
        "I",
        "H",
        "G",
        "F",
        "E",
        "D",
        "C",
        "B",
        "A"
    ];

    ordemFileiras.forEach(letraFileira => {
        const assentosFileira =
            assentosPorFileira[letraFileira];

        if (!assentosFileira) {
            return;
        }

        mapaAssentos.appendChild(
            criarFileira(
                letraFileira,
                assentosFileira
            )
        );
    });

    atualizarResumoSelecao();
}

function organizarAssentosPorFileira(assentos) {
    const assentosPorFileira = {};

    assentos.forEach(assento => {
        const letraFileira = assento.codigo
            .charAt(0)
            .toUpperCase();

        if (!assentosPorFileira[letraFileira]) {
            assentosPorFileira[letraFileira] = [];
        }

        assentosPorFileira[letraFileira]
            .push(assento);
    });

    Object.values(assentosPorFileira)
        .forEach(fileira => {
            fileira.sort((a, b) =>
                obterNumeroAssento(a.codigo)
                - obterNumeroAssento(b.codigo)
            );
        });

    return assentosPorFileira;
}

function obterNumeroAssento(codigo) {
    return Number(codigo.substring(1));
}


/* =========================================
   CRIAÇÃO DAS FILEIRAS
========================================= */

function criarFileira(
    letraFileira,
    assentos
) {
    const fileira =
        document.createElement("div");

    fileira.classList.add(
        "fileira"
    );

    const identificadorEsquerdo =
        criarIdentificadorFileira(
            letraFileira
        );

    const areaAssentos =
        document.createElement("div");

    areaAssentos.classList.add(
        "area-assentos-fileira"
    );

    assentos.forEach(assento => {
        const numeroAssento =
            obterNumeroAssento(
                assento.codigo
            );

        const elementoAssento =
            criarAssento(assento);

        elementoAssento.style.gridColumn =
            obterColunaAssento(
                letraFileira,
                numeroAssento
            );

        areaAssentos.appendChild(
            elementoAssento
        );
    });

    const identificadorDireito =
        criarIdentificadorFileira(
            letraFileira
        );

    fileira.append(
        identificadorEsquerdo,
        areaAssentos,
        identificadorDireito
    );

    return fileira;
}

function obterColunaAssento(
    letraFileira,
    numeroAssento
) {
    if (letraFileira === "J") {
        return numeroAssento;
    }

    if (numeroAssento <= 4) {
        return numeroAssento;
    }

    if (numeroAssento <= 11) {
        return numeroAssento + 2;
    }

    return numeroAssento + 4;
}

function criarIdentificadorFileira(
    letraFileira
) {
    const identificador =
        document.createElement("span");

    identificador.classList.add(
        "identificador-fileira"
    );

    identificador.textContent =
        letraFileira;

    return identificador;
}


/* =========================================
   CRIAÇÃO E SELEÇÃO DOS ASSENTOS
========================================= */

function criarAssento(assento) {
    const botao =
        document.createElement("button");

    botao.type = "button";

    botao.classList.add(
        "assento"
    );

    botao.textContent =
        obterNumeroAssento(
            assento.codigo
        );

    botao.dataset.assentoId =
        assento.id;

    botao.dataset.codigo =
        assento.codigo;

    const reservadoPeloUsuario =
        assento.status === "reservado"
        && assento.reservadoPeloUsuarioAtual;

    const indisponivel =
        assento.status === "ocupado"
        || (
            assento.status === "reservado"
            && !assento.reservadoPeloUsuarioAtual
        );

    if (reservadoPeloUsuario) {
        botao.classList.add(
            "selecionado"
        );

        botao.title =
            `Assento ${assento.codigo} selecionado`;

        botao.addEventListener(
            "click",
            () => {
                cancelarSelecaoAssento(
                    assento
                );
            }
        );
    } else if (indisponivel) {
        botao.classList.add(
            "ocupado"
        );

        botao.disabled = true;

        botao.title =
            `Assento ${assento.codigo} indisponível`;
    } else {
        botao.classList.add(
            "disponivel"
        );

        botao.title =
            `Assento ${assento.codigo} disponível`;

        botao.addEventListener(
            "click",
            () => {
                reservarAssento(
                    assento
                );
            }
        );
    }

    if (operacaoAssentoEmAndamento) {
        botao.disabled = true;
    }

    return botao;
}

async function reservarAssento(assento) {
    if (operacaoAssentoEmAndamento) {
        return;
    }

    const assentoIds = [
        ...assentosSelecionados.map(
            item => item.id
        ),
        assento.id
    ];

    await executarOperacaoAssento(
        async () => {
            await requisicaoReserva(
                "/ReservaAssento/lote",
                {
                    method: "POST",

                    body: JSON.stringify({
                        sessaoId:
                            obterSessaoIdNumerico(),

                        assentoIds
                    })
                }
            );
        }
    );
}

async function cancelarSelecaoAssento(
    assento
) {
    if (operacaoAssentoEmAndamento) {
        return;
    }

    await executarOperacaoAssento(
        async () => {
            const parametros =
                new URLSearchParams({
                    sessaoId: String(
                        obterSessaoIdNumerico()
                    ),

                    assentoId: String(
                        assento.id
                    )
                });

            await requisicaoReserva(
                `/ReservaAssento?${parametros.toString()}`,
                {
                    method: "DELETE"
                }
            );
        }
    );
}

async function executarOperacaoAssento(
    operacao
) {
    definirEstadoOperacaoAssento(true);

    try {
        await operacao();
    } catch (erro) {
        console.error(
            "Erro ao alterar a reserva do assento:",
            erro
        );

        if (erro.status === 401) {
            redirecionarParaLogin();
            return;
        }

        window.alert(
            erro.message
            ?? "Não foi possível atualizar a seleção."
        );
    } finally {
        try {
            await sincronizarAssentosComServidor();
        } catch {
            /*
             * O erro já foi tratado pela função
             * de sincronização.
             */
        }

        definirEstadoOperacaoAssento(false);
    }
}

function definirEstadoOperacaoAssento(
    emAndamento
) {
    operacaoAssentoEmAndamento =
        emAndamento;

    mapaAssentos
        ?.querySelectorAll("button.assento")
        .forEach(botao => {
            botao.disabled =
                emAndamento
                || botao.classList.contains(
                    "ocupado"
                );
        });

    if (botaoContinuar) {
        botaoContinuar.disabled =
            emAndamento
            || assentosSelecionados.length === 0;
    }
}


/* =========================================
   CONTADORES E RESUMO
========================================= */

function atualizarContadores(assentos) {
    const totalDisponiveis =
        assentos.filter(
            assento =>
                assento.status === "disponivel"
        ).length;

    const totalOcupados =
        assentos.filter(
            assento =>
                assento.status === "ocupado"
                || (
                    assento.status === "reservado"
                    && !assento
                        .reservadoPeloUsuarioAtual
                )
        ).length;

    if (quantidadeDisponiveis) {
        quantidadeDisponiveis.textContent =
            totalDisponiveis;
    }

    if (quantidadeOcupados) {
        quantidadeOcupados.textContent =
            totalOcupados;
    }
}

function atualizarResumoSelecao() {
    const quantidade =
        assentosSelecionados.length;

    if (quantidadeSelecionados) {
        quantidadeSelecionados.textContent =
            quantidade;
    }

    if (quantidade === 0) {
        if (listaAssentosSelecionados) {
            listaAssentosSelecionados.innerHTML = `
                <span class="nenhum-assento">
                    Nenhum assento selecionado
                </span>
            `;
        }

        if (valorTotal) {
            valorTotal.textContent =
                formatarPreco(0);
        }

        if (botaoContinuar) {
            botaoContinuar.disabled = true;
        }

        notificarAlteracaoSelecao();

        return;
    }

    assentosSelecionados.sort(
        (assentoA, assentoB) =>
            assentoA.codigo.localeCompare(
                assentoB.codigo,
                "pt-BR",
                {
                    numeric: true
                }
            )
    );

    if (listaAssentosSelecionados) {
        listaAssentosSelecionados.textContent =
            assentosSelecionados
                .map(
                    assento => assento.codigo
                )
                .join(" - ");
    }

    if (valorTotal) {
        valorTotal.textContent =
            formatarPreco(
                obterValorTotal()
            );
    }

    if (botaoContinuar) {
        botaoContinuar.disabled =
            operacaoAssentoEmAndamento;
    }

    notificarAlteracaoSelecao();
}


/* =========================================
   COMUNICAÇÃO COM O MODAL
========================================= */

function notificarAlteracaoSelecao() {
    document.dispatchEvent(
        new CustomEvent(
            "assentos:selecao-alterada",
            {
                detail: {
                    assentos:
                        obterAssentosSelecionados(),

                    quantidade:
                        assentosSelecionados.length,

                    valorTotal:
                        obterValorTotal()
                }
            }
        )
    );
}


/* =========================================
   COMUNICAÇÃO COM A API
========================================= */

function obterSessaoIdNumerico() {
    const sessaoId =
        Number(obterSessaoId());

    if (
        !Number.isInteger(sessaoId)
        || sessaoId <= 0
    ) {
        throw new Error(
            "Não foi possível identificar a sessão."
        );
    }

    return sessaoId;
}

async function requisicaoReserva(
    endpoint,
    options = {}
) {
    const token =
        localStorage.getItem("token");

    if (!token) {
        const erro =
            new Error(
                "Sua sessão expirou. Faça login novamente."
            );

        erro.status = 401;

        throw erro;
    }

    const headers = {
        Accept: "application/json",

        Authorization:
            `Bearer ${token}`,

        ...(
            options.body
                ? {
                    "Content-Type":
                        "application/json"
                }
                : {}
        ),

        ...(options.headers ?? {})
    };

    let resposta;

    try {
        resposta = await fetch(
            `${API_URL}${endpoint}`,
            {
                ...options,
                headers
            }
        );
    } catch {
        throw new Error(
            "Não foi possível conectar à API."
        );
    }

    const dados =
        await lerRespostaApi(resposta);

    if (!resposta.ok) {
        const erro =
            new Error(
                obterMensagemResposta(dados)
                ?? "Não foi possível concluir a operação."
            );

        erro.status =
            resposta.status;

        erro.dados =
            dados;

        throw erro;
    }

    return dados;
}

async function lerRespostaApi(resposta) {
    if (resposta.status === 204) {
        return null;
    }

    const tipoConteudo =
        resposta.headers.get(
            "content-type"
        ) ?? "";

    if (
        tipoConteudo.includes(
            "application/json"
        )
    ) {
        return await resposta.json();
    }

    const texto =
        await resposta.text();

    return texto || null;
}

function obterMensagemResposta(dados) {
    if (!dados) {
        return null;
    }

    if (typeof dados === "string") {
        return dados;
    }

    if (
        dados.errors
        && typeof dados.errors === "object"
    ) {
        return Object.values(
            dados.errors
        )
            .flat()
            .filter(Boolean)
            .join("\n");
    }

    return (
        dados.mensagem
        ?? dados.message
        ?? dados.title
        ?? dados.erro
        ?? dados.error
        ?? null
    );
}

function redirecionarParaLogin() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    window.location.href =
        "../../index.html";
}


/* =========================================
   ATUALIZAÇÃO AUTOMÁTICA
========================================= */

function iniciarAtualizacaoAutomatica() {
    pararAtualizacaoAutomatica();

    intervaloAtualizacao =
        window.setInterval(
            async () => {
                if (
                    !paginaAtiva
                    || document.hidden
                    || operacaoAssentoEmAndamento
                ) {
                    return;
                }

                try {
                    await sincronizarAssentosComServidor();
                } catch {
                    /*
                     * Não mostra alertas repetidos durante
                     * a atualização automática.
                     */
                }
            },
            INTERVALO_ATUALIZACAO_MS
        );
}

function pararAtualizacaoAutomatica() {
    if (intervaloAtualizacao !== null) {
        window.clearInterval(
            intervaloAtualizacao
        );

        intervaloAtualizacao = null;
    }
}

window.addEventListener(
    "pagehide",
    () => {
        paginaAtiva = false;
        pararAtualizacaoAutomatica();
    }
);

window.addEventListener(
    "pageshow",
    () => {
        paginaAtiva = true;
        iniciarAtualizacaoAutomatica();
    }
);


/* =========================================
   FORMATAÇÃO
========================================= */

export function formatarPreco(valor) {
    return valor.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

async function inicializarAssentos() {
    atualizarResumoSelecao();

    await Promise.all([
        carregarDadosSessao(),
        carregarAssentos()
    ]);

    iniciarAtualizacaoAutomatica();
}

inicializarAssentos().catch(erro => {
    console.error(
        "Erro ao inicializar a tela de assentos:",
        erro
    );
});