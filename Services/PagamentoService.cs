using CinemaAPI.Data;
using CinemaAPI.DTOs.Pagamentos;
using CinemaAPI.Models;
using CinemaAPI.Utils;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using System.Data;

namespace CinemaAPI.Services;

public class PagamentoService : IPagamentoService
{
    private const int MinutosCheckout = 30;

    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IIngressoService _ingressoService;

    public PagamentoService(
        AppDbContext context,
        IConfiguration configuration,
        IIngressoService ingressoService
    )
    {
        _context = context;
        _configuration = configuration;
        _ingressoService = ingressoService;
    }


    // =========================================================
    // CRIAR CHECKOUT
    // =========================================================

    public async Task<CheckoutResponseDTO>
        CriarCheckoutAsync(
            int usuarioId,
            CriarCheckoutDTO dto
        )
    {
        if (
            dto.AssentoIds is null ||
            dto.AssentoIds.Count == 0
        )
        {
            throw new ArgumentException(
                "Selecione pelo menos um assento."
            );
        }

        var assentoIds =
            dto.AssentoIds
                .Distinct()
                .ToList();

        if (
            assentoIds.Count !=
            dto.AssentoIds.Count
        )
        {
            throw new ArgumentException(
                "Existem assentos duplicados na solicitação."
            );
        }

        await using var transaction =
            await _context.Database
                .BeginTransactionAsync(
                    IsolationLevel.Serializable
                );

        try
        {
            var agora =
                HorarioCinema.Agora;


            // =================================================
            // USUÁRIO
            // =================================================

            var usuario =
                await _context.Usuarios
                    .FirstOrDefaultAsync(
                        u =>
                            u.Id == usuarioId &&
                            u.Ativo
                    );

            if (usuario is null)
            {
                throw new KeyNotFoundException(
                    "Usuário não encontrado."
                );
            }


            // =================================================
            // SESSÃO
            // =================================================

            var sessao =
                await _context.Sessoes
                    .Include(s => s.Filme)
                    .FirstOrDefaultAsync(
                        s => s.Id == dto.SessaoId
                    );

            if (sessao is null)
            {
                throw new KeyNotFoundException(
                    "Sessão não encontrada."
                );
            }

            if (!sessao.Ativa)
            {
                throw new InvalidOperationException(
                    "Esta sessão não está disponível para compra."
                );
            }

            if (
                agora >
                sessao.DataHora.AddMinutes(30)
            )
            {
                throw new InvalidOperationException(
                    "O período de compra desta sessão foi encerrado."
                );
            }


            // =================================================
            // ASSENTOS
            // =================================================

            var assentos =
                await _context.Assentos
                    .Where(
                        a =>
                            assentoIds.Contains(
                                a.Id
                            )
                    )
                    .ToListAsync();

            if (
                assentos.Count !=
                assentoIds.Count
            )
            {
                throw new KeyNotFoundException(
                    "Um ou mais assentos não foram encontrados."
                );
            }


            // =================================================
            // RESERVAS
            // =================================================

            var reservas =
                await _context.ReservasAssentos
                    .Where(
                        r =>
                            r.SessaoId ==
                                dto.SessaoId &&

                            r.UsuarioId ==
                                usuarioId &&

                            assentoIds.Contains(
                                r.AssentoId
                            ) &&

                            r.ExpiraEm > agora
                    )
                    .ToListAsync();

            if (
                reservas.Count !=
                assentoIds.Count
            )
            {
                throw new InvalidOperationException(
                    "Uma ou mais reservas expiraram ou não pertencem ao usuário."
                );
            }


            // =================================================
            // ASSENTOS JÁ VENDIDOS
            // =================================================

            var assentosJaVendidos =
                await _context.Ingressos
                    .AnyAsync(
                        i =>
                            i.SessaoId ==
                                dto.SessaoId &&

                            assentoIds.Contains(
                                i.AssentoId
                            )
                    );

            if (assentosJaVendidos)
            {
                throw new InvalidOperationException(
                    "Um ou mais assentos já foram vendidos."
                );
            }


            // =================================================
            // VALORES
            // =================================================

            var valorUnitario =
                sessao.PrecoIngresso;

            var valorTotal =
                valorUnitario *
                assentoIds.Count;


            // =================================================
            // EXPIRAÇÃO DO CHECKOUT
            // =================================================

            var expiraEm =
                agora.AddMinutes(
                    MinutosCheckout
                );

            foreach (
                var reserva in reservas
            )
            {
                reserva.ExpiraEm =
                    expiraEm;
            }


            // =================================================
            // PEDIDO ONLINE
            // =================================================

            var pedido =
                new PedidoOnline
                {
                    UsuarioId =
                        usuarioId,

                    SessaoId =
                        dto.SessaoId,

                    ValorTotal =
                        valorTotal,

                    Status =
                        StatusPedidoOnline.Pendente,

                    CriadoEm =
                        agora,

                    ExpiraEm =
                        expiraEm,

                    Assentos =
                        assentoIds
                            .Select(
                                assentoId =>
                                    new PedidoOnlineAssento
                                    {
                                        AssentoId =
                                            assentoId
                                    }
                            )
                            .ToList()
                };

            _context.PedidosOnline.Add(
                pedido
            );

            /*
             * Precisamos salvar aqui para obter o ID
             * do pedido antes de criar a Checkout Session.
             */

            await _context.SaveChangesAsync();


            // =================================================
            // FRONTEND
            // =================================================

            var frontendBaseUrl =
                _configuration[
                    "Frontend:BaseUrl"
                ];

            if (
                string.IsNullOrWhiteSpace(
                    frontendBaseUrl
                )
            )
            {
                throw new InvalidOperationException(
                    "A URL do frontend não foi configurada."
                );
            }

            frontendBaseUrl =
                frontendBaseUrl.TrimEnd('/');


            // =================================================
            // STRIPE CHECKOUT
            // =================================================

            var codigosAssentos =
                assentos
                    .OrderBy(a => a.Codigo)
                    .Select(a => a.Codigo);

            var descricaoAssentos =
                string.Join(
                    ", ",
                    codigosAssentos
                );

            var options =
                new SessionCreateOptions
                {
                    Mode = "payment",

                    ExpiresAt =
                        expiraEm,

                    SuccessUrl =
                        $"{frontendBaseUrl}/pagamento-sucesso.html" +
                        "?session_id={CHECKOUT_SESSION_ID}",

                    CancelUrl =
                        $"{frontendBaseUrl}/assentos.html" +
                        $"?sessaoId={dto.SessaoId}",

                    CustomerEmail =
                        usuario.Email,

                    ClientReferenceId =
                        pedido.Id.ToString(),

                    Metadata =
                        new Dictionary<string, string>
                        {
                            {
                                "pedidoId",
                                pedido.Id.ToString()
                            },
                            {
                                "usuarioId",
                                usuarioId.ToString()
                            }
                        },

                    LineItems =
                        new List<SessionLineItemOptions>
                        {
                            new()
                            {
                                Quantity =
                                    assentoIds.Count,

                                PriceData =
                                    new SessionLineItemPriceDataOptions
                                    {
                                        Currency =
                                            "brl",

                                        UnitAmount =
                                            decimal.ToInt64(
                                                valorUnitario *
                                                100m
                                            ),

                                        ProductData =
                                            new SessionLineItemPriceDataProductDataOptions
                                            {
                                                Name =
                                                    $"Ingresso - {sessao.Filme.Titulo}",

                                                Description =
                                                    $"Assentos: {descricaoAssentos}"
                                            }
                                    }
                            }
                        }
                };


            Session stripeSession;

            try
            {
                var stripeService =
                    new SessionService();

                stripeSession =
                    await stripeService
                        .CreateAsync(
                            options
                        );
            }
            catch (StripeException)
            {
                throw new InvalidOperationException(
                    "Não foi possível iniciar o pagamento no Stripe."
                );
            }


            // =================================================
            // VINCULAR STRIPE AO PEDIDO
            // =================================================

            if (
                string.IsNullOrWhiteSpace(
                    stripeSession.Url
                )
            )
            {
                throw new InvalidOperationException(
                    "O Stripe não retornou a URL de pagamento."
                );
            }

            pedido.StripeCheckoutSessionId =
                stripeSession.Id;

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();


            // =================================================
            // RESPOSTA
            // =================================================

            return new CheckoutResponseDTO
            {
                PedidoId =
                    pedido.Id,

                CheckoutUrl =
                    stripeSession.Url,

                ExpiraEm =
                    pedido.ExpiraEm
            };
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    // =========================================================
    // CHECKOUT CONCLUÍDO
    // =========================================================

    public async Task ProcessarCheckoutConcluidoAsync(
        Session session
    )
    {
        // =========================================================
        // PAGAMENTO PRECISA ESTAR CONFIRMADO
        // =========================================================
    
        if (
            !string.Equals(
                session.PaymentStatus,
                "paid",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            return;
        }
    
    
        // =========================================================
        // LOCALIZAR PEDIDO
        // =========================================================
    
        var pedido =
            await _context.PedidosOnline
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    p =>
                        p.StripeCheckoutSessionId ==
                        session.Id
                );
    
        if (pedido is null)
        {
            throw new InvalidOperationException(
                "Pedido referente ao Checkout não encontrado."
            );
        }
    
    
        // =========================================================
        // IDEMPOTÊNCIA
        // =========================================================
    
        if (
            pedido.Status ==
            StatusPedidoOnline.Pago
        )
        {
            return;
        }
    
        if (
            pedido.Status !=
            StatusPedidoOnline.Pendente
        )
        {
            throw new InvalidOperationException(
                "O pedido não está pendente."
            );
        }
    
    
        // =========================================================
        // VALIDAR REFERÊNCIA DO PEDIDO
        // =========================================================
    
        if (
            string.IsNullOrWhiteSpace(
                session.ClientReferenceId
            ) ||
            session.ClientReferenceId !=
                pedido.Id.ToString()
        )
        {
            throw new InvalidOperationException(
                "A referência do Checkout não corresponde ao pedido."
            );
        }
    
    
        // =========================================================
        // VALIDAR MOEDA
        // =========================================================
    
        if (
            !string.Equals(
                session.Currency,
                "brl",
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            throw new InvalidOperationException(
                "A moeda do pagamento não corresponde à moeda do pedido."
            );
        }
    
    
        // =========================================================
        // VALIDAR VALOR PAGO
        // =========================================================
    
        var valorEsperadoCentavos =
            decimal.ToInt64(
                pedido.ValorTotal * 100m
            );
    
        if (
            session.AmountTotal is null ||
            session.AmountTotal.Value !=
                valorEsperadoCentavos
        )
        {
            throw new InvalidOperationException(
                "O valor pago não corresponde ao valor do pedido."
            );
        }
    
    
        // =========================================================
        // PAYMENT INTENT
        // =========================================================
    
        if (
            string.IsNullOrWhiteSpace(
                session.PaymentIntentId
            )
        )
        {
            throw new InvalidOperationException(
                "O pagamento não possui um PaymentIntent válido."
            );
        }
    
    
        // =========================================================
        // EFETIVAR VENDA
        // =========================================================
    
        await _ingressoService
            .ConfirmarPedidoOnlineAsync(
                pedido.Id,
                session.PaymentIntentId
            );
    }

    // =========================================================
    // CHECKOUT EXPIRADO
    // =========================================================

    public async Task ProcessarCheckoutExpiradoAsync(
        Session session
    )
    {
        var pedido =
            await _context.PedidosOnline
                .Include(p => p.Assentos)
                .FirstOrDefaultAsync(
                    p =>
                        p.StripeCheckoutSessionId ==
                        session.Id
                );

        if (pedido is null)
        {
            return;
        }

        /*
         * IDEMPOTÊNCIA:
         *
         * Um evento repetido não pode alterar novamente
         * um pedido que já foi finalizado.
         */

        if (
            pedido.Status !=
            StatusPedidoOnline.Pendente
        )
        {
            return;
        }


        // =====================================================
        // ASSENTOS DO PEDIDO
        // =====================================================

        var assentoIds =
            pedido.Assentos
                .Select(
                    a => a.AssentoId
                )
                .ToList();


        // =====================================================
        // RESERVAS
        // =====================================================

        var reservas =
            await _context.ReservasAssentos
                .Where(
                    r =>
                        r.UsuarioId ==
                            pedido.UsuarioId &&

                        r.SessaoId ==
                            pedido.SessaoId &&

                        assentoIds.Contains(
                            r.AssentoId
                        )
                )
                .ToListAsync();


        // =====================================================
        // EXPIRAR PEDIDO
        // =====================================================

        pedido.Status =
            StatusPedidoOnline.Expirado;

        if (reservas.Count > 0)
        {
            _context.ReservasAssentos
                .RemoveRange(
                    reservas
                );
        }

        await _context.SaveChangesAsync();
    }
}