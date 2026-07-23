// =========================
// ELEMENTOS
// =========================

const nomeUsuario = document.getElementById("nomeUsuario");

const usuarioBtn = document.getElementById("usuarioBtn");

const menuUsuario = document.getElementById("menuUsuario");

const logoutBtn = document.getElementById("logoutBtn");

const listaFilmes = document.getElementById("listaFilmes");

const listaDatas = document.getElementById("listaDatas");

const listaSessoes = document.getElementById("listaSessoes");


// =========================
// VARIÁVEIS
// =========================

let sessoes = [];


// =========================
// LOGIN
// =========================

function verificarLogin() {

    const token = localStorage.getItem("token");

    const usuario = localStorage.getItem("usuario");


    if (!token || !usuario) {

        window.location.href = "../../index.html";

        return null;

    }


    return JSON.parse(usuario);

}


// =========================
// CARREGAR USUÁRIO
// =========================

function carregarUsuario() {


    const usuario = verificarLogin();


    if (!usuario)
        return;


    nomeUsuario.textContent = usuario.nome;


}


// =========================
// MENU USUÁRIO
// =========================

function configurarMenuUsuario() {


    usuarioBtn.addEventListener("click", function(event){


        event.stopPropagation();


        menuUsuario.classList.toggle("ativo");


    });



    document.addEventListener("click", function(){


        menuUsuario.classList.remove("ativo");


    });



    menuUsuario.addEventListener("click", function(event){


        event.stopPropagation();


    });


}


// =========================
// LOGOUT
// =========================

function configurarLogout(){


    logoutBtn.addEventListener("click", function(){


        localStorage.removeItem("token");


        localStorage.removeItem("usuario");


        window.location.href = "../../index.html";


    });


}

// =========================
// FILMES
// =========================

function obterClassificacao(numero){

    switch(numero){

        case 0:
            return "Livre";

        case 1:
            return "10 anos";

        case 2:
            return "12 anos";

        case 3:
            return "14 anos";

        case 4:
            return "16 anos";

        case 5:
            return "18 anos";

        default:
            return "Não informada";

    }

}

async function carregarFilmes() {
    const resposta = await apiRequest("/Filme");

    if(!resposta.ok){

        console.error("Erro ao carregar filmes");

        return;
    }

    filmes = resposta.data;

    mostrarFilmes();
}

async function mostrarFilmes() {

    listaFilmes.innerHTML = "";

    if(filmes.length === 0){

        listaFilmes.innerHTML = `

            <p class="mensagem-vazia">

                Nenhum filme em cartaz.

            </p>

        `;

        return;

    }

    filmes.forEach(filme => {

        const card = document.createElement("div");


        card.classList.add("filme-card");



        card.innerHTML = `

            <img src="/Frontend/assets/posters/layout tela matricula desenho.jpeg" alt="Poster do filme ${filme.titulo}">

            <h3>
                ${filme.titulo}
            </h3>

            <p>
                ${filme.genero}
            </p>

            <button>
                Ver detalhes
            </button>

        `;

        card.addEventListener("click", function(){

            window.location.href = `detalhes.html?id=${filme.id}`;

        });

        listaFilmes.appendChild(card);

    });
}


// =========================
// SESSÕES
// =========================


async function carregarSessoes(){


    const resposta = await apiRequest("/Sessao");


    if(!resposta.ok){


        console.error("Erro ao carregar sessões");


        return;


    }


    sessoes = resposta.data;


    criarDatas();


}


// =========================
// CRIAR DATAS
// =========================

function criarDatas(){

    listaDatas.innerHTML = "";

    const datas = [
        ...new Set(
            sessoes.map(sessao =>
                sessao.dataHora.split("T")[0]
            )
        )
    ];

    datas.forEach((data, index) => {

        const botao = document.createElement("button");

        botao.classList.add("botao-data");

        if(index === 0){

            botao.classList.add("ativa");

        }

        botao.textContent = formatarData(data);

        botao.addEventListener("click", function(){

            document.querySelectorAll(".botao-data").forEach(botaoData => {

                botaoData.classList.remove("ativa");

            });

            botao.classList.add("ativa");

            mostrarSessoesDaData(data);

        });

        listaDatas.appendChild(botao);

    });

    if(datas.length > 0){

        mostrarSessoesDaData(datas[0]);

    }

}



// =========================
// MOSTRAR SESSÕES
// =========================

function mostrarSessoesDaData(data){


    listaSessoes.innerHTML = "";



    const sessoesDoDia = sessoes.filter(sessao =>


        sessao.dataHora.startsWith(data)


    );



    sessoesDoDia.forEach(sessao => {



        const horario = new Date(sessao.dataHora)
            .toLocaleTimeString(
                "pt-BR",
                {
                    hour:"2-digit",
                    minute:"2-digit"
                }
            );



        const card = document.createElement("div");


        card.classList.add("sessao-card");



        card.innerHTML = `

            <h3>
                ${sessao.tituloFilme}
            </h3>

            <p class="horario">
                ${horario}
            </p>


            <button onclick="window.location.href='assentos.html?sessaoId=${sessao.id}'">
                Comprar ingresso
            </button>

        `;



        listaSessoes.appendChild(card);



    });


}


// =========================
// FORMATAR DATA
// =========================

function formatarData(data){


    const partes = data.split("-");


    return `${partes[2]}/${partes[1]}`;


}


// =========================
// INICIALIZAÇÃO
// =========================

function inicializarPagina(){

    carregarUsuario();

    configurarMenuUsuario();

    configurarLogout();

    carregarFilmes();

    carregarSessoes();
}

inicializarPagina();