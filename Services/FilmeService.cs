using CinemaAPI.Data;
using CinemaAPI.DTOs.Filmes;
using CinemaAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class FilmeService : IFilmeService
{
    private readonly AppDbContext _context;

    public FilmeService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<FilmeResponseDTO> CriarAsync(CriarFilmeDTO dto)
    {
        var filme = new Filme
        {
            Titulo = dto.Titulo,
            DuracaoMinutos = dto.DuracaoMinutos,
            Classificacao = dto.Classificacao,
            Genero = dto.Genero,
            PosterUrl = dto.PosterUrl
        };

        _context.Filmes.Add(filme);

        await _context.SaveChangesAsync();

        return ConverterParaDTO(filme);
    }

    public async Task<List<FilmeResponseDTO>> ListarTodosAsync()
    {
        var filmes = await _context.Filmes.ToListAsync();

        return filmes
            .Select(ConverterParaDTO)
            .ToList();
    }

    public async Task<FilmeResponseDTO?> BuscarPorIdAsync(int id)
    {
        var filme = await _context.Filmes
            .FirstOrDefaultAsync(f => f.Id == id);

        if (filme == null)
            return null;

        return ConverterParaDTO(filme);
    }

    public async Task<bool> PatchAsync(int id, PatchFilmeDTO dto)
    {
        var filme = await _context.Filmes
            .FirstOrDefaultAsync(f => f.Id == id);

        if (filme == null)
            return false;

        if (dto.Titulo != null)
            filme.Titulo = dto.Titulo;

        if (dto.DuracaoMinutos.HasValue)
            filme.DuracaoMinutos = dto.DuracaoMinutos.Value;

        if (dto.Genero != null)
            filme.Genero = dto.Genero;

        if (dto.PosterUrl != null)
            filme.PosterUrl = dto.PosterUrl;

        if (dto.Classificacao.HasValue)
            filme.Classificacao = dto.Classificacao.Value;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ExcluirAsync(int id)
    {
        var filme = await _context.Filmes
            .FirstOrDefaultAsync(f => f.Id == id);

        if (filme == null)
            return false;

        _context.Filmes.Remove(filme);

        await _context.SaveChangesAsync();

        return true;
    }

    private static FilmeResponseDTO ConverterParaDTO(Filme filme)
    {
        return new FilmeResponseDTO
        {
            Id = filme.Id,
            Titulo = filme.Titulo,
            DuracaoMinutos = filme.DuracaoMinutos,
            Classificacao = filme.Classificacao,
            Genero = filme.Genero,
            PosterUrl = filme.PosterUrl,
            DataCadastro = filme.DataCadastro
        };
    }
}