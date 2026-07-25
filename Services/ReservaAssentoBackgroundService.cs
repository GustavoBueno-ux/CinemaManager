using CinemaAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class ReservaAssentoBackgroundService
    : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    private readonly ILogger<ReservaAssentoBackgroundService>
        _logger;

    public ReservaAssentoBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<ReservaAssentoBackgroundService> logger
    )
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken
    )
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope =
                    _scopeFactory.CreateScope();

                var context = scope.ServiceProvider
                    .GetRequiredService<AppDbContext>();

                var agora = DateTime.UtcNow;

                var quantidadeRemovida =
                    await context.ReservasAssentos
                        .Where(r => r.ExpiraEm <= agora)
                        .ExecuteDeleteAsync(stoppingToken);

                if (quantidadeRemovida > 0)
                {
                    _logger.LogInformation(
                        "{Quantidade} reservas vencidas removidas.",
                        quantidadeRemovida
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Erro ao remover reservas vencidas."
                );
            }

            await Task.Delay(
                TimeSpan.FromMinutes(1),
                stoppingToken
            );
        }
    }
}