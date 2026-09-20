using System.Security.Claims;
using CinemaAPI.DTOs.Usuarios;
using CinemaAPI.Models;
using CinemaAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CinemaAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class EquipeController : ControllerBase
{
    private readonly IUsuarioService _usuarioService;

    public EquipeController(IUsuarioService usuarioService)
    {
        _usuarioService = usuarioService;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        return Ok(await _usuarioService.ListarEquipeAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> BuscarPorId(int id)
    {
        var membro = await _usuarioService.BuscarMembroEquipePorIdAsync(id);
        return membro is null ? NotFound(new { mensagem = "Membro da equipe não encontrado." }) : Ok(membro);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarUsuarioDTO dto)
    {
        try
        {
            var membro = await _usuarioService.CriarMembroEquipeAsync(dto);
            return CreatedAtAction(nameof(BuscarPorId), new { id = membro.Id }, membro);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Atualizar(int id, [FromBody] AtualizarMembroEquipeDTO dto)
    {
        try
        {
            return await _usuarioService.AtualizarMembroEquipeAsync(id, dto)
                ? NoContent()
                : NotFound(new { mensagem = "Membro da equipe não encontrado." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
    }

    [HttpPatch("{id:int}/senha")]
    public async Task<IActionResult> AlterarSenha(int id, [FromBody] AlterarSenhaEquipeDTO dto)
    {
        return await _usuarioService.AlterarSenhaMembroEquipeAsync(id, dto)
            ? NoContent()
            : NotFound(new { mensagem = "Membro da equipe não encontrado." });
    }

    [HttpPatch("{id:int}/desativar")]
    public Task<IActionResult> Desativar(int id) => AlterarStatus(id, false);

    [HttpPatch("{id:int}/reativar")]
    public Task<IActionResult> Reativar(int id) => AlterarStatus(id, true);

    [HttpPatch("{id:int}/promover")]
    public Task<IActionResult> Promover(int id) => AlterarTipo(id, TipoUsuario.Admin);

    [HttpPatch("{id:int}/rebaixar")]
    public Task<IActionResult> Rebaixar(int id) => AlterarTipo(id, TipoUsuario.Funcionario);

    private async Task<IActionResult> AlterarStatus(int id, bool ativo)
    {
        if (!TentarObterAdministradorId(out var administradorId))
            return Unauthorized(new { mensagem = "Token inválido ou usuário não identificado." });

        try
        {
            return await _usuarioService.AlterarStatusMembroEquipeAsync(id, ativo, administradorId)
                ? NoContent()
                : NotFound(new { mensagem = "Membro da equipe não encontrado." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
    }

    private async Task<IActionResult> AlterarTipo(int id, TipoUsuario tipoUsuario)
    {
        if (!TentarObterAdministradorId(out var administradorId))
            return Unauthorized(new { mensagem = "Token inválido ou usuário não identificado." });

        try
        {
            return await _usuarioService.AlterarTipoMembroEquipeAsync(id, tipoUsuario, administradorId)
                ? NoContent()
                : NotFound(new { mensagem = "Membro da equipe não encontrado." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { mensagem = ex.Message });
        }
    }

    private bool TentarObterAdministradorId(out int administradorId) => int.TryParse(
        User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
        out administradorId);
}
