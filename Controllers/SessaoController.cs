using CinemaAPI.DTOs.Sessoes;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SessaoController : ControllerBase
{
    private readonly ISessaoService _sessaoService;

    public SessaoController(ISessaoService sessaoService)
    {
        _sessaoService = sessaoService;
    }

    [HttpPost]
    public async Task<IActionResult> CriarSessao(CriarSessaoDTO dto)
    {
        var sessao = await _sessaoService.CriarAsync(dto);

        return Ok(sessao);
    }

    [HttpGet]
    public async Task<IActionResult> ListarSessoes()
    {
        var sessoes = await _sessaoService.ListarTodosAsync();

        return Ok(sessoes);
    }

    [HttpGet("ativas")]
    public async Task<IActionResult> ListarAtivas()
    {
        var sessoes = await _sessaoService.ListarAtivasAsync();

        return Ok(sessoes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> BuscarSessaoPorId(int id)
    {
        var sessao = await _sessaoService.BuscarPorIdAsync(id);

        if (sessao == null)
            return NotFound();

        return Ok(sessao);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> AtualizarSessao(int id, PatchSessaoDTO dto)
    {
        var atualizada = await _sessaoService.PatchAsync(id, dto);

        if (!atualizada)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> ExcluirSessao(int id)
    {
        var excluida = await _sessaoService.ExcluirAsync(id);

        if (!excluida)
            return NotFound();

        return NoContent();
    }
}