console.log("Cadastro JS carregado");

const form = document.getElementById("cadastro-form");

const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");

const errorMessage = document.getElementById("cadastro-error");
const button = document.getElementById("cadastro-button");

form.addEventListener("submit", cadastrarUsuario);

async function cadastrarUsuario(event) {

    event.preventDefault();

    errorMessage.textContent = "";

    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();

    // ============================
    // Validações
    // ============================

    if (!nome || !email || !senha) {

        errorMessage.textContent =
            "Preencha todos os campos.";

        return;
    }

    if (nome.length < 3) {

        errorMessage.textContent =
            "O nome deve possuir pelo menos 3 caracteres.";

        return;
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {

        errorMessage.textContent =
            "Digite um e-mail válido.";

        return;
    }

    if (senha.length < 6) {

        errorMessage.textContent =
            "A senha deve possuir pelo menos 6 caracteres.";

        return;
    }

    // ============================
    // Estado do botão
    // ============================

    button.disabled = true;
    button.textContent = "Criando conta...";

    try {

        // ============================
        // Cadastro
        // ============================

        const cadastro = await apiRequest(
            "/Usuario",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    nome,
                    email,
                    senha
                })
            }
        );

        if (!cadastro.ok) {

            if (cadastro.status === 400) {

                errorMessage.textContent =
                    "Já existe uma conta com este e-mail.";

            }
            else {

                errorMessage.textContent =
                    "Não foi possível criar a conta.";

            }

            return;
        }

        // ============================
        // Login automático
        // ============================

        const login = await apiRequest(
            "/Usuario/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    senha
                })
            }
        );

        if (!login.ok) {

            errorMessage.textContent =
                "Conta criada com sucesso, mas não foi possível entrar automaticamente.";

            return;
        }

        // ============================
        // Salva autenticação
        // ============================

        localStorage.setItem(
            "token",
            login.data.token
        );

        localStorage.setItem(
            "usuario",
            JSON.stringify(login.data.usuario)
        );

        // ============================
        // Redirecionamento
        // ============================

        if (login.data.usuario.tipoUsuario === "Funcionario") {

            window.location.href =
                "../admin/dashboard.html";

        }
        else {

            window.location.href =
                "home.html";

        }

    }
    catch (erro) {

        console.error(erro);

        errorMessage.textContent =
            "Não foi possível conectar ao servidor.";

    }
    finally {

        button.disabled = false;
        button.textContent = "Criar conta";

    }

}