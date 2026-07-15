using CinemaAPI.Data;
using CinemaAPI.Models;
using CinemaAPI.DTOs.Assentos;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class AssentoService : IAssentoService
{
    private readonly AppDbContext _context;


    public AssentoService(AppDbContext context)
    {
        _context = context;
    }


    public async Task<List<AssentoResponseDTO>> ListarTodosAsync()
    {
        var assentos = await _context.Assentos.ToListAsync();
        return assentos.Select(ConverterParaDTO).ToList();
    }


    public async Task<AssentoResponseDTO?> BuscarPorIdAsync(int id)
    {
        var assento = await _context.Assentos.FirstOrDefaultAsync(a => a.Id == id);
        if (assento == null) return null;
        return ConverterParaDTO(assento);
    }


    public async Task<List<AssentoDisponibilidadeDTO>> BuscarDisponibilidadeAsync(int sessaoId)
    {
        var ingressosSessao = await _context.Ingressos
            .Where(i => i.SessaoId == sessaoId)
            .ToListAsync();
    
    
        var assentos = await _context.Assentos
            .ToListAsync();
    
    
        var resultado = assentos.Select(a => new AssentoDisponibilidadeDTO
        {
            Id = a.Id,
            Codigo = a.Codigo,
            Ocupado = ingressosSessao.Any(i => i.AssentoId == a.Id)
        }).ToList();
    
    
        return resultado;
    }


    private static AssentoResponseDTO ConverterParaDTO(Assento assento)
    {
        return new AssentoResponseDTO
        {
            Id = assento.Id,
            Codigo = assento.Codigo
        };
    }
}