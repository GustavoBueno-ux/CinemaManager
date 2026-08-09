using System.Security.Cryptography;
using CinemaAPI.Data;
using CinemaAPI.DTOs.Ingressos;
using CinemaAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class IngressoService : IIngressoService
{
    private const string CaracteresCodigoRecuperacao =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private const int TamanhoCodigoRecuperacao = 8;

    private readonly AppDbContext _context;

    public IngressoService(AppDbContext context)
    {
        _context = context;
    }


    public async Task<IngressoResponseDTO> CriarAsync(
        CriarIngressoDTO dto
    )
    {
        var sessao = await BuscarSessaoDisponivelAsync(
            dto.SessaoId
        );

        var usuario = await _context.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.Id == dto.UsuarioId
            );

        if (usuario is null)
        {
            throw new KeyNotFoundException(
                "Usuário não encontrado."
            );
        }

        var assento = await _context.Assentos
            .AsNoTracking()
            .FirstOrDefaultAsync(
                a => a.Id == dto.AssentoId
            );

        if (assento is null)
        {
            throw new KeyNotFoundException(
                "Assento não encontrado."
            );
        }

        var assentoOcupado = await _context.Ingressos
            .AsNoTracking()
            .AnyAsync(i =>
                i.SessaoId == dto.SessaoId &&
                i.AssentoId == dto.AssentoId
            );

        if (assentoOcupado)
        {
            throw new InvalidOperationException(
                "Assento indisponível."
            );
        }

        var agora = HorarioCinema.Agora;

        var venda = new Venda
        {
            DataHora = agora,
            FormaPagamento = null,
            OrigemVenda = OrigemVenda.Online,
            FuncionarioId = null,
            ValorTotal = sessao.PrecoIngresso
        };

        var ingresso = await CriarIngressoAsync(
            sessaoId: dto.SessaoId,
            assentoId: dto.AssentoId,
            usuarioId: dto.UsuarioId,
            valorPago: sessao.PrecoIngresso,
            dataCompra: agora,
            venda: venda
        );

        await _context.Vendas.AddAsync(venda);
        await _context.Ingressos.AddAsync(ingresso);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _context.ChangeTracker.Clear();

            throw new InvalidOperationException(
                "Não foi possível concluir a compra."
            );
        }

        ingresso.Sessao = sessao;
        ingresso.Assento = assento;
        ingresso.Usuario = usuario;

        return ConverterParaDTO(ingresso);
    }


    public async Task<List<IngressoResponseDTO>> CriarEmLoteAsync(
        int usuarioId,
        CriarIngressosEmLoteDTO dto
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

        var assentoIds = dto.AssentoIds
            .Distinct()
            .ToList();

        if (assentoIds.Count != dto.AssentoIds.Count)
        {
            throw new ArgumentException(
                "Existem assentos repetidos na seleção."
            );
        }

        var agora = HorarioCinema.Agora;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var sessao = await _context.Sessoes
                .AsNoTracking()
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
                    "Sessão desativada."
                );
            }

            if (agora > sessao.DataHora.AddMinutes(30))
            {
                throw new InvalidOperationException(
                    "O prazo para compra desta sessão foi encerrado."
                );
            }

            var usuario = await _context.Usuarios
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.Id == usuarioId
                );

            if (usuario is null)
            {
                throw new KeyNotFoundException(
                    "Usuário não encontrado."
                );
            }

            var assentos = await _context.Assentos
                .AsNoTracking()
                .Where(a =>
                    assentoIds.Contains(a.Id)
                )
                .ToListAsync();

            if (assentos.Count != assentoIds.Count)
            {
                throw new KeyNotFoundException(
                    "Um ou mais assentos não foram encontrados."
                );
            }

            var reservasValidas =
                await _context.ReservasAssentos
                    .Where(r =>
                        r.SessaoId == dto.SessaoId &&
                        r.UsuarioId == usuarioId &&
                        assentoIds.Contains(r.AssentoId) &&
                        r.ExpiraEm > agora
                    )
                    .ToListAsync();

            if (
                reservasValidas.Count !=
                assentoIds.Count
            )
            {
                throw new InvalidOperationException(
                    "Uma ou mais reservas expiraram ou não pertencem " +
                    "ao usuário. A compra não foi realizada."
                );
            }

            var assentosJaComprados =
                await _context.Ingressos
                    .AsNoTracking()
                    .AnyAsync(i =>
                        i.SessaoId == dto.SessaoId &&
                        assentoIds.Contains(i.AssentoId)
                    );

            if (assentosJaComprados)
            {
                throw new InvalidOperationException(
                    "Um ou mais assentos já foram comprados. " +
                    "A compra não foi realizada."
                );
            }

            var valorUnitario =
                sessao.PrecoIngresso;

            var valorTotal =
                valorUnitario * assentoIds.Count;

            var venda = new Venda
            {
                DataHora = agora,
                FormaPagamento = null,
                OrigemVenda = OrigemVenda.Online,
                FuncionarioId = null,
                ValorTotal = valorTotal
            };

            var ingressos =
                new List<Ingresso>();

            var codigosGerados =
                new HashSet<string>();

            foreach (var assentoId in assentoIds)
            {
                var ingresso =
                    await CriarIngressoAsync(
                        sessaoId: dto.SessaoId,
                        assentoId: assentoId,
                        usuarioId: usuarioId,
                        valorPago: valorUnitario,
                        dataCompra: agora,
                        venda: venda,
                        codigosGerados: codigosGerados
                    );

                ingressos.Add(ingresso);
            }

            await _context.Vendas.AddAsync(venda);

            await _context.Ingressos
                .AddRangeAsync(ingressos);

            _context.ReservasAssentos.RemoveRange(
                reservasValidas
            );

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new InvalidOperationException(
                    "Não foi possível concluir a compra. " +
                    "Nenhum ingresso foi gerado."
                );
            }

            await transaction.CommitAsync();

            var assentosPorId =
                assentos.ToDictionary(
                    a => a.Id
                );

            foreach (var ingresso in ingressos)
            {
                ingresso.Sessao = sessao;
                ingresso.Usuario = usuario;

                ingresso.Assento =
                    assentosPorId[
                        ingresso.AssentoId
                    ];
            }

            return ingressos
                .OrderBy(i => i.Assento.Codigo)
                .Select(ConverterParaDTO)
                .ToList();
        }
        catch
        {
            await transaction.RollbackAsync();

            _context.ChangeTracker.Clear();

            throw;
        }
    }


    public async Task<VendaBilheteriaResponseDTO>
        CriarVendaBilheteriaAsync(
            int funcionarioId,
            CriarVendaBilheteriaDTO dto
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

        var assentoIds = dto.AssentoIds
            .Distinct()
            .ToList();

        if (assentoIds.Count != dto.AssentoIds.Count)
        {
            throw new ArgumentException(
                "Existem assentos repetidos na seleção."
            );
        }

        if (
            !Enum.IsDefined(
                typeof(FormaPagamento),
                dto.FormaPagamento
            )
        )
        {
            throw new ArgumentException(
                "Forma de pagamento inválida."
            );
        }

        var agora = HorarioCinema.Agora;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var funcionario = await _context.Usuarios
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.Id == funcionarioId
                );

            if (funcionario is null)
            {
                throw new KeyNotFoundException(
                    "Funcionário não encontrado."
                );
            }

            if (
                funcionario.TipoUsuario !=
                TipoUsuario.Funcionario
            )
            {
                throw new InvalidOperationException(
                    "O usuário autenticado não é um funcionário."
                );
            }

            var sessao = await _context.Sessoes
                .AsNoTracking()
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
                    "Sessão desativada."
                );
            }

            if (agora > sessao.DataHora.AddMinutes(30))
            {
                throw new InvalidOperationException(
                    "O prazo para venda desta sessão foi encerrado."
                );
            }

            var assentos = await _context.Assentos
                .AsNoTracking()
                .Where(a =>
                    assentoIds.Contains(a.Id)
                )
                .ToListAsync();

            if (assentos.Count != assentoIds.Count)
            {
                throw new KeyNotFoundException(
                    "Um ou mais assentos não foram encontrados."
                );
            }

            var reservasValidas =
                await _context.ReservasAssentos
                    .Where(r =>
                        r.SessaoId == dto.SessaoId &&
                        r.UsuarioId == funcionarioId &&
                        assentoIds.Contains(r.AssentoId) &&
                        r.ExpiraEm > agora
                    )
                    .ToListAsync();

            if (
                reservasValidas.Count !=
                assentoIds.Count
            )
            {
                throw new InvalidOperationException(
                    "Uma ou mais reservas expiraram ou não pertencem " +
                    "ao funcionário. A venda não foi realizada."
                );
            }

            var assentosJaVendidos =
                await _context.Ingressos
                    .AsNoTracking()
                    .AnyAsync(i =>
                        i.SessaoId == dto.SessaoId &&
                        assentoIds.Contains(i.AssentoId)
                    );

            if (assentosJaVendidos)
            {
                throw new InvalidOperationException(
                    "Um ou mais assentos já foram vendidos. " +
                    "A venda não foi realizada."
                );
            }

            var cortesia =
                dto.FormaPagamento ==
                FormaPagamento.Cortesia;

            var valorUnitario =
                cortesia
                    ? 0m
                    : sessao.PrecoIngresso;

            var valorTotal =
                valorUnitario * assentoIds.Count;

            var venda = new Venda
            {
                DataHora = agora,

                FormaPagamento =
                    dto.FormaPagamento,

                OrigemVenda =
                    OrigemVenda.Bilheteria,

                FuncionarioId =
                    funcionarioId,

                ValorTotal =
                    valorTotal
            };

            var ingressos =
                new List<Ingresso>();

            var codigosGerados =
                new HashSet<string>();

            foreach (var assentoId in assentoIds)
            {
                var ingresso =
                    await CriarIngressoAsync(
                        sessaoId: dto.SessaoId,
                        assentoId: assentoId,
                        usuarioId: null,
                        valorPago: valorUnitario,
                        dataCompra: agora,
                        venda: venda,
                        codigosGerados: codigosGerados
                    );

                ingressos.Add(ingresso);
            }

            await _context.Vendas.AddAsync(venda);

            await _context.Ingressos
                .AddRangeAsync(ingressos);

            _context.ReservasAssentos.RemoveRange(
                reservasValidas
            );

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new InvalidOperationException(
                    "Não foi possível concluir a venda. " +
                    "Nenhum ingresso foi gerado."
                );
            }

            await transaction.CommitAsync();

            var assentosPorId =
                assentos.ToDictionary(
                    a => a.Id
                );

            foreach (var ingresso in ingressos)
            {
                ingresso.Sessao = sessao;

                ingresso.Assento =
                    assentosPorId[
                        ingresso.AssentoId
                    ];

                ingresso.Usuario = null;
            }

            var ingressosDto = ingressos
                .OrderBy(i => i.Assento.Codigo)
                .Select(ConverterParaDTO)
                .ToList();

            return new VendaBilheteriaResponseDTO
            {
                VendaId = venda.Id,

                FormaPagamento =
                    dto.FormaPagamento,

                ValorTotal =
                    valorTotal,

                Ingressos =
                    ingressosDto
            };
        }
        catch
        {
            await transaction.RollbackAsync();

            _context.ChangeTracker.Clear();

            throw;
        }
    }


    public async Task<List<IngressoResponseDTO>>
        ListarTodosAsync()
    {
        var ingressos = await _context.Ingressos
            .AsNoTracking()
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .OrderByDescending(i => i.DataCompra)
            .ToListAsync();

        return ingressos
            .Select(ConverterParaDTO)
            .ToList();
    }


    public async Task<List<IngressoResponseDTO>>
        ListarDoUsuarioAsync(
            int usuarioId
        )
    {
        var ingressos = await _context.Ingressos
            .AsNoTracking()
            .Where(i =>
                i.UsuarioId == usuarioId
            )
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .OrderByDescending(i => i.DataCompra)
            .ToListAsync();

        return ingressos
            .Select(ConverterParaDTO)
            .ToList();
    }


    public async Task<IngressoResponseDTO?>
        BuscarPorIdAsync(
            int ingressoId,
            int usuarioId
        )
    {
        var ingresso = await _context.Ingressos
            .AsNoTracking()
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .FirstOrDefaultAsync(i =>
                i.Id == ingressoId &&
                i.UsuarioId == usuarioId
            );

        return ingresso is null
            ? null
            : ConverterParaDTO(ingresso);
    }


    public async Task<IngressoRecuperacaoDTO?>
        BuscarPorCodigoRecuperacaoAsync(
            string codigo
        )
    {
        if (string.IsNullOrWhiteSpace(codigo))
        {
            return null;
        }

        var codigoNormalizado =
            codigo
                .Trim()
                .ToUpperInvariant();

        var dataLimite =
            HorarioCinema.Agora.AddDays(-7);

        return await _context.Ingressos
            .AsNoTracking()
            .Where(i =>
                i.CodigoRecuperacao ==
                    codigoNormalizado &&

                i.Venda != null &&

                i.Venda.OrigemVenda ==
                    OrigemVenda.Bilheteria &&

                i.DataCompra >=
                    dataLimite
            )
            .Select(i =>
                new IngressoRecuperacaoDTO
                {
                    Id = i.Id,

                    CodigoRecuperacao =
                        i.CodigoRecuperacao,

                    Filme =
                        i.Sessao.Filme.Titulo,

                    DataSessao =
                        i.Sessao.DataHora,

                    CodigoAssento =
                        i.Assento.Codigo,

                    DataCompra =
                        i.DataCompra,

                    FormaPagamento =
                        i.Venda!.FormaPagamento
                            .HasValue
                                ? i.Venda.FormaPagamento
                                    .Value
                                    .ToString()
                                : string.Empty,

                    ValorPago =
                        i.ValorPago,

                    Utilizado =
                        i.Utilizado,

                    DataUtilizacao =
                        i.DataUtilizacao,

                    TokenQrCode =
                        i.TokenQrCode
                }
            )
            .FirstOrDefaultAsync();
    }


    public async Task<ValidacaoIngressoResponseDTO>
        ValidarAsync(
            ValidarIngressoDTO dto
        )
    {
        var sessaoExiste = await _context.Sessoes
            .AsNoTracking()
            .AnyAsync(s =>
                s.Id == dto.SessaoId
            );

        if (!sessaoExiste)
        {
            return CriarResultadoValidacao(
                false,
                "SESSAO_NAO_ENCONTRADA",
                "Sessão não encontrada."
            );
        }

        if (string.IsNullOrWhiteSpace(dto.TokenQrCode))
        {
            return CriarResultadoValidacao(
                false,
                "INGRESSO_NAO_ENCONTRADO",
                "Ingresso não encontrado."
            );
        }

        var ingresso = await _context.Ingressos
            .Include(i => i.Sessao)
            .FirstOrDefaultAsync(i =>
                i.TokenQrCode == dto.TokenQrCode
            );

        if (ingresso is null)
        {
            return CriarResultadoValidacao(
                false,
                "INGRESSO_NAO_ENCONTRADO",
                "Ingresso não encontrado."
            );
        }

        if (ingresso.SessaoId != dto.SessaoId)
        {
            return CriarResultadoValidacao(
                false,
                "INGRESSO_OUTRA_SESSAO",
                "Este ingresso pertence a outra sessão."
            );
        }

        if (!ingresso.Sessao.Ativa)
        {
            return CriarResultadoValidacao(
                false,
                "SESSAO_ENCERRADA",
                "A sessão já foi encerrada."
            );
        }

        if (ingresso.Utilizado)
        {
            return CriarResultadoValidacao(
                false,
                "INGRESSO_JA_UTILIZADO",
                "Este ingresso já foi utilizado."
            );
        }

        var agora = HorarioCinema.Agora;

        var inicioLiberacao =
            ingresso.Sessao.DataHora
                .AddMinutes(-30);

        if (agora < inicioLiberacao)
        {
            return CriarResultadoValidacao(
                false,
                "SESSAO_NAO_LIBERADA",
                "A sessão ainda não está liberada para entrada."
            );
        }

        ingresso.Utilizado = true;
        ingresso.DataUtilizacao = agora;

        await _context.SaveChangesAsync();

        return CriarResultadoValidacao(
            true,
            "VALIDADO",
            "Entrada liberada."
        );
    }


    public async Task<bool> ExcluirAsync(
        int id
    )
    {
        var ingresso = await _context.Ingressos
            .FirstOrDefaultAsync(
                i => i.Id == id
            );

        if (ingresso is null)
        {
            return false;
        }

        _context.Ingressos.Remove(ingresso);

        await _context.SaveChangesAsync();

        return true;
    }


    private async Task<Sessao>
        BuscarSessaoDisponivelAsync(
            int sessaoId
        )
    {
        var sessao = await _context.Sessoes
            .AsNoTracking()
            .Include(s => s.Filme)
            .FirstOrDefaultAsync(
                s => s.Id == sessaoId
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
                "Sessão desativada."
            );
        }

        var limiteCompra =
            sessao.DataHora.AddMinutes(30);

        if (HorarioCinema.Agora > limiteCompra)
        {
            throw new InvalidOperationException(
                "O prazo para compra desta sessão foi encerrado."
            );
        }

        return sessao;
    }


    private async Task<Ingresso> CriarIngressoAsync(
        int sessaoId,
        int assentoId,
        int? usuarioId,
        decimal valorPago,
        DateTime dataCompra,
        Venda venda,
        HashSet<string>? codigosGerados = null
    )
    {
        var codigoRecuperacao =
            await GerarCodigoRecuperacaoUnicoAsync(
                codigosGerados
            );

        return new Ingresso
        {
            Venda = venda,

            SessaoId = sessaoId,

            AssentoId = assentoId,

            UsuarioId = usuarioId,

            ValorPago = valorPago,

            TokenQrCode =
                Guid.NewGuid().ToString("N"),

            CodigoRecuperacao =
                codigoRecuperacao,

            DataCompra = dataCompra,

            Utilizado = false,

            DataUtilizacao = null
        };
    }


    private async Task<string>
        GerarCodigoRecuperacaoUnicoAsync(
            HashSet<string>? codigosGerados = null
        )
    {
        while (true)
        {
            var codigo =
                GerarCodigoRecuperacao();

            if (
                codigosGerados != null &&
                codigosGerados.Contains(codigo)
            )
            {
                continue;
            }

            var existeNoBanco =
                await _context.Ingressos
                    .AsNoTracking()
                    .AnyAsync(i =>
                        i.CodigoRecuperacao ==
                        codigo
                    );

            if (existeNoBanco)
            {
                continue;
            }

            codigosGerados?.Add(codigo);

            return codigo;
        }
    }


    private static string GerarCodigoRecuperacao()
    {
        Span<char> codigo =
            stackalloc char[
                TamanhoCodigoRecuperacao
            ];

        for (
            var i = 0;
            i < TamanhoCodigoRecuperacao;
            i++
        )
        {
            var indice =
                RandomNumberGenerator.GetInt32(
                    CaracteresCodigoRecuperacao.Length
                );

            codigo[i] =
                CaracteresCodigoRecuperacao[indice];
        }

        return new string(codigo);
    }


    private static ValidacaoIngressoResponseDTO
        CriarResultadoValidacao(
            bool sucesso,
            string codigo,
            string mensagem
        )
    {
        return new ValidacaoIngressoResponseDTO
        {
            Sucesso = sucesso,
            Codigo = codigo,
            Mensagem = mensagem
        };
    }


    private static IngressoResponseDTO
        ConverterParaDTO(
            Ingresso ingresso
        )
    {
        return new IngressoResponseDTO
        {
            Id = ingresso.Id,

            SessaoId = ingresso.SessaoId,

            Filme =
                ingresso.Sessao.Filme.Titulo,

            DataSessao =
                ingresso.Sessao.DataHora,

            AssentoId =
                ingresso.AssentoId,

            CodigoAssento =
                ingresso.Assento.Codigo,

            UsuarioId =
                ingresso.UsuarioId,

            Usuario =
                ingresso.Usuario?.Nome,

            ValorPago =
                ingresso.ValorPago,

            TokenQrCode =
                ingresso.TokenQrCode,

            CodigoRecuperacao =
                ingresso.CodigoRecuperacao,

            DataCompra =
                ingresso.DataCompra,

            Utilizado =
                ingresso.Utilizado,

            DataUtilizacao =
                ingresso.DataUtilizacao
        };
    }
}