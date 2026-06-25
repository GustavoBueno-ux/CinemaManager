using BCrypt.Net;
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
            throw new Exception("Já existe um usuário com esse email.");

        var senhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha);

        var usuario = new Usuario
        {
            Nome = dto.Nome,
            Email = dto.Email,
            SenhaHash = senhaHash,
            TipoUsuario = TipoUsuario.Cliente
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

        return ConverterParaDTO(usuario);
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
    
        if (!senhaCorreta)
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
}