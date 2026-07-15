using CinemaAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssentoController : ControllerBase
{
    private readonly IAssentoService _service;


    public AssentoController(IAssentoService service)
    {
        _service = service;
    }


    [HttpGet]
    public async Task<IActionResult> ListarTodos()
    {
        var assentos = await _service.ListarTodosAsync();
        return Ok(assentos);
    }


    [HttpGet("{id}")]
    public async Task<IActionResult> BuscarPorId(int id)
    {
        var assento = await _service.BuscarPorIdAsync(id);

        if (assento == null) return NotFound();
        return Ok(assento);
    }


    [HttpGet("sessao/{sessaoId}")]
    public async Task<IActionResult> BuscarDisponibilidade(int sessaoId)
    {
        var assentos = await _service.BuscarDisponibilidadeAsync(sessaoId);
        return Ok(assentos);
    }
}