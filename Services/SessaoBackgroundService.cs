using CinemaAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class SessaoBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public SessaoBackgroundService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            using var scope = _scopeFactory.CreateScope();

            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var agora = DateTime.Now;

            var sessoes = await context.Sessoes
                .Where(s =>
                    s.Ativa &&
                    s.DataHora.AddMinutes(30) <= agora)
                .ToListAsync(stoppingToken);

            foreach (var sessao in sessoes)
            {
                sessao.Ativa = false;
            }

            await context.SaveChangesAsync(stoppingToken);

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}