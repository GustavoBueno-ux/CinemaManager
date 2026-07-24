using System.Security.Claims;
using CinemaAPI.DTOs.Usuarios;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
    public async Task<IActionResult> CriarUsuario(
        [FromBody] CriarUsuarioDTO dto
    )
    {
        var usuario = await _usuarioService.CriarAsync(dto);

        return Ok(usuario);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginDTO dto
    )
    {
        var usuario = await _usuarioService.LoginAsync(dto);

        if (usuario is null)
        {
            return Unauthorized(new
            {
                mensagem = "E-mail ou senha inválidos."
            });
        }

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
    [HttpGet("perfil")]
    public async Task<IActionResult> BuscarUsuarioAutenticado()
    {
        if (!TentarObterUsuarioId(out var usuarioId))
        {
            return Unauthorized(new
            {
                mensagem = "Token inválido ou usuário não identificado."
            });
        }
    
        var usuario = await _usuarioService.BuscarPorIdAsync(usuarioId);
    
        if (usuario is null)
        {
            return NotFound(new
            {
                mensagem = "Usuário não encontrado."
            });
        }
    
        return Ok(usuario);
    }

    [Authorize]
    [HttpPatch("perfil")]
    public async Task<IActionResult> AtualizarUsuarioAutenticado(
        [FromBody] PatchUsuarioDTO dto
    )
    {
        if (!TentarObterUsuarioId(out var usuarioId))
        {
            return Unauthorized(new
            {
                mensagem = "Token inválido ou usuário não identificado."
            });
        }

        var atualizado = await _usuarioService
            .PatchAsync(usuarioId, dto);

        if (!atualizado)
        {
            return NotFound(new
            {
                mensagem = "Usuário não encontrado."
            });
        }

        return NoContent();
    }

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> ExcluirUsuario(int id)
    {
        var excluido = await _usuarioService.ExcluirAsync(id);

        if (!excluido)
        {
            return NotFound(new
            {
                mensagem = "Usuário não encontrado."
            });
        }

        return NoContent();
    }

    private bool TentarObterUsuarioId(out int usuarioId)
    {
        var usuarioIdClaim = User.FindFirst(
            ClaimTypes.NameIdentifier
        )?.Value;

        return int.TryParse(usuarioIdClaim, out usuarioId);
    }
}