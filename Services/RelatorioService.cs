using CinemaAPI.Data;
using CinemaAPI.DTOs.Relatorios;
using CinemaAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class RelatorioService : IRelatorioService
{
    private readonly AppDbContext _context;

    public RelatorioService(
        AppDbContext context
    )
    {
        _context = context;
    }


    public async Task<RelatorioResponseDTO> BuscarAsync(
        DateTime inicio,
        DateTime fim
    )
    {
        var inicioPeriodo =
            inicio.Date;

        var fimInclusivo =
            fim.Date;

        if (inicioPeriodo > fimInclusivo)
        {
            throw new ArgumentException(
                "A data inicial não pode ser maior que a data final."
            );
        }

        /*
         * O filtro usa limite superior exclusivo.
         *
         * Exemplo:
         *
         * inicio = 01/08/2026
         * fim    = 09/08/2026
         *
         * Consulta:
         *
         * >= 01/08/2026 00:00
         * <  10/08/2026 00:00
         *
         * Assim todo o dia 09 é incluído.
         */
        var fimPeriodoExclusivo =
            fimInclusivo.AddDays(1);


        /*
         * CONSULTA BASE DE VENDAS
         *
         * Venda.DataHora é a referência oficial
         * de período financeiro.
         */
        var vendasPeriodo =
            _context.Vendas
                .AsNoTracking()
                .Where(v =>
                    v.DataHora >= inicioPeriodo &&
                    v.DataHora < fimPeriodoExclusivo
                );


        /*
         * CONSULTA BASE DE INGRESSOS
         *
         * Somente ingressos associados a uma Venda
         * entram no relatório financeiro.
         */
        var ingressosPeriodo =
            _context.Ingressos
                .AsNoTracking()
                .Where(i =>
                    i.VendaId.HasValue &&
                    i.Venda!.DataHora >= inicioPeriodo &&
                    i.Venda.DataHora < fimPeriodoExclusivo
                );


        // =====================================================
        // RESUMO PRINCIPAL
        // =====================================================

        var faturamento =
            await vendasPeriodo
                .Select(v =>
                    (decimal?)v.ValorTotal
                )
                .SumAsync()
            ?? 0m;


        var vendasRealizadas =
            await vendasPeriodo
                .CountAsync();


        var ingressosVendidos =
            await ingressosPeriodo
                .CountAsync();


        var ingressosUtilizados =
            await ingressosPeriodo
                .CountAsync(i =>
                    i.Utilizado
                );


        var ingressosCortesia =
            await ingressosPeriodo
                .CountAsync(i =>
                    i.Venda!.FormaPagamento ==
                    FormaPagamento.Cortesia
                );


        var taxaComparecimento =
            ingressosVendidos == 0
                ? 0m
                : Math.Round(
                    (decimal)ingressosUtilizados /
                    ingressosVendidos *
                    100m,
                    2
                );


        // =====================================================
        // EVOLUÇÃO DIÁRIA — FATURAMENTO
        // =====================================================

        var faturamentoPorDia =
            await vendasPeriodo
                .GroupBy(v =>
                    v.DataHora.Date
                )
                .Select(g => new
                {
                    Data = g.Key,

                    Faturamento =
                        g.Sum(v =>
                            v.ValorTotal
                        )
                })
                .ToListAsync();


        // =====================================================
        // EVOLUÇÃO DIÁRIA — INGRESSOS
        // =====================================================

        var ingressosPorDia =
            await ingressosPeriodo
                .GroupBy(i =>
                    i.Venda!.DataHora.Date
                )
                .Select(g => new
                {
                    Data = g.Key,

                    IngressosVendidos =
                        g.Count()
                })
                .ToListAsync();


        /*
         * Transformamos as duas consultas agregadas
         * em dicionários.
         *
         * Isso permite preencher também os dias
         * sem nenhuma venda.
         */
        var faturamentoPorDiaMap =
            faturamentoPorDia.ToDictionary(
                item => item.Data.Date,
                item => item.Faturamento
            );


        var ingressosPorDiaMap =
            ingressosPorDia.ToDictionary(
                item => item.Data.Date,
                item => item.IngressosVendidos
            );


        var evolucao =
            new List<EvolucaoVendasDTO>();


        for (
            var data = inicioPeriodo;
            data <= fimInclusivo;
            data = data.AddDays(1)
        )
        {
            evolucao.Add(
                new EvolucaoVendasDTO
                {
                    Data =
                        DateOnly.FromDateTime(
                            data
                        ),

                    Faturamento =
                        faturamentoPorDiaMap
                            .GetValueOrDefault(
                                data,
                                0m
                            ),

                    IngressosVendidos =
                        ingressosPorDiaMap
                            .GetValueOrDefault(
                                data,
                                0
                            )
                }
            );
        }


        // =====================================================
        // DESEMPENHO POR FILME
        // =====================================================

        var filmesAgregados =
            await ingressosPeriodo
                .GroupBy(i => new
                {
                    FilmeId =
                        i.Sessao.FilmeId,

                    Titulo =
                        i.Sessao.Filme.Titulo
                })
                .Select(g => new
                {
                    g.Key.FilmeId,
                    g.Key.Titulo,

                    IngressosVendidos =
                        g.Count(),

                    Faturamento =
                        g.Sum(i =>
                            i.ValorPago
                        )
                })
                .OrderByDescending(f =>
                    f.IngressosVendidos
                )
                .ThenByDescending(f =>
                    f.Faturamento
                )
                .ToListAsync();


        var filmes =
            filmesAgregados
                .Select(f =>
                    new DesempenhoFilmeDTO
                    {
                        FilmeId =
                            f.FilmeId,

                        Titulo =
                            f.Titulo,

                        IngressosVendidos =
                            f.IngressosVendidos,

                        Faturamento =
                            f.Faturamento,

                        PercentualIngressos =
                            CalcularPercentual(
                                f.IngressosVendidos,
                                ingressosVendidos
                            )
                    }
                )
                .ToList();


        // =====================================================
        // FILME MAIS VENDIDO
        // =====================================================

        FilmeMaisVendidoDTO?
            filmeMaisVendido = null;


        var primeiroFilme =
            filmes.FirstOrDefault();


        if (primeiroFilme is not null)
        {
            filmeMaisVendido =
                new FilmeMaisVendidoDTO
                {
                    FilmeId =
                        primeiroFilme.FilmeId,

                    Titulo =
                        primeiroFilme.Titulo,

                    IngressosVendidos =
                        primeiroFilme
                            .IngressosVendidos
                };
        }


        // =====================================================
        // FILME COM MAIOR FATURAMENTO
        // =====================================================

        FilmeMaiorFaturamentoDTO?
            filmeMaiorFaturamento = null;


        var maiorFaturamentoFilme =
            filmes
                .OrderByDescending(f =>
                    f.Faturamento
                )
                .ThenByDescending(f =>
                    f.IngressosVendidos
                )
                .FirstOrDefault();


        if (maiorFaturamentoFilme is not null)
        {
            filmeMaiorFaturamento =
                new FilmeMaiorFaturamentoDTO
                {
                    FilmeId =
                        maiorFaturamentoFilme.FilmeId,

                    Titulo =
                        maiorFaturamentoFilme.Titulo,

                    Faturamento =
                        maiorFaturamentoFilme
                            .Faturamento
                };
        }


        // =====================================================
        // SESSÃO MAIS VENDIDA
        // =====================================================

        var sessaoMaisVendidaAgregada =
            await ingressosPeriodo
                .GroupBy(i => new
                {
                    SessaoId =
                        i.SessaoId,

                    FilmeId =
                        i.Sessao.FilmeId,

                    Filme =
                        i.Sessao.Filme.Titulo,

                    DataHora =
                        i.Sessao.DataHora
                })
                .Select(g => new
                {
                    g.Key.SessaoId,
                    g.Key.FilmeId,
                    g.Key.Filme,
                    g.Key.DataHora,

                    IngressosVendidos =
                        g.Count()
                })
                .OrderByDescending(s =>
                    s.IngressosVendidos
                )
                .ThenBy(s =>
                    s.DataHora
                )
                .FirstOrDefaultAsync();


        SessaoMaisVendidaDTO?
            sessaoMaisVendida = null;


        if (sessaoMaisVendidaAgregada is not null)
        {
            sessaoMaisVendida =
                new SessaoMaisVendidaDTO
                {
                    SessaoId =
                        sessaoMaisVendidaAgregada
                            .SessaoId,

                    FilmeId =
                        sessaoMaisVendidaAgregada
                            .FilmeId,

                    Filme =
                        sessaoMaisVendidaAgregada
                            .Filme,

                    DataHora =
                        sessaoMaisVendidaAgregada
                            .DataHora,

                    IngressosVendidos =
                        sessaoMaisVendidaAgregada
                            .IngressosVendidos
                };
        }


        // =====================================================
        // ORIGEM DAS VENDAS
        // =====================================================

        /*
         * Uma consulta calcula quantidade de vendas
         * e faturamento por origem.
         */
        var vendasPorOrigem =
            await vendasPeriodo
                .GroupBy(v =>
                    v.OrigemVenda
                )
                .Select(g => new
                {
                    Origem =
                        g.Key,

                    Vendas =
                        g.Count(),

                    Faturamento =
                        g.Sum(v =>
                            v.ValorTotal
                        )
                })
                .ToListAsync();


        /*
         * Outra consulta calcula ingressos por origem.
         *
         * Fazemos separado para manter as consultas
         * simples e fáceis de traduzir pelo EF Core.
         */
        var ingressosPorOrigem =
            await ingressosPeriodo
                .GroupBy(i =>
                    i.Venda!.OrigemVenda
                )
                .Select(g => new
                {
                    Origem =
                        g.Key,

                    Ingressos =
                        g.Count()
                })
                .ToListAsync();


        var ingressosPorOrigemMap =
            ingressosPorOrigem
                .ToDictionary(
                    item => item.Origem,
                    item => item.Ingressos
                );


        var origens =
            vendasPorOrigem
                .Select(item =>
                {
                    var quantidadeIngressos =
                        ingressosPorOrigemMap
                            .GetValueOrDefault(
                                item.Origem,
                                0
                            );

                    return new OrigemVendaRelatorioDTO
                    {
                        Origem =
                            item.Origem.ToString(),

                        Vendas =
                            item.Vendas,

                        Ingressos =
                            quantidadeIngressos,

                        Faturamento =
                            item.Faturamento,

                        PercentualIngressos =
                            CalcularPercentual(
                                quantidadeIngressos,
                                ingressosVendidos
                            )
                    };
                })
                .OrderByDescending(item =>
                    item.Ingressos
                )
                .ToList();


        // =====================================================
        // FORMAS DE PAGAMENTO
        // =====================================================

        /*
         * Vendas online atualmente possuem:
         *
         * FormaPagamento = null
         *
         * Portanto elas não entram nessa seção.
         */
        var vendasComFormaPagamento =
            vendasPeriodo
                .Where(v =>
                    v.FormaPagamento.HasValue
                );


        var ingressosComFormaPagamento =
            ingressosPeriodo
                .Where(i =>
                    i.Venda!.FormaPagamento
                        .HasValue
                );


        /*
         * O denominador percentual desta seção NÃO
         * é todos os ingressos.
         *
         * É somente o número de ingressos ligados
         * a vendas que possuem forma de pagamento.
         */
        var totalIngressosComFormaPagamento =
            await ingressosComFormaPagamento
                .CountAsync();


        var vendasPorFormaPagamento =
            await vendasComFormaPagamento
                .GroupBy(v =>
                    v.FormaPagamento!.Value
                )
                .Select(g => new
                {
                    FormaPagamento =
                        g.Key,

                    Vendas =
                        g.Count(),

                    Faturamento =
                        g.Sum(v =>
                            v.ValorTotal
                        )
                })
                .ToListAsync();


        var ingressosPorFormaPagamento =
            await ingressosComFormaPagamento
                .GroupBy(i =>
                    i.Venda!.FormaPagamento!.Value
                )
                .Select(g => new
                {
                    FormaPagamento =
                        g.Key,

                    Ingressos =
                        g.Count()
                })
                .ToListAsync();


        var ingressosPorFormaPagamentoMap =
            ingressosPorFormaPagamento
                .ToDictionary(
                    item =>
                        item.FormaPagamento,

                    item =>
                        item.Ingressos
                );


        var formasPagamento =
            vendasPorFormaPagamento
                .Select(item =>
                {
                    var quantidadeIngressos =
                        ingressosPorFormaPagamentoMap
                            .GetValueOrDefault(
                                item.FormaPagamento,
                                0
                            );

                    return new FormaPagamentoRelatorioDTO
                    {
                        FormaPagamento =
                            item.FormaPagamento
                                .ToString(),

                        Vendas =
                            item.Vendas,

                        Ingressos =
                            quantidadeIngressos,

                        Faturamento =
                            item.Faturamento,

                        PercentualIngressos =
                            CalcularPercentual(
                                quantidadeIngressos,
                                totalIngressosComFormaPagamento
                            )
                    };
                })
                .OrderByDescending(item =>
                    item.Ingressos
                )
                .ToList();


        // =====================================================
        // RESULTADO FINAL
        // =====================================================

        return new RelatorioResponseDTO
        {
            Inicio =
                inicioPeriodo,

            /*
             * Para resposta deixamos o final do dia
             * selecionado pelo usuário.
             *
             * A consulta internamente continua usando
             * o limite exclusivo do dia seguinte.
             */
            Fim =
                fimPeriodoExclusivo
                    .AddTicks(-1),

            Faturamento =
                faturamento,

            VendasRealizadas =
                vendasRealizadas,

            IngressosVendidos =
                ingressosVendidos,

            IngressosUtilizados =
                ingressosUtilizados,

            TaxaComparecimento =
                taxaComparecimento,

            IngressosCortesia =
                ingressosCortesia,

            Evolucao =
                evolucao,

            Filmes =
                filmes,

            FilmeMaisVendido =
                filmeMaisVendido,

            FilmeMaiorFaturamento =
                filmeMaiorFaturamento,

            SessaoMaisVendida =
                sessaoMaisVendida,

            Origens =
                origens,

            FormasPagamento =
                formasPagamento
        };
    }


    private static decimal CalcularPercentual(
        int quantidade,
        int total
    )
    {
        if (total == 0)
        {
            return 0m;
        }

        return Math.Round(
            (decimal)quantidade /
            total *
            100m,
            2
        );
    }
}