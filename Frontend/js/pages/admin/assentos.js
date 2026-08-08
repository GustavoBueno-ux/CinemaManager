/* =========================================================
   CONFIGURAÇÕES
========================================================= */

let PRECO_INGRESSO = 0;
const INTERVALO_ATUALIZACAO_MS = 5000;

/* =========================================================
   ELEMENTOS - PÁGINA
========================================================= */

const mapaAssentos = document.getElementById("mapaAssentos");
const quantidadeDisponiveis = document.getElementById("quantidade-disponiveis");
const quantidadeOcupados = document.getElementById("quantidade-ocupados");
const quantidadeSelecionados = document.getElementById("quantidade-selecionados");
const listaAssentosSelecionados = document.getElementById("listaAssentosSelecionados");
const valorTotal = document.getElementById("valorTotal");
const botaoContinuar = document.getElementById("botaoContinuar");

const tituloFilme = document.getElementById("titulo-filme");
const dataSessao = document.getElementById("data-sessao");
const horarioSessao = document.getElementById("horario-sessao");

const botaoVoltar = document.getElementById("botao-voltar");
const mensagemPagina = document.getElementById("mensagem-pagina");

/* =========================================================
   ELEMENTOS - TROCA DE SESSÃO
========================================================= */

const botaoAlterarSessao = document.getElementById("botao-alterar-sessao");
const modalSessoes = document.getElementById("modal-sessoes");
const botaoFecharModalSessoes = document.getElementById("botao-fechar-modal-sessoes");
const pesquisaSessao = document.getElementById("pesquisa-sessao");
const listaSessoes = document.getElementById("lista-sessoes");

/* =========================================================
   ELEMENTOS - VENDA
========================================================= */

const modalVenda = document.getElementById("modalVenda");
const botaoFecharModalVenda = document.getElementById("botaoFecharModalVenda");
const ingressosSelecionados = document.getElementById("ingressosSelecionados");
const valorTotalModal = document.getElementById("valorTotalModal");
const botaoFinalizarVenda = document.getElementById("botaoFinalizarVenda");
const mensagemModalVenda = document.getElementById("mensagem-modal-venda");

const opcoesPagamento = document.querySelectorAll(
    'input[name="formaPagamento"]'
);

/* =========================================================
   ELEMENTOS - RESULTADO DA VENDA
========================================================= */

const modalResultadoVenda = document.getElementById("modal-resultado-venda");
const tituloResultadoVenda = document.getElementById("titulo-resultado-venda");
const descricaoResultadoVenda = document.getElementById("descricao-resultado-venda");
const idsIngressosVenda = document.getElementById("ids-ingressos-venda");

const statusImpressao = document.getElementById("status-impressao");
const statusImpressaoTitulo = document.getElementById("status-impressao-titulo");
const statusImpressaoDescricao = document.getElementById("status-impressao-descricao");

const botaoReimprimir = document.getElementById("botao-reimprimir");
const botaoNovaVenda = document.getElementById("botao-nova-venda");



/* =========================================================
   ESTADO
========================================================= */

let sessaoIdAtual = null;
let dadosSessaoAtual = null;

let todosAssentos = [];
let assentosSelecionados = [];
let sessoesDisponiveis = [];

let operacaoAssentoEmAndamento = false;
let vendaEmAndamento = false;
let carregandoTrocaSessao = false;

let intervaloAtualizacao = null;
let paginaAtiva = true;

let ultimaVendaBilheteria = null;

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", inicializarPagina);

async function inicializarPagina() {
    const usuario = obterUsuarioAutenticado();

    if (!usuario) {
        redirecionarParaLogin();
        return;
    }

    if (usuario.tipoUsuario !== "Funcionario") {
        redirecionarParaHomeCliente();
        return;
    }

    configurarEventos();
    atualizarResumoSelecao();

    try {
        sessaoIdAtual = await resolverSessaoInicial();

        await carregarSessaoCompleta(
            sessaoIdAtual,
            true
        );

        iniciarAtualizacaoAutomatica();
    } catch (erro) {
        console.error(
            "Erro ao inicializar venda de ingressos:",
            erro
        );

        exibirMensagemPagina(
            erro.message ||
            "Não foi possível carregar a tela de venda.",
            "erro"
        );
    }
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function obterUsuarioAutenticado() {
    const token = localStorage.getItem("token");
    const usuarioArmazenado = localStorage.getItem("usuario");

    if (!token || !usuarioArmazenado) {
        return null;
    }

    try {
        return JSON.parse(usuarioArmazenado);
    } catch {
        return null;
    }
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    botaoVoltar?.addEventListener(
        "click",
        voltarPaginaAnterior
    );

    botaoAlterarSessao?.addEventListener(
        "click",
        abrirModalSessoes
    );

    botaoFecharModalSessoes?.addEventListener(
        "click",
        fecharModalSessoes
    );

    modalSessoes
        ?.querySelector(".fundo-modal")
        ?.addEventListener(
            "click",
            fecharModalSessoes
        );

    pesquisaSessao?.addEventListener(
        "input",
        renderizarSessoesFiltradas
    );

    botaoContinuar?.addEventListener(
        "click",
        abrirModalVenda
    );

    botaoFecharModalVenda?.addEventListener(
        "click",
        fecharModalVenda
    );

    modalVenda
        ?.querySelector(".fundo-modal")
        ?.addEventListener(
            "click",
            fecharModalVenda
        );

    botaoFinalizarVenda?.addEventListener(
        "click",
        finalizarVenda
    );

    opcoesPagamento.forEach(opcao => {
        opcao.addEventListener(
            "change",
            () => {
                esconderErroVenda();
                atualizarValoresModalVenda();
            }
        );
    });

    botaoNovaVenda?.addEventListener(
        "click",
        iniciarNovaVenda
    );

    botaoReimprimir?.addEventListener(
        "click",
        tentarReimprimirUltimaVenda
    );

    document.addEventListener(
        "keydown",
        controlarTeclado
    );

    document.addEventListener(
        "visibilitychange",
        tratarVisibilidadePagina
    );

    window.addEventListener(
        "pagehide",
        tratarSaidaPagina
    );

    window.addEventListener(
        "pageshow",
        tratarRetornoPagina
    );
}

/* =========================================================
   SESSÃO INICIAL
========================================================= */

async function resolverSessaoInicial() {
    const parametros = new URLSearchParams(
        window.location.search
    );

    const sessaoId = Number(
        parametros.get("sessaoId")
    );

    if (
        Number.isInteger(sessaoId) &&
        sessaoId > 0
    ) {
        return sessaoId;
    }

    const sessoes = await buscarSessoesFuturas();

    if (!sessoes.length) {
        throw new Error(
            "Não existem sessões futuras disponíveis para venda."
        );
    }

    const proximaSessao = sessoes[0];
    const proximaSessaoId = obterIdSessao(proximaSessao);

    atualizarSessaoIdUrl(
        proximaSessaoId
    );

    return proximaSessaoId;
}

/* =========================================================
   CARREGAMENTO DA SESSÃO
========================================================= */

async function carregarSessaoCompleta(
    sessaoId,
    exibirCarregamento = false
) {
    sessaoIdAtual = Number(sessaoId);

    if (
        !Number.isInteger(sessaoIdAtual) ||
        sessaoIdAtual <= 0
    ) {
        throw new Error(
            "Sessão inválida."
        );
    }

    if (exibirCarregamento) {
        exibirCarregamentoAssentos();
    }

    const [
        sessao,
        assentos
    ] = await Promise.all([
        buscarSessao(sessaoIdAtual),
        buscarStatusAssentos(sessaoIdAtual)
    ]);

    dadosSessaoAtual = sessao;
    
    const precoIngresso = Number(
        sessao.precoIngresso ??
        sessao.PrecoIngresso
    );
    
    if (
        !Number.isFinite(precoIngresso) ||
        precoIngresso <= 0
    ) {
        throw new Error(
            "Não foi possível identificar o preço da sessão."
        );
    }
    
    PRECO_INGRESSO = precoIngresso;
    
    mostrarDadosSessao(sessao);
    aplicarStatusAssentos(assentos);
    
    esconderMensagemPagina();
}

/* =========================================================
   BUSCAR SESSÃO
========================================================= */

async function buscarSessao(sessaoId) {
    const resposta = await apiRequest(
        `/Sessao/${sessaoId}`
    );

    if (!resposta.ok) {
        throw criarErroApiRequest(
            resposta,
            "Não foi possível carregar a sessão."
        );
    }

    if (!resposta.data) {
        throw new Error(
            "A sessão não foi encontrada."
        );
    }

    return resposta.data;
}

function mostrarDadosSessao(sessao) {
    const titulo =
        sessao.tituloFilme ??
        sessao.TituloFilme ??
        "Filme";

    const dataHora = new Date(
        sessao.dataHora ??
        sessao.DataHora
    );

    if (tituloFilme) {
        tituloFilme.textContent = titulo;
    }

    if (Number.isNaN(dataHora.getTime())) {
        if (dataSessao) {
            dataSessao.textContent = "--/--/----";
        }

        if (horarioSessao) {
            horarioSessao.textContent = "--:--";
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

/* =========================================================
   STATUS DOS ASSENTOS
========================================================= */

async function buscarStatusAssentos(
    sessaoId
) {
    return await requisicaoAutenticada(
        `/ReservaAssento/sessao/${sessaoId}`
    );
}

async function sincronizarAssentosComServidor(
    opcoes = {}
) {
    const {
        exibirCarregamento = false,
        exibirErro = false
    } = opcoes;

    if (!sessaoIdAtual) {
        return;
    }

    if (exibirCarregamento) {
        exibirCarregamentoAssentos();
    }

    try {
        const resposta =
            await buscarStatusAssentos(
                sessaoIdAtual
            );

        aplicarStatusAssentos(
            resposta
        );
    } catch (erro) {
        console.error(
            "Erro ao sincronizar assentos:",
            erro
        );

        if (
            exibirErro &&
            mapaAssentos
        ) {
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

function aplicarStatusAssentos(
    resposta
) {
    if (!Array.isArray(resposta)) {
        throw new Error(
            "A API não retornou uma lista válida de assentos."
        );
    }

    todosAssentos =
        resposta.map(
            normalizarStatusAssento
        );

    assentosSelecionados =
        todosAssentos.filter(
            assento =>
                assento.status === "reservado" &&
                assento.reservadoPeloUsuarioAtual
        );

    mostrarAssentos(
        todosAssentos
    );
}

function normalizarStatusAssento(
    assento
) {
    const id = Number(
        assento.assentoId ??
        assento.AssentoId ??
        assento.id ??
        assento.Id
    );

    const codigo = String(
        assento.codigo ??
        assento.Codigo ??
        ""
    );

    const status = String(
        assento.status ??
        assento.Status ??
        "disponivel"
    ).toLowerCase();

    const reservadoPeloUsuarioAtual =
        Boolean(
            assento.reservadoPeloUsuarioAtual ??
            assento.ReservadoPeloUsuarioAtual
        );

    return {
        id,
        assentoId: id,
        codigo,
        status,
        reservadoPeloUsuarioAtual,

        reservaExpiraEm:
            assento.reservaExpiraEm ??
            assento.ReservaExpiraEm ??
            null
    };
}

/* =========================================================
   MAPA
========================================================= */

function mostrarAssentos(
    assentos
) {
    if (!mapaAssentos) {
        return;
    }

    mapaAssentos.innerHTML = "";

    atualizarContadores(
        assentos
    );

    const assentosPorFileira =
        organizarAssentosPorFileira(
            assentos
        );

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

    ordemFileiras.forEach(
        letraFileira => {
            const assentosFileira =
                assentosPorFileira[
                    letraFileira
                ];

            if (!assentosFileira) {
                return;
            }

            mapaAssentos.appendChild(
                criarFileira(
                    letraFileira,
                    assentosFileira
                )
            );
        }
    );

    atualizarResumoSelecao();
}

function organizarAssentosPorFileira(
    assentos
) {
    const resultado = {};

    assentos.forEach(
        assento => {
            const letra =
                assento.codigo
                    .charAt(0)
                    .toUpperCase();

            if (!resultado[letra]) {
                resultado[letra] = [];
            }

            resultado[letra].push(
                assento
            );
        }
    );

    Object.values(resultado)
        .forEach(fileira => {
            fileira.sort(
                (a, b) =>
                    obterNumeroAssento(
                        a.codigo
                    ) -
                    obterNumeroAssento(
                        b.codigo
                    )
            );
        });

    return resultado;
}

function criarFileira(
    letraFileira,
    assentos
) {
    const fileira =
        document.createElement(
            "div"
        );

    fileira.classList.add(
        "fileira"
    );

    const identificadorEsquerdo =
        criarIdentificadorFileira(
            letraFileira
        );

    const areaAssentos =
        document.createElement(
            "div"
        );

    areaAssentos.classList.add(
        "area-assentos-fileira"
    );

    assentos.forEach(
        assento => {
            const numeroAssento =
                obterNumeroAssento(
                    assento.codigo
                );

            const elemento =
                criarAssento(
                    assento
                );

            elemento.style.gridColumn =
                obterColunaAssento(
                    letraFileira,
                    numeroAssento
                );

            areaAssentos.appendChild(
                elemento
            );
        }
    );

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
        document.createElement(
            "span"
        );

    identificador.classList.add(
        "identificador-fileira"
    );

    identificador.textContent =
        letraFileira;

    return identificador;
}

function obterNumeroAssento(
    codigo
) {
    return Number(
        codigo.substring(1)
    );
}

/* =========================================================
   ASSENTO
========================================================= */

function criarAssento(
    assento
) {
    const botao =
        document.createElement(
            "button"
        );

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

    const reservadoPeloFuncionario =
        assento.status === "reservado" &&
        assento.reservadoPeloUsuarioAtual;

    const indisponivel =
        assento.status === "ocupado" ||
        (
            assento.status === "reservado" &&
            !assento.reservadoPeloUsuarioAtual
        ) ||
        assento.status === "bloqueado";

    if (reservadoPeloFuncionario) {
        botao.classList.add(
            "selecionado"
        );

        botao.title =
            `Assento ${assento.codigo} selecionado`;

        botao.addEventListener(
            "click",
            () =>
                cancelarSelecaoAssento(
                    assento
                )
        );

    } else if (indisponivel) {
        botao.classList.add(
            "ocupado"
        );

        if (
            assento.status === "bloqueado"
        ) {
            botao.classList.add(
                "bloqueado"
            );
        }

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
            () =>
                reservarAssento(
                    assento
                )
        );
    }

    if (
        operacaoAssentoEmAndamento ||
        vendaEmAndamento
    ) {
        botao.disabled = true;
    }

    return botao;
}

/* =========================================================
   RESERVAR ASSENTO
========================================================= */

async function reservarAssento(
    assento
) {
    if (
        operacaoAssentoEmAndamento ||
        vendaEmAndamento
    ) {
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
            await requisicaoAutenticada(
                "/ReservaAssento/lote",
                {
                    method: "POST",

                    body: JSON.stringify({
                        sessaoId:
                            sessaoIdAtual,

                        assentoIds
                    })
                }
            );
        }
    );
}

/* =========================================================
   CANCELAR RESERVA
========================================================= */

async function cancelarSelecaoAssento(
    assento
) {
    if (
        operacaoAssentoEmAndamento ||
        vendaEmAndamento
    ) {
        return;
    }

    await executarOperacaoAssento(
        async () => {
            const parametros =
                new URLSearchParams({
                    sessaoId:
                        String(
                            sessaoIdAtual
                        ),

                    assentoId:
                        String(
                            assento.id
                        )
                });

            await requisicaoAutenticada(
                `/ReservaAssento?${parametros}`,
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
    definirEstadoOperacaoAssento(
        true
    );

    try {
        await operacao();

        esconderMensagemPagina();
    } catch (erro) {
        console.error(
            "Erro ao alterar reserva:",
            erro
        );

        if (erro.status === 401) {
            redirecionarParaLogin();
            return;
        }

        exibirMensagemPagina(
            erro.message ||
            "Não foi possível atualizar a seleção.",
            "erro"
        );
    } finally {
        try {
            await sincronizarAssentosComServidor();
        } catch {
            /* erro já tratado */
        }

        definirEstadoOperacaoAssento(
            false
        );
    }
}

function definirEstadoOperacaoAssento(
    emAndamento
) {
    operacaoAssentoEmAndamento =
        emAndamento;

    mapaAssentos
        ?.querySelectorAll(
            "button.assento"
        )
        .forEach(botao => {
            botao.disabled =
                emAndamento ||
                vendaEmAndamento ||
                botao.classList.contains(
                    "ocupado"
                );
        });

    atualizarEstadoBotaoContinuar();
}

/* =========================================================
   CONTADORES
========================================================= */

function atualizarContadores(
    assentos
) {
    const totalDisponiveis =
        assentos.filter(
            assento =>
                assento.status ===
                "disponivel"
        ).length;

    const totalOcupados =
        assentos.filter(
            assento =>
                assento.status ===
                    "ocupado" ||
                assento.status ===
                    "bloqueado" ||
                (
                    assento.status ===
                        "reservado" &&
                    !assento
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

/* =========================================================
   RESUMO
========================================================= */

function atualizarResumoSelecao() {
    const quantidade =
        assentosSelecionados.length;

    if (quantidadeSelecionados) {
        quantidadeSelecionados.textContent =
            quantidade;
    }

    if (!quantidade) {
        if (
            listaAssentosSelecionados
        ) {
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

        atualizarEstadoBotaoContinuar();
        notificarAlteracaoSelecao();

        return;
    }

    assentosSelecionados.sort(
        (a, b) =>
            a.codigo.localeCompare(
                b.codigo,
                "pt-BR",
                {
                    numeric: true
                }
            )
    );

    if (
        listaAssentosSelecionados
    ) {
        listaAssentosSelecionados.textContent =
            assentosSelecionados
                .map(
                    assento =>
                        assento.codigo
                )
                .join(" - ");
    }

    if (valorTotal) {
        valorTotal.textContent =
            formatarPreco(
                obterValorTotal()
            );
    }

    atualizarEstadoBotaoContinuar();
    notificarAlteracaoSelecao();
}

function atualizarEstadoBotaoContinuar() {
    if (!botaoContinuar) {
        return;
    }

    botaoContinuar.disabled =
        operacaoAssentoEmAndamento ||
        vendaEmAndamento ||
        assentosSelecionados.length === 0;
}

function obterValorTotal() {
    return (
        assentosSelecionados.length *
        PRECO_INGRESSO
    );
}

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

function obterAssentosSelecionados() {
    return [
        ...assentosSelecionados
    ];
}

/* =========================================================
   ATUALIZAÇÃO QUASE EM TEMPO REAL
========================================================= */

function iniciarAtualizacaoAutomatica() {
    pararAtualizacaoAutomatica();

    intervaloAtualizacao =
        window.setInterval(
            async () => {
                if (
                    !paginaAtiva ||
                    document.hidden ||
                    operacaoAssentoEmAndamento ||
                    vendaEmAndamento
                ) {
                    return;
                }

                try {
                    await sincronizarAssentosComServidor();
                } catch {
                    /* atualização silenciosa */
                }
            },
            INTERVALO_ATUALIZACAO_MS
        );
}

function pararAtualizacaoAutomatica() {
    if (
        intervaloAtualizacao ===
        null
    ) {
        return;
    }

    window.clearInterval(
        intervaloAtualizacao
    );

    intervaloAtualizacao = null;
}

function tratarVisibilidadePagina() {
    if (document.hidden) {
        return;
    }

    sincronizarAssentosComServidor()
        .catch(() => {});
}

function tratarSaidaPagina() {
    paginaAtiva = false;

    pararAtualizacaoAutomatica();
}

function tratarRetornoPagina() {
    paginaAtiva = true;

    sincronizarAssentosComServidor()
        .catch(() => {});

    iniciarAtualizacaoAutomatica();
}

/* =========================================================
   TROCA DE SESSÃO
========================================================= */

async function abrirModalSessoes() {
    if (
        carregandoTrocaSessao ||
        vendaEmAndamento
    ) {
        return;
    }

    abrirModal(
        modalSessoes
    );

    if (pesquisaSessao) {
        pesquisaSessao.value = "";
    }

    if (listaSessoes) {
        listaSessoes.innerHTML = `
            <div class="carregando-sessoes">
                Carregando sessões...
            </div>
        `;
    }

    carregandoTrocaSessao = true;

    try {
        sessoesDisponiveis =
            await buscarSessoesFuturas();

        renderizarSessoesFiltradas();

        pesquisaSessao?.focus();
    } catch (erro) {
        console.error(
            "Erro ao carregar sessões:",
            erro
        );

        if (listaSessoes) {
            listaSessoes.innerHTML = `
                <p class="mensagem-erro">
                    Não foi possível carregar as sessões.
                </p>
            `;
        }
    } finally {
        carregandoTrocaSessao = false;
    }
}

function fecharModalSessoes() {
    if (carregandoTrocaSessao) {
        return;
    }

    fecharModal(
        modalSessoes
    );
}

async function buscarSessoesFuturas() {
    const resposta =
        await apiRequest(
            "/Sessao/ativas"
        );

    if (!resposta.ok) {
        throw criarErroApiRequest(
            resposta,
            "Não foi possível carregar as sessões."
        );
    }

    if (
        !Array.isArray(
            resposta.data
        )
    ) {
        throw new Error(
            "A API retornou sessões inválidas."
        );
    }

    const agora = new Date();

    return resposta.data
        .filter(sessao => {
            const dataHora =
                new Date(
                    sessao.dataHora ??
                    sessao.DataHora
                );

            return (
                !Number.isNaN(
                    dataHora.getTime()
                ) &&
                dataHora > agora
            );
        })
        .sort(
            (a, b) =>
                new Date(
                    a.dataHora ??
                    a.DataHora
                ) -
                new Date(
                    b.dataHora ??
                    b.DataHora
                )
        );
}

function renderizarSessoesFiltradas() {
    if (!listaSessoes) {
        return;
    }

    const pesquisa =
        pesquisaSessao?.value
            .trim()
            .toLocaleLowerCase(
                "pt-BR"
            ) || "";

    const filtradas =
        sessoesDisponiveis.filter(
            sessao =>
                String(
                    sessao.tituloFilme ??
                    sessao.TituloFilme ??
                    ""
                )
                    .toLocaleLowerCase(
                        "pt-BR"
                    )
                    .includes(
                        pesquisa
                    )
        );

    listaSessoes.replaceChildren();

    if (!filtradas.length) {
        const mensagem =
            document.createElement(
                "p"
            );

        mensagem.className =
            "nenhuma-sessao";

        mensagem.textContent =
            "Nenhuma sessão encontrada.";

        listaSessoes.append(
            mensagem
        );

        return;
    }

    const grupos =
        agruparSessoesPorDia(
            filtradas
        );

    grupos.forEach(grupo => {
        listaSessoes.append(
            criarGrupoSessoes(
                grupo
            )
        );
    });
}

function agruparSessoesPorDia(
    sessoes
) {
    const mapa = new Map();

    sessoes.forEach(sessao => {
        const data =
            new Date(
                sessao.dataHora ??
                sessao.DataHora
            );

        const chave =
            obterChaveDataLocal(
                data
            );

        if (!mapa.has(chave)) {
            mapa.set(
                chave,
                {
                    data,
                    sessoes: []
                }
            );
        }

        mapa.get(chave)
            .sessoes.push(
                sessao
            );
    });

    return Array.from(
        mapa.values()
    );
}

function criarGrupoSessoes(
    grupo
) {
    const section =
        document.createElement(
            "section"
        );

    section.className =
        "grupo-sessoes-dia";

    const header =
        document.createElement(
            "header"
        );

    header.className =
        "grupo-sessoes-cabecalho";

    const tituloDia =
        document.createElement(
            "strong"
        );

    tituloDia.textContent =
        obterNomeRelativoDia(
            grupo.data
        );

    const dataTexto =
        document.createElement(
            "span"
        );

    dataTexto.textContent =
        grupo.data.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "long"
            }
        );

    header.append(
        tituloDia,
        dataTexto
    );

    const lista =
        document.createElement(
            "div"
        );

    lista.className =
        "grupo-sessoes-lista";

    grupo.sessoes.forEach(
        sessao => {
            lista.append(
                criarOpcaoSessao(
                    sessao
                )
            );
        }
    );

    section.append(
        header,
        lista
    );

    return section;
}

function criarOpcaoSessao(
    sessao
) {
    const botao =
        document.createElement(
            "button"
        );

    botao.type = "button";
    botao.className =
        "sessao-opcao";

    const sessaoId =
        obterIdSessao(
            sessao
        );

    const dataHora =
        new Date(
            sessao.dataHora ??
            sessao.DataHora
        );

    const titulo =
        sessao.tituloFilme ??
        sessao.TituloFilme ??
        "Filme";

    botao.innerHTML = `
        <span class="sessao-opcao-filme">
            ${escaparHtml(titulo)}
        </span>

        <strong class="sessao-opcao-horario">
            ${formatarHorario(dataHora)}
        </strong>
    `;

    if (
        sessaoId ===
        sessaoIdAtual
    ) {
        botao.classList.add(
            "ativa"
        );

        botao.disabled = true;
    } else {
        botao.addEventListener(
            "click",
            () =>
                trocarSessao(
                    sessaoId
                )
        );
    }

    return botao;
}

function obterIdSessao(
    sessao
) {
    return Number(
        sessao.id ??
        sessao.Id
    );
}

/* =========================================================
   EFETIVAR TROCA DE SESSÃO
========================================================= */

async function trocarSessao(
    novaSessaoId
) {
    if (
        vendaEmAndamento ||
        novaSessaoId === sessaoIdAtual
    ) {
        fecharModalSessoes();
        return;
    }

    carregandoTrocaSessao = true;

    try {
        await liberarReservasSessaoAtual();

        assentosSelecionados = [];
        todosAssentos = [];

        atualizarResumoSelecao();

        sessaoIdAtual =
            Number(
                novaSessaoId
            );

        atualizarSessaoIdUrl(
            sessaoIdAtual
        );

        fecharModal(
            modalSessoes
        );

        await carregarSessaoCompleta(
            sessaoIdAtual,
            true
        );
    } catch (erro) {
        console.error(
            "Erro ao trocar sessão:",
            erro
        );

        exibirMensagemPagina(
            erro.message ||
            "Não foi possível alterar a sessão.",
            "erro"
        );
    } finally {
        carregandoTrocaSessao = false;
    }
}

async function liberarReservasSessaoAtual() {
    if (!sessaoIdAtual) {
        return;
    }

    try {
        await requisicaoAutenticada(
            `/ReservaAssento/minhas?sessaoId=${sessaoIdAtual}`,
            {
                method: "DELETE"
            }
        );
    } catch (erro) {
        if (erro.status === 401) {
            throw erro;
        }

        console.warn(
            "Não foi possível liberar as reservas da sessão anterior:",
            erro
        );
    }
}

/* =========================================================
   MODAL DE VENDA
========================================================= */

function abrirModalVenda() {
    if (
        !assentosSelecionados.length ||
        vendaEmAndamento
    ) {
        return;
    }

    esconderErroVenda();
    limparFormaPagamento();
    preencherResumoVenda();

    abrirModal(
        modalVenda
    );
}

function fecharModalVenda() {
    if (vendaEmAndamento) {
        return;
    }

    fecharModal(
        modalVenda
    );
}

function preencherResumoVenda() {
    if (ingressosSelecionados) {
        ingressosSelecionados.replaceChildren();

        assentosSelecionados.forEach(
            assento => {
                ingressosSelecionados.append(
                    criarResumoIngressoVenda(
                        assento
                    )
                );
            }
        );
    }

    atualizarValoresModalVenda();
}

function criarResumoIngressoVenda(
    assento
) {
    const artigo =
        document.createElement(
            "article"
        );

    artigo.className =
        "ingresso-selecionado";

    const dataHora =
        new Date(
            dadosSessaoAtual?.dataHora ??
            dadosSessaoAtual?.DataHora
        );

    const titulo =
        dadosSessaoAtual?.tituloFilme ??
        dadosSessaoAtual?.TituloFilme ??
        "Filme";

    artigo.dataset.assentoId =
        assento.id;

    artigo.innerHTML = `
        <div class="dado-ingresso dado-filme">
            <span class="rotulo-ingresso">
                Filme
            </span>

            <strong class="valor-ingresso">
                ${escaparHtml(titulo)}
            </strong>
        </div>

        <div class="dado-ingresso">
            <span class="rotulo-ingresso">
                Data
            </span>

            <strong class="valor-ingresso">
                ${formatarData(dataHora)}
            </strong>
        </div>

        <div class="dado-ingresso">
            <span class="rotulo-ingresso">
                Horário
            </span>

            <strong class="valor-ingresso">
                ${formatarHorario(dataHora)}
            </strong>
        </div>

        <div class="dado-ingresso">
            <span class="rotulo-ingresso">
                Assento
            </span>

            <strong class="valor-ingresso">
                ${escaparHtml(assento.codigo)}
            </strong>
        </div>

        <div class="dado-ingresso">
            <span class="rotulo-ingresso">
                Valor
            </span>

            <strong
                class="valor-ingresso valor-ingresso-preco"
            >
                ${formatarPreco(PRECO_INGRESSO)}
            </strong>
        </div>
    `;

    return artigo;
}

function atualizarValoresModalVenda() {
    const formaPagamento =
        obterFormaPagamentoSelecionada();

    const cortesia =
        formaPagamento === "Cortesia";

    const valorUnitario =
        cortesia
            ? 0
            : PRECO_INGRESSO;

    const total =
        valorUnitario *
        assentosSelecionados.length;

    ingressosSelecionados
        ?.querySelectorAll(
            ".valor-ingresso-preco"
        )
        .forEach(elemento => {
            elemento.textContent =
                formatarPreco(
                    valorUnitario
                );
        });

    if (valorTotalModal) {
        valorTotalModal.textContent =
            formatarPreco(
                total
            );
    }
}

function obterFormaPagamentoSelecionada() {
    return document.querySelector(
        'input[name="formaPagamento"]:checked'
    )?.value ?? null;
}

function limparFormaPagamento() {
    opcoesPagamento.forEach(
        opcao => {
            opcao.checked = false;
            opcao.disabled = false;
        }
    );
}

/* =========================================================
   FINALIZAR VENDA
========================================================= */

async function finalizarVenda() {
    if (vendaEmAndamento) {
        return;
    }

    esconderErroVenda();

    const formaPagamento =
        obterFormaPagamentoSelecionada();

    if (!formaPagamento) {
        exibirErroVenda(
            "Selecione a forma de pagamento."
        );

        return;
    }

    if (!assentosSelecionados.length) {
        exibirErroVenda(
            "Selecione pelo menos um assento."
        );

        return;
    }

    const assentoIds =
        assentosSelecionados.map(
            assento =>
                assento.id
        );

    definirEstadoFinalizacaoVenda(
        true
    );

    try {
        const resultado =
            await requisicaoAutenticada(
                "/Ingresso/bilheteria/lote",
                {
                    method: "POST",

                    body: JSON.stringify({
                        sessaoId:
                            sessaoIdAtual,

                        assentoIds,

                        formaPagamento
                    })
                }
            );

        const venda =
            normalizarRespostaVenda(
                resultado
            );

        /*
            Primeiro validamos a resposta.
            Só depois fechamos o modal.
        */

        if (
            !venda.vendaId ||
            !Array.isArray(
                venda.ingressos
            ) ||
            !venda.ingressos.length
        ) {
            throw new Error(
                "A venda foi processada, mas o servidor retornou dados inválidos."
            );
        }

        fecharModal(
            modalVenda
        );

        await processarVendaConcluida(
            venda
        );
    } catch (erro) {
        console.error(
            "Erro ao finalizar venda:",
            erro
        );

        if (erro.status === 401) {
            redirecionarParaLogin();
            return;
        }

        if (erro.status === 403) {
            exibirErroVenda(
                "Você não possui permissão para realizar esta venda."
            );

            return;
        }

        exibirErroVenda(
            erro.message ||
            "Não foi possível concluir a venda."
        );

        /*
            Se a reserva expirou ou algum lugar foi
            vendido por outra pessoa, atualizamos o
            mapa imediatamente.
        */

        try {
            await sincronizarAssentosComServidor();
            preencherResumoVenda();
        } catch {
            /* erro de sincronização já tratado */
        }
    } finally {
        definirEstadoFinalizacaoVenda(
            false
        );
    }
}

function definirEstadoFinalizacaoVenda(
    finalizando
) {
    vendaEmAndamento =
        finalizando;

    if (botaoFinalizarVenda) {
        botaoFinalizarVenda.disabled =
            finalizando;

        botaoFinalizarVenda.textContent =
            finalizando
                ? "Finalizando venda..."
                : "Finalizar venda";
    }

    opcoesPagamento.forEach(
        opcao => {
            opcao.disabled =
                finalizando;
        }
    );

    mapaAssentos
        ?.querySelectorAll(
            "button.assento"
        )
        .forEach(botao => {
            botao.disabled =
                finalizando ||
                botao.classList.contains(
                    "ocupado"
                );
        });

    atualizarEstadoBotaoContinuar();
}

/* =========================================================
   RESPOSTA DA VENDA
========================================================= */

function normalizarRespostaVenda(
    resultado
) {
    if (!resultado) {
        return {
            vendaId: null,
            formaPagamento: null,
            valorTotal: 0,
            ingressos: []
        };
    }

    const ingressosOriginais =
        resultado.ingressos ??
        resultado.Ingressos ??
        [];

    const ingressos =
        Array.isArray(
            ingressosOriginais
        )
            ? ingressosOriginais.map(
                normalizarIngressoVenda
            )
            : [];

    return {
        vendaId:
            Number(
                resultado.vendaId ??
                resultado.VendaId
            ),

        formaPagamento:
            resultado.formaPagamento ??
            resultado.FormaPagamento ??
            null,

        valorTotal:
            Number(
                resultado.valorTotal ??
                resultado.ValorTotal ??
                0
            ),

        ingressos
    };
}

function normalizarIngressoVenda(
    ingresso
) {
    return {
        id:
            Number(
                ingresso.id ??
                ingresso.Id
            ),

        sessaoId:
            Number(
                ingresso.sessaoId ??
                ingresso.SessaoId
            ),

        filme:
            ingresso.filme ??
            ingresso.Filme ??
            "",

        dataSessao:
            ingresso.dataSessao ??
            ingresso.DataSessao ??
            null,

        assentoId:
            Number(
                ingresso.assentoId ??
                ingresso.AssentoId
            ),

        codigoAssento:
            ingresso.codigoAssento ??
            ingresso.CodigoAssento ??
            "",

        usuarioId:
            ingresso.usuarioId ??
            ingresso.UsuarioId ??
            null,

        usuario:
            ingresso.usuario ??
            ingresso.Usuario ??
            null,

        valorPago:
            Number(
                ingresso.valorPago ??
                ingresso.ValorPago ??
                0
            ),

        tokenQrCode:
            ingresso.tokenQrCode ??
            ingresso.TokenQrCode ??
            "",

        dataCompra:
            ingresso.dataCompra ??
            ingresso.DataCompra ??
            null,

        utilizado:
            Boolean(
                ingresso.utilizado ??
                ingresso.Utilizado ??
                false
            ),

        dataUtilizacao:
            ingresso.dataUtilizacao ??
            ingresso.DataUtilizacao ??
            null
    };
}

/* =========================================================
   VENDA CONCLUÍDA
========================================================= */

async function processarVendaConcluida(venda) {
    ultimaVendaBilheteria = venda;

    assentosSelecionados = [];

    limparFormaPagamento();

    try {
        await sincronizarAssentosComServidor();
    } catch (erro) {
        console.warn(
            "Venda concluída, mas o mapa não pôde ser atualizado:",
            erro
        );

        atualizarResumoSelecao();
    }

    preencherResultadoVenda(venda);

    if (!modalResultadoVenda) {
        console.error(
            'O elemento "#modal-resultado-venda" não foi encontrado no HTML.'
        );

        document.body.classList.remove(
            "modal-aberto"
        );

        return;
    }

    abrirModal(
        modalResultadoVenda
    );
}

function preencherResultadoVenda(venda) {
    const quantidade =
        venda.ingressos.length;

    if (tituloResultadoVenda) {
        tituloResultadoVenda.textContent =
            "Venda concluída";
    }

    if (descricaoResultadoVenda) {
        descricaoResultadoVenda.textContent =
            quantidade === 1
                ? "O ingresso foi registrado com sucesso."
                : `${quantidade} ingressos foram registrados com sucesso.`;
    }

    renderizarIdsIngressos(venda);
    prepararStatusImpressao(venda);
}

function renderizarIdsIngressos(venda) {
    if (!idsIngressosVenda) {
        return;
    }

    idsIngressosVenda.replaceChildren();

    const identificacaoVenda =
        document.createElement("div");

    identificacaoVenda.className =
        "identificacao-venda";

    identificacaoVenda.innerHTML = `
        <span>Venda</span>
        <strong>#${venda.vendaId}</strong>
    `;

    idsIngressosVenda.append(
        identificacaoVenda
    );

    venda.ingressos.forEach(
        ingresso => {
            const item =
                document.createElement("div");

            item.className =
                "identificacao-ingresso";

            item.innerHTML = `
                <span>
                    ${escaparHtml(ingresso.codigoAssento)}
                </span>

                <strong>
                    Ingresso #${ingresso.id}
                </strong>
            `;

            idsIngressosVenda.append(
                item
            );
        }
    );
}

/* =========================================================
   IMPRESSÃO - PREPARAÇÃO
========================================================= */

function prepararStatusImpressao(venda) {
    if (statusImpressao) {
        statusImpressao.classList.remove(
            "erro",
            "sucesso"
        );
    }

    if (statusImpressaoTitulo) {
        statusImpressaoTitulo.textContent =
            "Ingressos prontos para impressão";
    }

    if (statusImpressaoDescricao) {
        const quantidade =
            venda.ingressos.length;

        statusImpressaoDescricao.textContent =
            quantidade === 1
                ? "O ingresso foi criado e poderá ser impresso quando a integração com a impressora estiver configurada."
                : "Os ingressos foram criados e poderão ser impressos quando a integração com a impressora estiver configurada.";
    }

    botaoReimprimir?.classList.add(
        "hidden"
    );
}

function tentarReimprimirUltimaVenda() {
    if (!ultimaVendaBilheteria) {
        return;
    }

    /*
        A impressão será implementada
        posteriormente.
    */
}

/* =========================================================
   NOVA VENDA
========================================================= */

async function iniciarNovaVenda() {
    fecharModal(
        modalResultadoVenda
    );

    ultimaVendaBilheteria = null;

    limparFormaPagamento();
    esconderErroVenda();

    try {
        await sincronizarAssentosComServidor();
    } catch {
        exibirMensagemPagina(
            "A venda foi concluída, mas não foi possível atualizar os assentos.",
            "erro"
        );
    }
}

/* =========================================================
   MODAIS
========================================================= */

function abrirModal(modal) {
    if (!modal) {
        console.error(
            "Tentativa de abrir um modal inexistente."
        );

        atualizarBloqueioScroll();
        return;
    }

    modal.hidden = false;

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    modal.classList.add(
        "aberto",
        "ativo"
    );

    atualizarBloqueioScroll();
}

function fecharModal(modal) {
    if (!modal) {
        atualizarBloqueioScroll();
        return;
    }

    modal.classList.remove(
        "aberto",
        "ativo"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.hidden = true;

    atualizarBloqueioScroll();
}

function atualizarBloqueioScroll() {
    const existeModalVisivel = [
        modalSessoes,
        modalVenda,
        modalResultadoVenda
    ].some(
        modal =>
            modal &&
            !modal.hidden &&
            (
                modal.classList.contains("ativo") ||
                modal.classList.contains("aberto")
            )
    );

    document.body.classList.toggle(
        "modal-aberto",
        existeModalVisivel
    );
}

function existeModalAberto() {
    return [
        modalSessoes,
        modalVenda,
        modalResultadoVenda
    ].some(
        modal =>
            modal &&
            !modal.hidden &&
            (
                modal.classList.contains("ativo") ||
                modal.classList.contains("aberto")
            )
    );
}

function controlarTeclado(evento) {
    if (evento.key !== "Escape") {
        return;
    }

    if (vendaEmAndamento) {
        return;
    }

    if (
        modalResultadoVenda &&
        !modalResultadoVenda.hidden
    ) {
        iniciarNovaVenda();
        return;
    }

    if (
        modalVenda &&
        !modalVenda.hidden
    ) {
        fecharModalVenda();
        return;
    }

    if (
        modalSessoes &&
        !modalSessoes.hidden
    ) {
        fecharModalSessoes();
    }
}

/* =========================================================
   VOLTAR
========================================================= */

async function voltarPaginaAnterior() {
    if (vendaEmAndamento) {
        return;
    }

    try {
        await liberarReservasSessaoAtual();
    } catch {
        /* não impede navegação */
    }

    if (
        window.history.length > 1
    ) {
        window.history.back();
        return;
    }

    window.location.href =
        "home-admin.html";
}

/* =========================================================
   URL
========================================================= */

function atualizarSessaoIdUrl(
    sessaoId
) {
    const url =
        new URL(
            window.location.href
        );

    url.searchParams.set(
        "sessaoId",
        String(sessaoId)
    );

    window.history.replaceState(
        {},
        "",
        url
    );
}

/* =========================================================
   COMUNICAÇÃO AUTENTICADA
========================================================= */

async function requisicaoAutenticada(
    endpoint,
    options = {}
) {
    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {
        const erro =
            new Error(
                "Sua sessão expirou. Faça login novamente."
            );

        erro.status = 401;

        throw erro;
    }

    const headers = {
        Accept:
            "application/json",

        Authorization:
            `Bearer ${token}`,

        ...(options.body
            ? {
                "Content-Type":
                    "application/json"
            }
            : {}),

        ...(options.headers ?? {})
    };

    let resposta;

    try {
        resposta =
            await fetch(
                `${API_URL}${endpoint}`,
                {
                    ...options,
                    headers
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
                "Não foi possível concluir a operação."
            );

        erro.status =
            resposta.status;

        erro.dados =
            dados;

        throw erro;
    }

    return dados;
}

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
        return await resposta.json();
    }

    const texto =
        await resposta.text();

    return texto || null;
}

function obterMensagemResposta(
    dados
) {
    if (!dados) {
        return null;
    }

    if (
        typeof dados === "string"
    ) {
        return dados;
    }

    if (
        dados.errors &&
        typeof dados.errors ===
            "object"
    ) {
        return Object.values(
            dados.errors
        )
            .flat()
            .filter(Boolean)
            .join("\n");
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

function criarErroApiRequest(
    resposta,
    fallback
) {
    const erro =
        new Error(
            resposta.message ??
            resposta.mensagem ??
            fallback
        );

    erro.status =
        resposta.status;

    return erro;
}

/* =========================================================
   MENSAGENS
========================================================= */

function exibirMensagemPagina(
    mensagem,
    tipo = "info"
) {
    if (!mensagemPagina) {
        return;
    }

    mensagemPagina.textContent =
        mensagem;

    mensagemPagina.className =
        `mensagem-pagina ${tipo}`;
}

function esconderMensagemPagina() {
    mensagemPagina?.classList.add(
        "hidden"
    );
}

function exibirErroVenda(
    mensagem
) {
    if (!mensagemModalVenda) {
        return;
    }

    mensagemModalVenda.textContent =
        mensagem;

    mensagemModalVenda.classList.remove(
        "hidden"
    );
}

function esconderErroVenda() {
    mensagemModalVenda?.classList.add(
        "hidden"
    );
}

function exibirCarregamentoAssentos() {
    if (!mapaAssentos) {
        return;
    }

    mapaAssentos.innerHTML = `
        <p class="mensagem-carregamento">
            Carregando assentos...
        </p>
    `;
}

/* =========================================================
   FORMATAÇÕES
========================================================= */

function formatarPreco(
    valor
) {
    return Number(valor)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}

function formatarData(
    data
) {
    if (
        !(data instanceof Date) ||
        Number.isNaN(
            data.getTime()
        )
    ) {
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

function formatarHorario(
    data
) {
    if (
        !(data instanceof Date) ||
        Number.isNaN(
            data.getTime()
        )
    ) {
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

function obterChaveDataLocal(
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

function obterNomeRelativoDia(
    data
) {
    const hoje =
        new Date();

    hoje.setHours(
        0,
        0,
        0,
        0
    );

    const comparacao =
        new Date(data);

    comparacao.setHours(
        0,
        0,
        0,
        0
    );

    const diferenca =
        Math.round(
            (
                comparacao -
                hoje
            ) /
            86400000
        );

    if (diferenca === 0) {
        return "Hoje";
    }

    if (diferenca === 1) {
        return "Amanhã";
    }

    return data
        .toLocaleDateString(
            "pt-BR",
            {
                weekday:
                    "long"
            }
        )
        .replace(
            /^./,
            letra =>
                letra.toUpperCase()
        );
}

function escaparHtml(
    valor
) {
    return String(
        valor ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

/* =========================================================
   REDIRECIONAMENTOS
========================================================= */

function redirecionarParaLogin() {
    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "usuario"
    );

    window.location.replace(
        "../../index.html"
    );
}

function redirecionarParaHomeCliente() {
    window.location.replace(
        "../public/home.html"
    );
}