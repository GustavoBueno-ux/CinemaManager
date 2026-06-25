using CinemaAPI.DTOs.Usuarios;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsuarioController : ControllerBase
{
    private readonly IUsuarioService _usuarioService;

    public UsuarioController(IUsuarioService usuarioService)
    {
        _usuarioService = usuarioService;
    }

    [HttpPost]
    public async Task<IActionResult> CriarUsuario(CriarUsuarioDTO dto)
    {
        var usuario = await _usuarioService.CriarAsync(dto);

        return Ok(usuario);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDTO dto)
    {
        var usuario = await _usuarioService.LoginAsync(dto);

        if (usuario == null)
            return Unauthorized();

        return Ok(usuario);
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> ListarUsuarios()
    {
        var usuarios = await _usuarioService.ListarTodosAsync();

        return Ok(usuarios);
    }

    [Authorize]
    [HttpGet("{id}")]
    public async Task<IActionResult> BuscarUsuarioPorId(int id)
    {
        var usuario = await _usuarioService.BuscarPorIdAsync(id);

        if (usuario == null)
            return NotFound();

        return Ok(usuario);
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> AtualizarUsuario(int id, PatchUsuarioDTO dto)
    {
        var atualizado = await _usuarioService.PatchAsync(id, dto);

        if (!atualizado)
            return NotFound();

        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> ExcluirUsuario(int id)
    {
        var excluido = await _usuarioService.ExcluirAsync(id);

        if (!excluido)
            return NotFound();

        return NoContent();
    }
}