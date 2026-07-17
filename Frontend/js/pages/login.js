const form = document.getElementById("login-form");

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");

const errorMessage = document.getElementById("login-error");

const button = document.getElementById("login-button");


form.addEventListener("submit", async (event) => {

    event.preventDefault();


    const email = emailInput.value.trim();
    const senha = senhaInput.value.trim();


    errorMessage.textContent = "";


    if(!email || !senha){

        errorMessage.textContent =
            "Preencha todos os campos.";

        return;
    }


    button.disabled = true;
    button.textContent = "Entrando...";


    const resposta = await apiRequest(
        "/Usuario/login",
        {
            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({
                email,
                senha
            })
        }
    );


    if(!resposta.ok){

        if(resposta.status === 401){
        
            errorMessage.textContent =
                "Email ou senha inválidos.";
        
        }
        else if(resposta.error){
        
            errorMessage.textContent =
                "Não foi possível conectar ao servidor.";
        
        }
        else{
        
            errorMessage.textContent =
                "Ocorreu um erro no servidor.";
        
        }
    
    
        button.disabled = false;
        button.textContent = "Entrar";
    
        return;
    }


    const {token, usuario} = resposta.data;


    localStorage.setItem(
        "token",
        token
    );


    localStorage.setItem(
        "usuario",
        JSON.stringify(usuario)
    );


    if(usuario.tipoUsuario === "Funcionario"){

        window.location.href =
            "admin/dashboard.html";

    }
    else{

        window.location.href =
            "home.html";

    }


});