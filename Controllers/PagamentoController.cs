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

    public PagamentoController(
        IPagamentoService pagamentoService,
        IConfiguration configuration
    )
    {
        _pagamentoService = pagamentoService;
        _configuration = configuration;
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
            return BadRequest(new
            {
                mensagem = ex.Message
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                mensagem = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new
            {
                mensagem = ex.Message
            });
        }
        catch (Exception)
        {
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
        catch (StripeException)
        {
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
        catch (Exception)
        {
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