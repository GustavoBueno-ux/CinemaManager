using System.Text;
using System.Security.Claims;
using CinemaAPI.Data;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Stripe;

var builder = WebApplication.CreateBuilder(args);


// =========================================================
// STRIPE
// =========================================================

var stripeSecretKey = builder.Configuration["Stripe:SecretKey"];

if (string.IsNullOrWhiteSpace(stripeSecretKey))
{
    throw new InvalidOperationException(
        "A chave secreta do Stripe não foi configurada."
    );
}

StripeConfiguration.ApiKey = stripeSecretKey;


// =========================================================
// CONTROLLERS
// =========================================================

builder.Services.AddControllers();


// =========================================================
// CORS
// =========================================================

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});


// =========================================================
// SWAGGER
// =========================================================

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition(
        "Bearer",
        new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Digite apenas o token JWT."
        }
    );

    options.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
            {
                new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference
                    {
                        Type = ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                },
                Array.Empty<string>()
            }
        }
    );
});


// =========================================================
// BANCO DE DADOS
// =========================================================

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration
        .GetConnectionString("DefaultConnection");

    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    );
});


// =========================================================
// SERVICES
// =========================================================

builder.Services.AddScoped<IFilmeService, FilmeService>();
builder.Services.AddScoped<ISessaoService, SessaoService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IIngressoService, IngressoService>();
builder.Services.AddScoped<IAssentoService, AssentoService>();
builder.Services.AddScoped<IReservaAssentoService, ReservaAssentoService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IPosterService, PosterService>();
builder.Services.AddScoped<IRelatorioService, RelatorioService>();
builder.Services.AddScoped<IPagamentoService, PagamentoService>();


// =========================================================
// SERVIÇOS EM SEGUNDO PLANO
// =========================================================

builder.Services.AddHostedService<SessaoBackgroundService>();
builder.Services.AddHostedService<ReservaAssentoBackgroundService>();


// =========================================================
// JWT
// =========================================================

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters =
            new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,

                ValidIssuer =
                    builder.Configuration["Jwt:Issuer"],

                ValidAudience =
                    builder.Configuration["Jwt:Audience"],

                IssuerSigningKey =
                    new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(
                            builder.Configuration["Jwt:Key"]!
                        )
                    ),

                // Impede o uso de tokens ainda válidos de contas desativadas.
                RoleClaimType = ClaimTypes.Role
            };

        options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var usuarioId = context.Principal?
                        .FindFirst(ClaimTypes.NameIdentifier)?.Value;

                    if (!int.TryParse(usuarioId, out var id))
                    {
                        context.Fail("Token inválido.");
                        return;
                    }

                    var dbContext = context.HttpContext.RequestServices
                        .GetRequiredService<AppDbContext>();

                    var usuario = await dbContext.Usuarios
                        .Where(u => u.Id == id)
                        .Select(u => new
                        {
                            u.Ativo,
                            u.TipoUsuario
                        })
                        .FirstOrDefaultAsync();

                    var roleToken = context.Principal?
                        .FindFirst(ClaimTypes.Role)?.Value;

                    if (usuario is null ||
                        !usuario.Ativo ||
                        roleToken != usuario.TipoUsuario.ToString())
                    {
                        context.Fail("Token não corresponde ao usuário atual.");
                    }
                }
            };
    });


builder.Services.AddAuthorization();


var app = builder.Build();


// =========================================================
// MIGRATIONS + INICIALIZAÇÃO DO BANCO
// =========================================================

using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider
        .GetRequiredService<AppDbContext>();

    /*
        Aplica automaticamente somente as migrations
        que ainda não foram executadas no banco.

        Em um banco novo, como o MySQL do Railway,
        isso cria todas as tabelas antes de qualquer
        inicialização de dados.
    */

    await context.Database.MigrateAsync();


    /*
        Depois que as tabelas já existem,
        popula os assentos caso a tabela esteja vazia.
    */

    await DbInitializer.PopularAssentosAsync(context);
}


// =========================================================
// SWAGGER
// =========================================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


// =========================================================
// MIDDLEWARES
// =========================================================

app.UseHttpsRedirection();


// Permite servir arquivos da pasta wwwroot.
app.UseStaticFiles();


app.UseCors("AllowFrontend");


// A autenticação deve vir antes da autorização.
app.UseAuthentication();
app.UseAuthorization();


app.MapControllers();


app.Run();
