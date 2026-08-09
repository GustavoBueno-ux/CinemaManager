using CinemaAPI.Data;
using CinemaAPI.DTOs.Dashboard;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class DashboardService : IDashboardService
{
    /*
     * O domínio atual não possui entidade Sala.
     * Todos os assentos pertencem a uma única sala global.
     */
    private const string NomeSalaPadrao = "Sala 1";

    private readonly AppDbContext _context;

    public DashboardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardResponseDTO> BuscarAsync()
    {
        /*
         * O restante do projeto trabalha com HorarioCinema.Agora para:
         * - criação de sessões;
         * - compra de ingressos;
         * - validação de horários.
         *
         * Portanto, o dashboard segue a mesma convenção local
         * para não misturar UTC com horário local.
         */
        var agora = HorarioCinema.Agora;
        var inicioHoje = agora.Date;
        var inicioAmanha = inicioHoje.AddDays(1);

        var resumoVendasHoje = await _context.Ingressos
            .AsNoTracking()
            .Where(i =>
                i.DataCompra >= inicioHoje &&
                i.DataCompra < inicioAmanha
            )
            .GroupBy(_ => 1)
            .Select(grupo => new
            {
                Quantidade = grupo.Count(),
                Faturamento = grupo.Sum(i => i.ValorPago)
            })
            .FirstOrDefaultAsync();

        var capacidadeSala = await _context.Assentos
            .AsNoTracking()
            .CountAsync();

        var sessoesHojeConsultadas = await _context.Sessoes
            .AsNoTracking()
            .Where(s =>
                s.DataHora >= inicioHoje &&
                s.DataHora < inicioAmanha
            )
            .OrderBy(s => s.DataHora)
            .Select(s => new
            {
                s.Id,
                s.DataHora,

                NomeFilme = s.Filme.Titulo,

                DuracaoMinutos = s.Filme.DuracaoMinutos,

                IngressosVendidos = _context.Ingressos
                    .Count(i => i.SessaoId == s.Id)
            })
            .ToListAsync();

        var proximaSessao = await _context.Sessoes
            .AsNoTracking()
            .Where(s =>
                s.DataHora > agora &&
                s.Ativa
            )
            .OrderBy(s => s.DataHora)
            .Select(s => new ProximaSessaoDashboardDTO
            {
                Id = s.Id,
                DataHora = s.DataHora,
                NomeFilme = s.Filme.Titulo
            })
            .FirstOrDefaultAsync();

        var sessoesHoje = sessoesHojeConsultadas
            .Select(sessao => new SessaoDashboardDTO
            {
                Id = sessao.Id,
                DataHora = sessao.DataHora,
                NomeFilme = sessao.NomeFilme,
                IngressosVendidos = sessao.IngressosVendidos,
                CapacidadeSala = capacidadeSala,

                Status = CalcularStatus(
                    sessao.DataHora,
                    sessao.DuracaoMinutos,
                    agora
                )
            })
            .ToList();

        return new DashboardResponseDTO
        {
            QuantidadeSessoesHoje = sessoesHoje.Count,

            QuantidadeIngressosVendidosHoje =
                resumoVendasHoje?.Quantidade ?? 0,

            FaturamentoHoje =
                resumoVendasHoje?.Faturamento ?? 0m,

            ProximaSessao = proximaSessao,

            SessoesHoje = sessoesHoje
        };
    }

    private static string CalcularStatus(
        DateTime inicioSessao,
        int duracaoMinutos,
        DateTime agora
    )
    {
        if (agora < inicioSessao)
        {
            return "Proxima";
        }

        var fimSessao = inicioSessao.AddMinutes(
            duracaoMinutos
        );

        if (agora < fimSessao)
        {
            return "EmAndamento";
        }

        return "Finalizada";
    }
}