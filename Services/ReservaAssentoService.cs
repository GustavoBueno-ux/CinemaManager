using System.Data;
using CinemaAPI.Data;
using CinemaAPI.DTOs.Reservas;
using CinemaAPI.Models;
using CinemaAPI.Utils;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class ReservaAssentoService : IReservaAssentoService
{
    private const int MinutosReserva = 10;

    private readonly AppDbContext _context;

    public ReservaAssentoService(AppDbContext context)
    {
        _context = context;
    }


    public async Task<ReservasAssentosLoteResponseDTO> ReservarEmLoteAsync(
        int usuarioId,
        CriarReservasAssentosLoteDTO dto
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

        var agora = HorarioCinema.Agora;
        var expiracaoNovasReservas = agora.AddMinutes(MinutosReserva);

        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable
            );

        try
        {
            var sessao = await _context.Sessoes
                .AsNoTracking()
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
                    "Esta sessão não está ativa."
                );
            }

            if (agora > sessao.DataHora.AddMinutes(30))
            {
                throw new InvalidOperationException(
                    "O prazo para compra desta sessão foi encerrado."
                );
            }

            var usuarioExiste = await _context.Usuarios
                .AsNoTracking()
                .AnyAsync(u => u.Id == usuarioId);

            if (!usuarioExiste)
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
                var idsEncontrados = assentos
                    .Select(a => a.Id)
                    .ToHashSet();

                var idsNaoEncontrados = assentoIds
                    .Where(id => !idsEncontrados.Contains(id))
                    .ToList();

                throw new KeyNotFoundException(
                    $"Os seguintes assentos não foram encontrados: " +
                    $"{string.Join(", ", idsNaoEncontrados)}."
                );
            }

            var assentosJaComprados = await _context.Ingressos
                .AsNoTracking()
                .Where(i =>
                    i.SessaoId == dto.SessaoId &&
                    assentoIds.Contains(i.AssentoId)
                )
                .Select(i => i.AssentoId)
                .ToListAsync();

            if (assentosJaComprados.Count > 0)
            {
                var codigosComprados = assentos
                    .Where(a => assentosJaComprados.Contains(a.Id))
                    .Select(a => a.Codigo)
                    .OrderBy(codigo => codigo)
                    .ToList();

                throw new InvalidOperationException(
                    $"Os seguintes assentos já foram comprados: " +
                    $"{string.Join(", ", codigosComprados)}."
                );
            }

            var reservasExistentes = await _context.ReservasAssentos
                .Where(r =>
                    r.SessaoId == dto.SessaoId &&
                    assentoIds.Contains(r.AssentoId)
                )
                .ToListAsync();

            /*
             * Reservas vencidas não bloqueiam mais os assentos.
             * Elas serão removidas dentro da mesma transação.
             */
            var reservasVencidas = reservasExistentes
                .Where(r => r.ExpiraEm <= agora)
                .ToList();

            if (reservasVencidas.Count > 0)
            {
                _context.ReservasAssentos.RemoveRange(
                    reservasVencidas
                );

                /*
                 * Salvamos a remoção agora porque o índice único impediria
                 * inserir uma nova reserva enquanto a vencida ainda estivesse
                 * fisicamente no banco.
                 *
                 * Como existe uma transação, essa remoção será desfeita caso
                 * qualquer etapa posterior falhe.
                 */
                await _context.SaveChangesAsync();

                foreach (var reservaVencida in reservasVencidas)
                {
                    reservasExistentes.Remove(reservaVencida);
                }
            }

            var reservasDeOutrosUsuarios = reservasExistentes
                .Where(r =>
                    r.ExpiraEm > agora &&
                    r.UsuarioId != usuarioId
                )
                .ToList();

            if (reservasDeOutrosUsuarios.Count > 0)
            {
                var idsReservados = reservasDeOutrosUsuarios
                    .Select(r => r.AssentoId)
                    .ToHashSet();

                var codigosReservados = assentos
                    .Where(a => idsReservados.Contains(a.Id))
                    .Select(a => a.Codigo)
                    .OrderBy(codigo => codigo)
                    .ToList();

                throw new InvalidOperationException(
                    $"Os seguintes assentos estão reservados " +
                    $"por outro usuário: " +
                    $"{string.Join(", ", codigosReservados)}."
                );
            }

            /*
             * Reservas válidas do próprio usuário são reaproveitadas.
             * O prazo delas não será reiniciado.
             */
            var reservasDoUsuario = reservasExistentes
                .Where(r =>
                    r.UsuarioId == usuarioId &&
                    r.ExpiraEm > agora
                )
                .ToList();

            var idsJaReservadosPeloUsuario = reservasDoUsuario
                .Select(r => r.AssentoId)
                .ToHashSet();

            var idsParaCriarReserva = assentoIds
                .Where(id => !idsJaReservadosPeloUsuario.Contains(id))
                .ToList();

            var novasReservas = idsParaCriarReserva
                .Select(assentoId => new ReservaAssento
                {
                    SessaoId = dto.SessaoId,
                    AssentoId = assentoId,
                    UsuarioId = usuarioId,
                    CriadaEm = agora,
                    ExpiraEm = expiracaoNovasReservas
                })
                .ToList();

            if (novasReservas.Count > 0)
            {
                await _context.ReservasAssentos.AddRangeAsync(
                    novasReservas
                );

                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    throw new InvalidOperationException(
                        "Um ou mais assentos acabaram de ser reservados " +
                        "por outro usuário. Nenhum novo assento foi reservado."
                    );
                }
            }

            await transaction.CommitAsync();

            var todasAsReservas = reservasDoUsuario
                .Concat(novasReservas)
                .OrderBy(r =>
                    assentos.First(a => a.Id == r.AssentoId).Codigo
                )
                .ToList();

            var assentosPorId = assentos.ToDictionary(
                a => a.Id
            );

            var reservasDto = todasAsReservas
                .Select(reserva => ConverterParaDTO(
                    reserva,
                    assentosPorId[reserva.AssentoId].Codigo,
                    agora
                ))
                .ToList();

            var menorExpiracao = todasAsReservas
                .Min(r => r.ExpiraEm);

            var segundosRestantes = Math.Max(
                0,
                (int)Math.Ceiling(
                    (menorExpiracao - agora).TotalSeconds
                )
            );

            return new ReservasAssentosLoteResponseDTO
            {
                SessaoId = dto.SessaoId,
                Quantidade = reservasDto.Count,
                ExpiraEm = menorExpiracao,
                SegundosRestantes = segundosRestantes,
                Reservas = reservasDto
            };
        }
        catch
        {
            await transaction.RollbackAsync();

            _context.ChangeTracker.Clear();

            throw;
        }
    }


    public async Task<ReservaAssentoResponseDTO> ReservarAsync(
        int usuarioId,
        CriarReservaAssentoDTO dto
    )
    {
        var agora = HorarioCinema.Agora;

        await using var transaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable
            );

        try
        {
            var sessao = await _context.Sessoes
                .AsNoTracking()
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
                    "Esta sessão não está ativa."
                );
            }

            if (agora > sessao.DataHora.AddMinutes(30))
            {
                throw new InvalidOperationException(
                    "O prazo para compra desta sessão foi encerrado."
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

            var ingressoExiste = await _context.Ingressos
                .AsNoTracking()
                .AnyAsync(i =>
                    i.SessaoId == dto.SessaoId &&
                    i.AssentoId == dto.AssentoId
                );

            if (ingressoExiste)
            {
                throw new InvalidOperationException(
                    "Este assento já foi comprado."
                );
            }

            var reservaExistente = await _context.ReservasAssentos
                .FirstOrDefaultAsync(r =>
                    r.SessaoId == dto.SessaoId &&
                    r.AssentoId == dto.AssentoId
                );

            if (reservaExistente is not null)
            {
                var reservaAindaValida =
                    reservaExistente.ExpiraEm > agora;

                if (
                    reservaAindaValida &&
                    reservaExistente.UsuarioId != usuarioId
                )
                {
                    throw new InvalidOperationException(
                        "Este assento está reservado por outro usuário."
                    );
                }

                if (
                    reservaAindaValida &&
                    reservaExistente.UsuarioId == usuarioId
                )
                {
                    await transaction.CommitAsync();

                    return ConverterParaDTO(
                        reservaExistente,
                        assento.Codigo,
                        agora
                    );
                }

                _context.ReservasAssentos.Remove(
                    reservaExistente
                );

                await _context.SaveChangesAsync();
            }

            var reserva = new ReservaAssento
            {
                SessaoId = dto.SessaoId,
                AssentoId = dto.AssentoId,
                UsuarioId = usuarioId,
                CriadaEm = agora,
                ExpiraEm = agora.AddMinutes(MinutosReserva)
            };

            await _context.ReservasAssentos.AddAsync(reserva);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new InvalidOperationException(
                    "Este assento acabou de ser reservado " +
                    "por outro usuário."
                );
            }

            await transaction.CommitAsync();

            return ConverterParaDTO(
                reserva,
                assento.Codigo,
                agora
            );
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> CancelarAsync(
        int usuarioId,
        int sessaoId,
        int assentoId
    )
    {
        var reserva = await _context.ReservasAssentos
            .FirstOrDefaultAsync(r =>
                r.SessaoId == sessaoId &&
                r.AssentoId == assentoId &&
                r.UsuarioId == usuarioId
            );

        if (reserva is null)
        {
            return false;
        }

        _context.ReservasAssentos.Remove(reserva);

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<List<StatusAssentoResponseDTO>> ListarStatusAsync(
        int sessaoId,
        int usuarioId
    )
    {
        var agora = HorarioCinema.Agora;

        var sessaoExiste = await _context.Sessoes
            .AsNoTracking()
            .AnyAsync(s => s.Id == sessaoId);

        if (!sessaoExiste)
        {
            throw new KeyNotFoundException(
                "Sessão não encontrada."
            );
        }

        /*
         * Remove reservas vencidas antes de montar o mapa.
         * Assim elas deixam de bloquear os assentos.
         */
        await _context.ReservasAssentos
            .Where(r =>
                r.SessaoId == sessaoId &&
                r.ExpiraEm <= agora
            )
            .ExecuteDeleteAsync();

        var assentos = await _context.Assentos
            .AsNoTracking()
            .OrderBy(a => a.Codigo)
            .ToListAsync();

        var assentosComprados = await _context.Ingressos
            .AsNoTracking()
            .Where(i => i.SessaoId == sessaoId)
            .Select(i => i.AssentoId)
            .ToListAsync();

        var reservasAtivas = await _context.ReservasAssentos
            .AsNoTracking()
            .Where(r =>
                r.SessaoId == sessaoId &&
                r.ExpiraEm > agora
            )
            .ToListAsync();

        var compradosSet = assentosComprados.ToHashSet();

        var reservasPorAssento = reservasAtivas
            .ToDictionary(r => r.AssentoId);

        return assentos
            .Select(assento =>
            {
                if (compradosSet.Contains(assento.Id))
                {
                    return new StatusAssentoResponseDTO
                    {
                        AssentoId = assento.Id,
                        Codigo = assento.Codigo,
                        Status = "ocupado",
                        ReservadoPeloUsuarioAtual = false,
                        ReservaExpiraEm = null
                    };
                }

                if (
                    reservasPorAssento.TryGetValue(
                        assento.Id,
                        out var reserva
                    )
                )
                {
                    return new StatusAssentoResponseDTO
                    {
                        AssentoId = assento.Id,
                        Codigo = assento.Codigo,
                        Status = "reservado",

                        ReservadoPeloUsuarioAtual =
                            reserva.UsuarioId == usuarioId,

                        ReservaExpiraEm = reserva.ExpiraEm
                    };
                }

                return new StatusAssentoResponseDTO
                {
                    AssentoId = assento.Id,
                    Codigo = assento.Codigo,
                    Status = "disponivel",
                    ReservadoPeloUsuarioAtual = false,
                    ReservaExpiraEm = null
                };
            })
            .ToList();
    }

    public async Task LiberarReservasDoUsuarioAsync(
        int usuarioId,
        int sessaoId
    )
    {
        await _context.ReservasAssentos
            .Where(r =>
                r.UsuarioId == usuarioId &&
                r.SessaoId == sessaoId
            )
            .ExecuteDeleteAsync();
    }

    private static ReservaAssentoResponseDTO ConverterParaDTO(
        ReservaAssento reserva,
        string codigoAssento,
        DateTime agora
    )
    {
        var segundosRestantes = Math.Max(
            0,
            (int)Math.Ceiling(
                (reserva.ExpiraEm - agora).TotalSeconds
            )
        );

        return new ReservaAssentoResponseDTO
        {
            ReservaId = reserva.Id,
            SessaoId = reserva.SessaoId,
            AssentoId = reserva.AssentoId,
            CodigoAssento = codigoAssento,
            ExpiraEm = reserva.ExpiraEm,
            SegundosRestantes = segundosRestantes
        };
    }
}