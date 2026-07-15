using CinemaAPI.Data;
using CinemaAPI.DTOs.Ingressos;
using CinemaAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Services;

public class IngressoService : IIngressoService
{
    private readonly AppDbContext _context;

    public IngressoService(AppDbContext context)
    {
        _context = context;
    }


    public async Task<IngressoResponseDTO> CriarAsync(CriarIngressoDTO dto)
    {
        var sessao = await _context.Sessoes
            .Include(s => s.Filme)
            .FirstOrDefaultAsync(s => s.Id == dto.SessaoId);

        if (sessao == null)
            throw new Exception("Sessão não encontrada.");

        if (!sessao.Ativa)
            throw new Exception("Sessão desativada.");

        // Permite compra até 30 minutos após o início da sessão
        if (DateTime.Now > sessao.DataHora.AddMinutes(30))
            throw new Exception("O prazo para compra desta sessão foi encerrado.");

        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Id == dto.UsuarioId);

        if (usuario == null)
            throw new Exception("Usuário não encontrado.");

        var assento = await _context.Assentos
            .FirstOrDefaultAsync(a => a.Id == dto.AssentoId);

        if (assento == null)
            throw new Exception("Assento não encontrado.");

        var assentoOcupado = await _context.Ingressos
            .AnyAsync(i =>
                i.SessaoId == dto.SessaoId &&
                i.AssentoId == dto.AssentoId
            );

        if (assentoOcupado)
            throw new Exception("Assento indisponível.");

        var ingresso = new Ingresso
        {
            SessaoId = dto.SessaoId,
            AssentoId = dto.AssentoId,
            UsuarioId = dto.UsuarioId,
            ValorPago = 22m,
            TokenQrCode = Guid.NewGuid().ToString("N"),
            DataCompra = DateTime.Now,
            Utilizado = false
        };

        _context.Ingressos.Add(ingresso);

        await _context.SaveChangesAsync();

        ingresso.Sessao = sessao;
        ingresso.Assento = assento;
        ingresso.Usuario = usuario;

        return ConverterParaDTO(ingresso);
    }


    public async Task<List<IngressoResponseDTO>> ListarTodosAsync()
    {
        var ingressos = await _context.Ingressos
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .ToListAsync();

        return ingressos.Select(ConverterParaDTO).ToList();
    }


    public async Task<IngressoResponseDTO?> BuscarPorIdAsync(int id)
    {
        var ingresso = await _context.Ingressos
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (ingresso == null)
            return null;

        return ConverterParaDTO(ingresso);
    }


    public async Task<ValidacaoIngressoResponseDTO> ValidarAsync(ValidarIngressoDTO dto)
    {
        var ingresso = await _context.Ingressos
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .FirstOrDefaultAsync(i => i.TokenQrCode == dto.TokenQrCode);

        if (ingresso == null)
        {
            return new ValidacaoIngressoResponseDTO
            {
                Sucesso = false,
                Mensagem = "Ingresso não encontrado."
            };
        }

        if (ingresso.SessaoId != dto.SessaoId)
        {
            return new ValidacaoIngressoResponseDTO
            {
                Sucesso = false,
                Mensagem = "Este ingresso pertence a outra sessão."
            };
        }

        if (!ingresso.Sessao.Ativa)
        {
            return new ValidacaoIngressoResponseDTO
            {
                Sucesso = false,
                Mensagem = "A sessão está desativada."
            };
        }

        if (ingresso.Utilizado)
        {
            return new ValidacaoIngressoResponseDTO
            {
                Sucesso = false,
                Mensagem = "Este ingresso já foi utilizado."
            };
        }

        if (DateTime.Now < ingresso.Sessao.DataHora.AddMinutes(-30))
        {
            return new ValidacaoIngressoResponseDTO
            {
                Sucesso = false,
                Mensagem = "A sessão ainda não está liberada para entrada."
            };
        }

        ingresso.Utilizado = true;
        ingresso.DataUtilizacao = DateTime.Now;

        await _context.SaveChangesAsync();

        return new ValidacaoIngressoResponseDTO
        {
            Sucesso = true,
            Mensagem = "Entrada liberada."
        };
    }


    public async Task<bool> ExcluirAsync(int id)
    {
        var ingresso = await _context.Ingressos
            .FirstOrDefaultAsync(i => i.Id == id);

        if (ingresso == null)
            return false;

        _context.Ingressos.Remove(ingresso);

        await _context.SaveChangesAsync();

        return true;
    }


    private static IngressoResponseDTO ConverterParaDTO(Ingresso ingresso)
    {
        return new IngressoResponseDTO
        {
            Id = ingresso.Id,

            SessaoId = ingresso.SessaoId,

            Filme = ingresso.Sessao.Filme.Titulo,

            DataSessao = ingresso.Sessao.DataHora,

            AssentoId = ingresso.AssentoId,

            CodigoAssento = ingresso.Assento.Codigo,

            UsuarioId = ingresso.UsuarioId,

            Usuario = ingresso.Usuario.Nome,

            ValorPago = ingresso.ValorPago,

            TokenQrCode = ingresso.TokenQrCode,

            DataCompra = ingresso.DataCompra,

            Utilizado = ingresso.Utilizado,

            DataUtilizacao = ingresso.DataUtilizacao
        };
    }
}