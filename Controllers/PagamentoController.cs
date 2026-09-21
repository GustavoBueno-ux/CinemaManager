using CinemaAPI.DTOs.Pagamentos;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Stripe;
using Stripe.Checkout;
using System.Security.Claims;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PagamentoController : ControllerBase
{
    private readonly IPagamentoService _pagamentoService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PagamentoController> _logger;

    public PagamentoController(
        IPagamentoService pagamentoService,
        IConfiguration configuration,
        ILogger<PagamentoController> logger
    )
    {
        _pagamentoService = pagamentoService;
        _configuration = configuration;
        _logger = logger;
    }


    // =========================================================
    // CRIAR CHECKOUT
    // =========================================================

    [Authorize]
    [HttpPost("checkout")]
    public async Task<IActionResult> CriarCheckout(
        [FromBody] CriarCheckoutDTO dto
    )
    {
        var usuarioIdClaim =
            User.FindFirst(
                ClaimTypes.NameIdentifier
            )?.Value;

        if (
            !int.TryParse(
                usuarioIdClaim,
                out var usuarioId
            )
        )
        {
            return Unauthorized(new
            {
                mensagem =
                    "Token inválido ou usuário não identificado."
            });
        }

        try
        {
            var resultado =
                await _pagamentoService
                    .CriarCheckoutAsync(
                        usuarioId,
                        dto
                    );

            return Ok(resultado);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(
                ex,
                "Dados inválidos ao criar Checkout para o usuário {UsuarioId}.",
                usuarioId
            );

            return BadRequest(new
            {
                mensagem = ex.Message
            });
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(
                ex,
                "Recurso não encontrado ao criar Checkout para o usuário {UsuarioId}.",
                usuarioId
            );

            return NotFound(new
            {
                mensagem = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(
                ex,
                "Falha ao criar Checkout para o usuário {UsuarioId}.",
                usuarioId
            );

            return Conflict(new
            {
                mensagem = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Erro inesperado ao criar Checkout para o usuário {UsuarioId}.",
                usuarioId
            );

            return StatusCode(500, new
            {
                mensagem =
                    "Ocorreu um erro interno ao iniciar o pagamento."
            });
        }
    }


    // =========================================================
    // WEBHOOK STRIPE
    // =========================================================

    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        var json =
            await new StreamReader(
                HttpContext.Request.Body
            ).ReadToEndAsync();

        var webhookSecret =
            _configuration[
                "Stripe:WebhookSecret"
            ];

        if (
            string.IsNullOrWhiteSpace(
                webhookSecret
            )
        )
        {
            _logger.LogError(
                "Stripe:WebhookSecret não está configurado."
            );

            return StatusCode(500);
        }

        Event stripeEvent;

        try
        {
            var signatureHeader =
                Request.Headers[
                    "Stripe-Signature"
                ].ToString();

            stripeEvent =
                EventUtility.ConstructEvent(
                    json,
                    signatureHeader,
                    webhookSecret
                );
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(
                ex,
                "Webhook do Stripe recebido com assinatura inválida."
            );

            return BadRequest();
        }

        try
        {
            switch (stripeEvent.Type)
            {
                case "checkout.session.completed":
                {
                    if (
                        stripeEvent.Data.Object
                        is Session session
                    )
                    {
                        await _pagamentoService
                            .ProcessarCheckoutConcluidoAsync(
                                session
                            );
                    }

                    break;
                }

                case "checkout.session.expired":
                {
                    if (
                        stripeEvent.Data.Object
                        is Session session
                    )
                    {
                        await _pagamentoService
                            .ProcessarCheckoutExpiradoAsync(
                                session
                            );
                    }

                    break;
                }
            }

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Erro ao processar webhook do Stripe. Evento: {StripeEventType}, ID: {StripeEventId}.",
                stripeEvent.Type,
                stripeEvent.Id
            );

            /*
             * IMPORTANTE:
             *
             * Se houver erro durante o processamento,
             * não retornamos 200.
             *
             * Assim o Stripe sabe que o evento não foi
             * processado corretamente e pode tentar
             * entregá-lo novamente.
             */

            return StatusCode(500);
        }
    }
}