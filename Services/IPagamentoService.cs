using CinemaAPI.DTOs.Pagamentos;
using Stripe.Checkout;

namespace CinemaAPI.Services;

public interface IPagamentoService
{
    Task<CheckoutResponseDTO> CriarCheckoutAsync(
        int usuarioId,
        CriarCheckoutDTO dto
    );

    Task ProcessarCheckoutConcluidoAsync(
        Session session
    );

    Task ProcessarCheckoutExpiradoAsync(
        Session session
    );
}