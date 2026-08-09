using CinemaAPI.Data;
using CinemaAPI.DTOs.Sessoes;
using CinemaAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class SessaoService : ISessaoService
{
    private readonly AppDbContext _context;

    public SessaoService(AppDbContext context)
    {
        _context = context;
    }


    public async Task<SessaoResponseDTO> CriarAsync(
        CriarSessaoDTO dto
    )
    {
        var filme = await _context.Filmes
            .FirstOrDefaultAsync(
                f => f.Id == dto.FilmeId
            );

        if (filme == null)
        {
            throw new Exception(
                "Filme não encontrado."
            );
        }

        if (dto.DataHora <= HorarioCinema.Agora)
        {
            throw new Exception(
                "A sessão deve ser em uma data futura."
            );
        }

        if (dto.PrecoIngresso <= 0)
        {
            throw new ArgumentException(
                "O preço do ingresso deve ser maior que zero."
            );
        }

        var horarioOcupado = await _context.Sessoes
            .AnyAsync(
                s => s.DataHora == dto.DataHora
            );

        if (horarioOcupado)
        {
            throw new Exception(
                "Já existe uma sessão nesse horário."
            );
        }

        var sessao = new Sessao
        {
            FilmeId = dto.FilmeId,
            DataHora = dto.DataHora,
            PrecoIngresso = dto.PrecoIngresso
        };

        _context.Sessoes.Add(sessao);

        await _context.SaveChangesAsync();

        sessao.Filme = filme;

        return ConverterParaDTO(sessao);
    }


    public async Task<List<SessaoResponseDTO>>
        ListarTodosAsync()
    {
        return await ProjetarParaDTO(
            _context.Sessoes
                .AsNoTracking()
        )
        .OrderBy(s => s.DataHora)
        .ToListAsync();
    }


    public async Task<List<SessaoResponseDTO>>
        ListarAtivasAsync()
    {
        return await ProjetarParaDTO(
            _context.Sessoes
                .AsNoTracking()
                .Where(s => s.Ativa)
        )
        .OrderBy(s => s.DataHora)
        .ToListAsync();
    }


    public async Task<List<SessaoResponseDTO>>
        ListarPorFilmeAsync(
            int filmeId
        )
    {
        return await ProjetarParaDTO(
            _context.Sessoes
                .AsNoTracking()
                .Where(s =>
                    s.FilmeId == filmeId &&
                    s.Ativa
                )
        )
        .OrderBy(s => s.DataHora)
        .ToListAsync();
    }


    public async Task<SessaoResponseDTO?>
        BuscarPorIdAsync(
            int id
        )
    {
        return await ProjetarParaDTO(
            _context.Sessoes
                .AsNoTracking()
                .Where(s => s.Id == id)
        )
        .FirstOrDefaultAsync();
    }


    public async Task<bool> PatchAsync(
        int id,
        PatchSessaoDTO dto
    )
    {
        var sessao = await _context.Sessoes
            .FirstOrDefaultAsync(
                s => s.Id == id
            );

        if (sessao == null)
        {
            return false;
        }

        /*
         * Uma sessão que já começou não pode
         * mais ser editada.
         */
        if (sessao.DataHora <= HorarioCinema.Agora)
        {
            throw new InvalidOperationException(
                "Esta sessão já aconteceu e não pode ser editada."
            );
        }

        /*
         * Se já existir qualquer ingresso relacionado
         * à sessão, ela não pode mais ser alterada.
         *
         * Isso inclui alteração de filme, data,
         * horário, status e preço.
         *
         * Reservas temporárias não entram nessa regra.
         */
        var possuiIngressosVendidos =
            await _context.Ingressos
                .AsNoTracking()
                .AnyAsync(
                    ingresso =>
                        ingresso.SessaoId == sessao.Id
                );

        if (possuiIngressosVendidos)
        {
            throw new InvalidOperationException(
                "Esta sessão possui ingressos vendidos e não pode ser editada."
            );
        }

        if (dto.FilmeId.HasValue)
        {
            var filmeExiste = await _context.Filmes
                .AsNoTracking()
                .AnyAsync(
                    f =>
                        f.Id == dto.FilmeId.Value
                );

            if (!filmeExiste)
            {
                throw new Exception(
                    "Filme não encontrado."
                );
            }

            sessao.FilmeId =
                dto.FilmeId.Value;
        }

        if (dto.DataHora.HasValue)
        {
            if (
                dto.DataHora.Value <=
                HorarioCinema.Agora
            )
            {
                throw new Exception(
                    "A sessão deve ser em uma data futura."
                );
            }

            var horarioOcupado =
                await _context.Sessoes
                    .AsNoTracking()
                    .AnyAsync(s =>
                        s.Id != id &&
                        s.DataHora ==
                            dto.DataHora.Value
                    );

            if (horarioOcupado)
            {
                throw new Exception(
                    "Já existe uma sessão nesse horário."
                );
            }

            sessao.DataHora =
                dto.DataHora.Value;
        }

        if (dto.PrecoIngresso.HasValue)
        {
            if (dto.PrecoIngresso.Value <= 0)
            {
                throw new ArgumentException(
                    "O preço do ingresso deve ser maior que zero."
                );
            }

            sessao.PrecoIngresso =
                dto.PrecoIngresso.Value;
        }

        if (dto.Ativa.HasValue)
        {
            sessao.Ativa =
                dto.Ativa.Value;
        }

        await _context.SaveChangesAsync();

        return true;
    }


    public async Task<bool> ExcluirAsync(
        int id
    )
    {
        var sessao = await _context.Sessoes
            .FirstOrDefaultAsync(
                s => s.Id == id
            );

        if (sessao == null)
        {
            return false;
        }

        if (!sessao.Ativa)
        {
            return true;
        }

        sessao.Ativa = false;

        await _context.SaveChangesAsync();

        return true;
    }


    private IQueryable<SessaoResponseDTO>
        ProjetarParaDTO(
            IQueryable<Sessao> query
        )
    {
        return query.Select(
            sessao =>
                new SessaoResponseDTO
                {
                    Id = sessao.Id,

                    FilmeId =
                        sessao.FilmeId,

                    TituloFilme =
                        sessao.Filme.Titulo,

                    DataHora =
                        sessao.DataHora,

                    PrecoIngresso =
                        sessao.PrecoIngresso,

                    Ativa =
                        sessao.Ativa,

                    PossuiIngressosVendidos =
                        _context.Ingressos
                            .Any(
                                ingresso =>
                                    ingresso.SessaoId ==
                                    sessao.Id
                            )
                }
        );
    }


    private static SessaoResponseDTO
        ConverterParaDTO(
            Sessao sessao
        )
    {
        return new SessaoResponseDTO
        {
            Id = sessao.Id,

            FilmeId = sessao.FilmeId,

            TituloFilme =
                sessao.Filme.Titulo,

            DataHora =
                sessao.DataHora,

            PrecoIngresso =
                sessao.PrecoIngresso,

            Ativa =
                sessao.Ativa,

            PossuiIngressosVendidos =
                false
        };
    }
}