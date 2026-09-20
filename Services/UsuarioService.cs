using BCrypt.Net;
using System.Data;
using CinemaAPI.Data;
using CinemaAPI.DTOs.Usuarios;
using CinemaAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class UsuarioService : IUsuarioService
{
    private readonly AppDbContext _context;
    private readonly IJwtService _jwtService;

    public UsuarioService(AppDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<UsuarioResponseDTO> CriarAsync(CriarUsuarioDTO dto)
    {
        var emailExiste = await _context.Usuarios
            .AnyAsync(u => u.Email == dto.Email);

        if (emailExiste)
            throw new InvalidOperationException("Já existe um usuário com esse email.");

        var senhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha);

        var usuario = new Usuario
        {
            Nome = dto.Nome,
            Email = dto.Email,
            SenhaHash = senhaHash,
            TipoUsuario = TipoUsuario.Cliente,
            Ativo = true
        };

        _context.Usuarios.Add(usuario);

        await _context.SaveChangesAsync();

        return ConverterParaDTO(usuario);
    }

    public async Task<UsuarioResponseDTO> CriarFuncionarioAsync(CriarUsuarioDTO dto)
    {
        var emailExiste = await _context.Usuarios
            .AnyAsync(u => u.Email == dto.Email);

        if (emailExiste)
        {
            throw new InvalidOperationException(
                "Já existe um usuário com esse email."
            );
        }

        var senhaHash =
            BCrypt.Net.BCrypt.HashPassword(dto.Senha);

        var usuario = new Usuario
        {
            Nome = dto.Nome,
            Email = dto.Email,
            SenhaHash = senhaHash,
            TipoUsuario = TipoUsuario.Funcionario,
            Ativo = true
        };

        _context.Usuarios.Add(usuario);

        await _context.SaveChangesAsync();

        return ConverterParaDTO(usuario);
    }

    public async Task<UsuarioResponseDTO?> BuscarPorIdAsync(int id)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Id == id);
    
        if (usuario == null)
            return null;
    
        var quantidadeIngressos = await _context.Ingressos
            .CountAsync(i => i.UsuarioId == id);
    
        var dto = ConverterParaDTO(usuario);
    
        dto.QuantidadeIngressos = quantidadeIngressos;
    
        return dto;
    }

    public async Task<List<UsuarioResponseDTO>> ListarTodosAsync()
    {
        var usuarios = await _context.Usuarios.ToListAsync();

        return usuarios
            .Select(ConverterParaDTO)
            .ToList();
    }

    public async Task<bool> PatchAsync(int id, PatchUsuarioDTO dto)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Id == id);

        if (usuario == null)
            return false;

        if (!string.IsNullOrWhiteSpace(dto.Nome))
            usuario.Nome = dto.Nome;

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var emailExiste = await _context.Usuarios
                .AnyAsync(u => u.Email == dto.Email && u.Id != id);

            if (emailExiste)
                throw new Exception("Já existe um usuário com esse email.");

            usuario.Email = dto.Email;
        }

        if (!string.IsNullOrWhiteSpace(dto.Senha))
        {
            usuario.SenhaHash =
                BCrypt.Net.BCrypt.HashPassword(dto.Senha);
        }

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> ExcluirAsync(int id)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Id == id);

        if (usuario == null)
            return false;

        if (usuario.TipoUsuario is TipoUsuario.Funcionario or TipoUsuario.Admin)
            throw new InvalidOperationException(
                "Membros da equipe devem ser desativados, não excluídos."
            );

        _context.Usuarios.Remove(usuario);

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<LoginResponseDTO?> LoginAsync(LoginDTO dto)
    {
        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Email == dto.Email);
    
        if (usuario == null)
            return null;
    
        var senhaCorreta = BCrypt.Net.BCrypt.Verify(
            dto.Senha,
            usuario.SenhaHash
        );
    
        if (!senhaCorreta || !usuario.Ativo)
            return null;
    
        var token = _jwtService.GerarToken(usuario);
    
        return new LoginResponseDTO
        {
            Token = token,
            Usuario = ConverterParaDTO(usuario)
        };
    }

    private static UsuarioResponseDTO ConverterParaDTO(Usuario usuario)
    {
        return new UsuarioResponseDTO
        {
            Id = usuario.Id,
            Nome = usuario.Nome,
            Email = usuario.Email,
            TipoUsuario = usuario.TipoUsuario.ToString(),
            DataCadastro = usuario.DataCadastro
        };
    }

    public async Task<List<EquipeResponseDTO>> ListarEquipeAsync()
    {
        var equipe = await _context.Usuarios
            .Where(u => u.TipoUsuario == TipoUsuario.Funcionario ||
                        u.TipoUsuario == TipoUsuario.Admin)
            .OrderBy(u => u.Nome)
            .ToListAsync();

        return equipe.Select(ConverterParaEquipeDTO).ToList();
    }

    public async Task<EquipeResponseDTO?> BuscarMembroEquipePorIdAsync(int id)
    {
        var usuario = await BuscarMembroInternoAsync(id);
        return usuario is null ? null : ConverterParaEquipeDTO(usuario);
    }

    public async Task<EquipeResponseDTO> CriarMembroEquipeAsync(CriarUsuarioDTO dto)
    {
        var emailExiste = await _context.Usuarios.AnyAsync(u => u.Email == dto.Email);

        if (emailExiste)
            throw new InvalidOperationException("Já existe um usuário com esse email.");

        var usuario = new Usuario
        {
            Nome = dto.Nome,
            Email = dto.Email,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha),
            TipoUsuario = TipoUsuario.Funcionario,
            Ativo = true
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return ConverterParaEquipeDTO(usuario);
    }

    public async Task<bool> AtualizarMembroEquipeAsync(int id, AtualizarMembroEquipeDTO dto)
    {
        var usuario = await BuscarMembroInternoAsync(id);
        if (usuario is null)
            return false;

        if (!string.IsNullOrWhiteSpace(dto.Nome))
            usuario.Nome = dto.Nome;

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            var emailExiste = await _context.Usuarios
                .AnyAsync(u => u.Email == dto.Email && u.Id != id);

            if (emailExiste)
                throw new InvalidOperationException("Já existe um usuário com esse email.");

            usuario.Email = dto.Email;
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AlterarSenhaMembroEquipeAsync(int id, AlterarSenhaEquipeDTO dto)
    {
        var usuario = await BuscarMembroInternoAsync(id);
        if (usuario is null)
            return false;

        usuario.SenhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AlterarStatusMembroEquipeAsync(int id, bool ativo, int administradorId)
    {
        await using var transacao = await _context.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        var usuario = await BuscarMembroInternoAsync(id);
        if (usuario is null)
            return false;

        if (!ativo && usuario.Id == administradorId)
            throw new InvalidOperationException("Não é permitido desativar a própria conta.");

        if (!ativo && usuario.TipoUsuario == TipoUsuario.Admin && usuario.Ativo)
            await GarantirOutroAdminAtivoAsync(usuario.Id);

        usuario.Ativo = ativo;
        await _context.SaveChangesAsync();
        await transacao.CommitAsync();
        return true;
    }

    public async Task<bool> AlterarTipoMembroEquipeAsync(int id, TipoUsuario tipoUsuario, int administradorId)
    {
        if (tipoUsuario is not (TipoUsuario.Funcionario or TipoUsuario.Admin))
            throw new InvalidOperationException("A equipe só pode conter Funcionários ou Admins.");

        await using var transacao = await _context.Database
            .BeginTransactionAsync(IsolationLevel.Serializable);

        var usuario = await BuscarMembroInternoAsync(id);
        if (usuario is null)
            return false;

        if (usuario.TipoUsuario == tipoUsuario)
        {
            await transacao.CommitAsync();
            return true;
        }

        if (tipoUsuario == TipoUsuario.Funcionario && usuario.Id == administradorId)
            throw new InvalidOperationException("Não é permitido rebaixar a própria conta.");

        if (tipoUsuario == TipoUsuario.Funcionario && usuario.TipoUsuario == TipoUsuario.Admin && usuario.Ativo)
            await GarantirOutroAdminAtivoAsync(usuario.Id);

        usuario.TipoUsuario = tipoUsuario;
        await _context.SaveChangesAsync();
        await transacao.CommitAsync();
        return true;
    }

    private Task<Usuario?> BuscarMembroInternoAsync(int id) => _context.Usuarios
        .FirstOrDefaultAsync(u => u.Id == id &&
            (u.TipoUsuario == TipoUsuario.Funcionario || u.TipoUsuario == TipoUsuario.Admin));

    private async Task GarantirOutroAdminAtivoAsync(int administradorId)
    {
        var existeOutroAdminAtivo = await _context.Usuarios.AnyAsync(u =>
            u.Id != administradorId &&
            u.TipoUsuario == TipoUsuario.Admin &&
            u.Ativo);

        if (!existeOutroAdminAtivo)
            throw new InvalidOperationException(
                "Deve existir pelo menos outro Admin ativo no sistema."
            );
    }

    private static EquipeResponseDTO ConverterParaEquipeDTO(Usuario usuario) => new()
    {
        Id = usuario.Id,
        Nome = usuario.Nome,
        Email = usuario.Email,
        TipoUsuario = usuario.TipoUsuario.ToString(),
        Ativo = usuario.Ativo,
        DataCadastro = usuario.DataCadastro
    };
}
