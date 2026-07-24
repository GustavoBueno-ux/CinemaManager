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

export const PRECO_INGRESSO = 22;

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

        mostrarDadosSessao(
            dadosSessaoAtual
        );
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
   CARREGAMENTO DOS ASSENTOS
========================================= */

async function carregarAssentos() {
    try {
        const sessaoId =
            obterSessaoId();

        const resposta = await apiRequest(
            `/Assento/sessao/${sessaoId}`
        );

        if (!resposta.ok) {
            throw new Error(
                resposta.message
                ?? "Não foi possível carregar os assentos."
            );
        }

        if (!Array.isArray(resposta.data)) {
            throw new Error(
                "A API não retornou uma lista de assentos."
            );
        }

        todosAssentos =
            resposta.data;

        mostrarAssentos(
            todosAssentos
        );
    } catch (erro) {
        console.error(
            "Erro ao carregar assentos:",
            erro
        );

        if (mapaAssentos) {
            mapaAssentos.innerHTML = `
                <p class="mensagem-erro">
                    Não foi possível carregar os assentos.
                </p>
            `;
        }
    }
}

function mostrarAssentos(assentos) {
    if (!mapaAssentos) {
        console.error(
            'Elemento com ID "mapaAssentos" não encontrado.'
        );

        return;
    }

    mapaAssentos.innerHTML = "";

    atualizarContadores(
        assentos
    );

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

        const fileira =
            criarFileira(
                letraFileira,
                assentosFileira
            );

        mapaAssentos.appendChild(
            fileira
        );
    });
}

function organizarAssentosPorFileira(assentos) {
    const assentosPorFileira = {};

    assentos.forEach(assento => {
        const letraFileira =
            assento.codigo
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
            fileira.sort((a, b) => {
                return (
                    obterNumeroAssento(a.codigo)
                    - obterNumeroAssento(b.codigo)
                );
            });
        });

    return assentosPorFileira;
}

function obterNumeroAssento(codigo) {
    return Number(
        codigo.substring(1)
    );
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

        const coluna =
            obterColunaAssento(
                letraFileira,
                numeroAssento
            );

        elementoAssento.style.gridColumn =
            coluna;

        areaAssentos.appendChild(
            elementoAssento
        );
    });

    const identificadorDireito =
        criarIdentificadorFileira(
            letraFileira
        );

    fileira.appendChild(
        identificadorEsquerdo
    );

    fileira.appendChild(
        areaAssentos
    );

    fileira.appendChild(
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

    botao.title =
        `Assento ${assento.codigo}`;

    botao.dataset.assentoId =
        assento.id;

    botao.dataset.codigo =
        assento.codigo;

    if (assento.ocupado) {
        botao.classList.add(
            "ocupado"
        );

        botao.disabled = true;
    } else {
        botao.classList.add(
            "disponivel"
        );

        botao.addEventListener(
            "click",
            () => {
                alternarSelecaoAssento(
                    assento,
                    botao
                );
            }
        );
    }

    return botao;
}

function alternarSelecaoAssento(
    assento,
    elementoAssento
) {
    const indiceAssento =
        assentosSelecionados.findIndex(
            item => item.id === assento.id
        );

    const jaSelecionado =
        indiceAssento !== -1;

    if (jaSelecionado) {
        assentosSelecionados.splice(
            indiceAssento,
            1
        );

        elementoAssento.classList.remove(
            "selecionado"
        );

        elementoAssento.classList.add(
            "disponivel"
        );
    } else {
        assentosSelecionados.push(
            assento
        );

        elementoAssento.classList.remove(
            "disponivel"
        );

        elementoAssento.classList.add(
            "selecionado"
        );
    }

    atualizarResumoSelecao();
}


/* =========================================
   CONTADORES E RESUMO
========================================= */

function atualizarContadores(assentos) {
    const totalDisponiveis =
        assentos.filter(
            assento => !assento.ocupado
        ).length;

    const totalOcupados =
        assentos.filter(
            assento => assento.ocupado
        ).length;

    if (quantidadeDisponiveis) {
        quantidadeDisponiveis.textContent =
            totalDisponiveis;
    }

    if (quantidadeOcupados) {
        quantidadeOcupados.textContent =
            totalOcupados;
    }

    atualizarResumoSelecao();
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
        (assentoA, assentoB) => {
            return assentoA.codigo.localeCompare(
                assentoB.codigo,
                "pt-BR",
                {
                    numeric: true
                }
            );
        }
    );

    if (listaAssentosSelecionados) {
        const codigosAssentos =
            assentosSelecionados
                .map(assento => assento.codigo)
                .join(" - ");

        listaAssentosSelecionados.textContent =
            codigosAssentos;
    }

    if (valorTotal) {
        valorTotal.textContent =
            formatarPreco(
                obterValorTotal()
            );
    }

    if (botaoContinuar) {
        botaoContinuar.disabled = false;
    }

    notificarAlteracaoSelecao();
}


/* =========================================
   COMUNICAÇÃO COM O MODAL
========================================= */

function notificarAlteracaoSelecao() {
    const evento =
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
        );

    document.dispatchEvent(
        evento
    );
}


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
}

inicializarAssentos();