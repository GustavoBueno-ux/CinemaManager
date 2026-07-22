using CinemaAPI.DTOs.Filmes;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilmeController : ControllerBase
{
    private readonly IFilmeService _filmeService;

    public FilmeController(IFilmeService filmeService)
    {
        _filmeService = filmeService;
    }

    [HttpPost]
    public async Task<IActionResult> CadastrarFilme(CriarFilmeDTO dto)
    {
        var filme = await _filmeService.CriarAsync(dto);

        return Ok(filme);
    }

    [HttpGet]
    public async Task<IActionResult> ListarFilmes()
    {
        var filmes = await _filmeService.ListarTodosAsync();
        return Ok(filmes);
    }

    [HttpGet("ativos")]
    public async Task<IActionResult> ListarFilmesAtivos()
    {
        var filmes = await _filmeService.ListarComSessoesAtivasAsync();
        return Ok(filmes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> BuscarFilmePorId(int id)
    {
        var filme = await _filmeService.BuscarPorIdAsync(id);
        if (filme == null) return NotFound();
        return Ok(filme);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> PatchFilme(int id, PatchFilmeDTO dto)
    {
        var atualizado = await _filmeService.PatchAsync(id, dto);

        if (!atualizado)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> ExcluirFilmePorId(int id)
    {
        var excluido = await _filmeService.ExcluirAsync(id);

        if (!excluido)
            return NotFound();

        return NoContent();
    }
}