using CinemaAPI.Data;
using CinemaAPI.DTOs.Ingressos;
using CinemaAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class IngressoService : IIngressoService
{
    private const decimal ValorIngresso = 22m;

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
            .FirstOrDefaultAsync(u => u.Id == dto.UsuarioId);

        if (usuario is null)
        {
            throw new KeyNotFoundException(
                "Usuário não encontrado."
            );
        }

        var assento = await _context.Assentos
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == dto.AssentoId);

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

        var ingresso = CriarIngresso(
            sessaoId: dto.SessaoId,
            assentoId: dto.AssentoId,
            usuarioId: dto.UsuarioId,
            dataCompra: DateTime.Now
        );

        await _context.Ingressos.AddAsync(ingresso);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _context.ChangeTracker.Clear();

            throw new InvalidOperationException(
                "O assento acabou de ser comprado por outro usuário."
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
        if (dto.AssentoIds is null || dto.AssentoIds.Count == 0)
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

        var agora = DateTime.Now;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var sessao = await _context.Sessoes
                .AsNoTracking()
                .Include(s => s.Filme)
                .FirstOrDefaultAsync(s => s.Id == dto.SessaoId);

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
                .FirstOrDefaultAsync(u => u.Id == usuarioId);

            if (usuario is null)
            {
                throw new KeyNotFoundException(
                    "Usuário não encontrado."
                );
            }

            var assentos = await _context.Assentos
                .AsNoTracking()
                .Where(a => assentoIds.Contains(a.Id))
                .ToListAsync();

            if (assentos.Count != assentoIds.Count)
            {
                throw new KeyNotFoundException(
                    "Um ou mais assentos não foram encontrados."
                );
            }

            /*
             * Busca somente reservas:
             * - da sessão informada;
             * - dos assentos escolhidos;
             * - pertencentes ao usuário;
             * - ainda não vencidas.
             */
            var reservasValidas = await _context.ReservasAssentos
                .Where(r =>
                    r.SessaoId == dto.SessaoId &&
                    r.UsuarioId == usuarioId &&
                    assentoIds.Contains(r.AssentoId) &&
                    r.ExpiraEm > agora
                )
                .ToListAsync();

            if (reservasValidas.Count != assentoIds.Count)
            {
                throw new InvalidOperationException(
                    "Uma ou mais reservas expiraram ou não pertencem " +
                    "ao usuário. A compra não foi realizada."
                );
            }

            var assentosJaComprados = await _context.Ingressos
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

            var ingressos = assentoIds
                .Select(assentoId => new Ingresso
                {
                    SessaoId = dto.SessaoId,
                    AssentoId = assentoId,
                    UsuarioId = usuarioId,
                    ValorPago = 22m,
                    TokenQrCode = Guid.NewGuid().ToString("N"),
                    DataCompra = agora,
                    Utilizado = false,
                    DataUtilizacao = null
                })
                .ToList();

            await _context.Ingressos.AddRangeAsync(ingressos);

            /*
             * As reservas serão removidas na mesma transação
             * em que os ingressos serão criados.
             */
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
                    "Um ou mais assentos acabaram de ser comprados " +
                    "por outro usuário. Nenhum ingresso foi gerado."
                );
            }

            await transaction.CommitAsync();

            var assentosPorId = assentos.ToDictionary(
                a => a.Id
            );

            foreach (var ingresso in ingressos)
            {
                ingresso.Sessao = sessao;
                ingresso.Usuario = usuario;
                ingresso.Assento =
                    assentosPorId[ingresso.AssentoId];
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

    public async Task<List<IngressoResponseDTO>> ListarTodosAsync()
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

    public async Task<List<IngressoResponseDTO>> ListarDoUsuarioAsync(
        int usuarioId
    )
    {
        var ingressos = await _context.Ingressos
            .AsNoTracking()
            .Where(i => i.UsuarioId == usuarioId)
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

    public async Task<IngressoResponseDTO?> BuscarPorIdAsync(
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

    public async Task<ValidacaoIngressoResponseDTO> ValidarAsync(
        ValidarIngressoDTO dto
    )
    {
        var ingresso = await _context.Ingressos
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .FirstOrDefaultAsync(i =>
                i.TokenQrCode == dto.TokenQrCode
            );

        if (ingresso is null)
        {
            return CriarResultadoValidacao(
                false,
                "Ingresso não encontrado."
            );
        }

        if (ingresso.SessaoId != dto.SessaoId)
        {
            return CriarResultadoValidacao(
                false,
                "Este ingresso pertence a outra sessão."
            );
        }

        if (!ingresso.Sessao.Ativa)
        {
            return CriarResultadoValidacao(
                false,
                "A sessão já foi encerrada."
            );
        }

        if (ingresso.Utilizado)
        {
            return CriarResultadoValidacao(
                false,
                "Este ingresso já foi utilizado."
            );
        }

        var inicioLiberacao = ingresso.Sessao.DataHora
            .AddMinutes(-30);

        if (DateTime.Now < inicioLiberacao)
        {
            return CriarResultadoValidacao(
                false,
                "A sessão ainda não está liberada para entrada."
            );
        }

        ingresso.Utilizado = true;
        ingresso.DataUtilizacao = DateTime.Now;

        await _context.SaveChangesAsync();

        return CriarResultadoValidacao(
            true,
            "Entrada liberada."
        );
    }

    public async Task<bool> ExcluirAsync(int id)
    {
        var ingresso = await _context.Ingressos
            .FirstOrDefaultAsync(i => i.Id == id);

        if (ingresso is null)
        {
            return false;
        }

        _context.Ingressos.Remove(ingresso);

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task<Sessao> BuscarSessaoDisponivelAsync(
        int sessaoId
    )
    {
        var sessao = await _context.Sessoes
            .AsNoTracking()
            .Include(s => s.Filme)
            .FirstOrDefaultAsync(s => s.Id == sessaoId);

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

        var limiteCompra = sessao.DataHora.AddMinutes(30);

        if (DateTime.Now > limiteCompra)
        {
            throw new InvalidOperationException(
                "O prazo para compra desta sessão foi encerrado."
            );
        }

        return sessao;
    }

    private static Ingresso CriarIngresso(
        int sessaoId,
        int assentoId,
        int usuarioId,
        DateTime dataCompra
    )
    {
        return new Ingresso
        {
            SessaoId = sessaoId,
            AssentoId = assentoId,
            UsuarioId = usuarioId,
            ValorPago = ValorIngresso,
            TokenQrCode = Guid.NewGuid().ToString("N"),
            DataCompra = dataCompra,
            Utilizado = false,
            DataUtilizacao = null
        };
    }

    private static ValidacaoIngressoResponseDTO CriarResultadoValidacao(
        bool sucesso,
        string mensagem
    )
    {
        return new ValidacaoIngressoResponseDTO
        {
            Sucesso = sucesso,
            Mensagem = mensagem
        };
    }

    private static IngressoResponseDTO ConverterParaDTO(
        Ingresso ingresso
    )
    {
        return new IngressoResponseDTO
        {
            Id = ingresso.Id,

            SessaoId = ingresso.SessaoId,

            Filme = ingresso.Sessao.Filme.Titulo,

            DataSessao = ingresso.Sessao.DataHora,

            AssentoId = ingresso.AssentoId,

            CodigoAssento = ingresso.Assento.Codigo,

            UsuarioId = ingresso.UsuarioId,

            Usuario = ingresso.Usuario.Nome,

            ValorPago = ingresso.ValorPago,

            TokenQrCode = ingresso.TokenQrCode,

            DataCompra = ingresso.DataCompra,

            Utilizado = ingresso.Utilizado,

            DataUtilizacao = ingresso.DataUtilizacao
        };
    }
}