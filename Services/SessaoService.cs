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

    public async Task<SessaoResponseDTO> CriarAsync(CriarSessaoDTO dto)
    {
        var filme = await _context.Filmes
            .FirstOrDefaultAsync(f => f.Id == dto.FilmeId);

        if (filme == null)
            throw new Exception("Filme não encontrado.");

        if (dto.DataHora <= DateTime.Now)
            throw new Exception("A sessão deve ser em uma data futura.");

        var horarioOcupado = await _context.Sessoes
            .AnyAsync(s => s.DataHora == dto.DataHora);

        if (horarioOcupado)
            throw new Exception("Já existe uma sessão nesse horário.");

        var sessao = new Sessao
        {
            FilmeId = dto.FilmeId,
            DataHora = dto.DataHora
        };

        _context.Sessoes.Add(sessao);

        await _context.SaveChangesAsync();

        sessao.Filme = filme;

        return ConverterParaDTO(sessao);
    }

    public async Task<List<SessaoResponseDTO>> ListarTodosAsync()
    {
        var sessoes = await _context.Sessoes
            .Include(s => s.Filme)
            .ToListAsync();

        return sessoes
            .Select(ConverterParaDTO)
            .ToList();
    }

    public async Task<SessaoResponseDTO?> BuscarPorIdAsync(int id)
    {
        var sessao = await _context.Sessoes
            .Include(s => s.Filme)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sessao == null)
            return null;

        return ConverterParaDTO(sessao);
    }

    public async Task<bool> PatchAsync(int id, PatchSessaoDTO dto)
    {
        var sessao = await _context.Sessoes
            .FirstOrDefaultAsync(s => s.Id == id);

        if (sessao == null)
            return false;

        if (dto.FilmeId.HasValue)
        {
            var filmeExiste = await _context.Filmes
                .AnyAsync(f => f.Id == dto.FilmeId.Value);

            if (!filmeExiste)
                throw new Exception("Filme não encontrado.");

            sessao.FilmeId = dto.FilmeId.Value;
        }

        if (dto.DataHora.HasValue)
        {
            if (dto.DataHora.Value <= DateTime.Now)
                throw new Exception("A sessão deve ser em uma data futura.");

            var horarioOcupado = await _context.Sessoes
                .AnyAsync(s =>
                    s.Id != id &&
                    s.DataHora == dto.DataHora.Value);

            if (horarioOcupado)
                throw new Exception("Já existe uma sessão nesse horário.");

            sessao.DataHora = dto.DataHora.Value;
        }

        if (dto.Ativa.HasValue)
        {
            sessao.Ativa = dto.Ativa.Value;
        }

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ExcluirAsync(int id)
    {
        var sessao = await _context.Sessoes
            .FirstOrDefaultAsync(s => s.Id == id);
    
        if (sessao == null)
            return false;
    
        if (!sessao.Ativa)
            return true;
    
        sessao.Ativa = false;
    
        await _context.SaveChangesAsync();
    
        return true;
    }

    private static SessaoResponseDTO ConverterParaDTO(Sessao sessao)
    {
        return new SessaoResponseDTO
        {
            Id = sessao.Id,
            FilmeId = sessao.FilmeId,
            TituloFilme = sessao.Filme.Titulo,
            DataHora = sessao.DataHora,
            Ativa = sessao.Ativa
        };
    }
}