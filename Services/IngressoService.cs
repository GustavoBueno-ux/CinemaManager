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


    public async Task<IngressoResponseDTO> CriarAsync(
        CriarIngressoDTO dto
    )
    {
        var sessao = await BuscarSessaoDisponivelAsync(
            dto.SessaoId
        );

        var usuario = await _context.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.Id == dto.UsuarioId
            );

        if (usuario is null)
        {
            throw new KeyNotFoundException(
                "Usuário não encontrado."
            );
        }

        var assento = await _context.Assentos
            .AsNoTracking()
            .FirstOrDefaultAsync(
                a => a.Id == dto.AssentoId
            );

        if (assento is null)
        {
            throw new KeyNotFoundException(
                "Assento não encontrado."
            );
        }

        var assentoOcupado = await _context.Ingressos
            .AsNoTracking()
            .AnyAsync(i =>
                i.SessaoId == dto.SessaoId &&
                i.AssentoId == dto.AssentoId
            );

        if (assentoOcupado)
        {
            throw new InvalidOperationException(
                "Assento indisponível."
            );
        }

        var agora = DateTime.Now;

        var venda = new Venda
        {
            DataHora = agora,
            FormaPagamento = null,
            OrigemVenda = OrigemVenda.Online,
            FuncionarioId = null,
            ValorTotal = sessao.PrecoIngresso
        };

        var ingresso = CriarIngresso(
            sessaoId: dto.SessaoId,
            assentoId: dto.AssentoId,
            usuarioId: dto.UsuarioId,
            valorPago: sessao.PrecoIngresso,
            dataCompra: agora,
            venda: venda
        );

        await _context.Vendas.AddAsync(venda);

        await _context.Ingressos.AddAsync(ingresso);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            _context.ChangeTracker.Clear();

            throw new InvalidOperationException(
                "O assento acabou de ser comprado por outro usuário."
            );
        }

        ingresso.Sessao = sessao;
        ingresso.Assento = assento;
        ingresso.Usuario = usuario;

        return ConverterParaDTO(ingresso);
    }


    public async Task<List<IngressoResponseDTO>> CriarEmLoteAsync(
        int usuarioId,
        CriarIngressosEmLoteDTO dto
    )
    {
        if (
            dto.AssentoIds is null ||
            dto.AssentoIds.Count == 0
        )
        {
            throw new ArgumentException(
                "Selecione pelo menos um assento."
            );
        }

        var assentoIds = dto.AssentoIds
            .Distinct()
            .ToList();

        if (assentoIds.Count != dto.AssentoIds.Count)
        {
            throw new ArgumentException(
                "Existem assentos repetidos na seleção."
            );
        }

        var agora = DateTime.Now;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            var sessao = await _context.Sessoes
                .AsNoTracking()
                .Include(s => s.Filme)
                .FirstOrDefaultAsync(
                    s => s.Id == dto.SessaoId
                );

            if (sessao is null)
            {
                throw new KeyNotFoundException(
                    "Sessão não encontrada."
                );
            }

            if (!sessao.Ativa)
            {
                throw new InvalidOperationException(
                    "Sessão desativada."
                );
            }

            if (agora > sessao.DataHora.AddMinutes(30))
            {
                throw new InvalidOperationException(
                    "O prazo para compra desta sessão foi encerrado."
                );
            }

            var usuario = await _context.Usuarios
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.Id == usuarioId
                );

            if (usuario is null)
            {
                throw new KeyNotFoundException(
                    "Usuário não encontrado."
                );
            }

            var assentos = await _context.Assentos
                .AsNoTracking()
                .Where(a =>
                    assentoIds.Contains(a.Id)
                )
                .ToListAsync();

            if (assentos.Count != assentoIds.Count)
            {
                throw new KeyNotFoundException(
                    "Um ou mais assentos não foram encontrados."
                );
            }

            var reservasValidas =
                await _context.ReservasAssentos
                    .Where(r =>
                        r.SessaoId == dto.SessaoId &&
                        r.UsuarioId == usuarioId &&
                        assentoIds.Contains(r.AssentoId) &&
                        r.ExpiraEm > agora
                    )
                    .ToListAsync();

            if (
                reservasValidas.Count !=
                assentoIds.Count
            )
            {
                throw new InvalidOperationException(
                    "Uma ou mais reservas expiraram ou não pertencem " +
                    "ao usuário. A compra não foi realizada."
                );
            }

            var assentosJaComprados =
                await _context.Ingressos
                    .AsNoTracking()
                    .AnyAsync(i =>
                        i.SessaoId == dto.SessaoId &&
                        assentoIds.Contains(i.AssentoId)
                    );

            if (assentosJaComprados)
            {
                throw new InvalidOperationException(
                    "Um ou mais assentos já foram comprados. " +
                    "A compra não foi realizada."
                );
            }

            var valorUnitario =
                sessao.PrecoIngresso;

            var valorTotal =
                valorUnitario * assentoIds.Count;

            var venda = new Venda
            {
                DataHora = agora,
                FormaPagamento = null,
                OrigemVenda = OrigemVenda.Online,
                FuncionarioId = null,
                ValorTotal = valorTotal
            };

            var ingressos = assentoIds
                .Select(assentoId =>
                    new Ingresso
                    {
                        Venda = venda,

                        SessaoId =
                            dto.SessaoId,

                        AssentoId =
                            assentoId,

                        UsuarioId =
                            usuarioId,

                        ValorPago =
                            valorUnitario,

                        TokenQrCode =
                            Guid.NewGuid()
                                .ToString("N"),

                        DataCompra =
                            agora,

                        Utilizado =
                            false,

                        DataUtilizacao =
                            null
                    }
                )
                .ToList();

            await _context.Vendas.AddAsync(venda);

            await _context.Ingressos
                .AddRangeAsync(ingressos);

            /*
             * A venda, os ingressos e a remoção
             * das reservas fazem parte da mesma
             * transação.
             */
            _context.ReservasAssentos.RemoveRange(
                reservasValidas
            );

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new InvalidOperationException(
                    "Um ou mais assentos acabaram de ser comprados " +
                    "por outro usuário. Nenhum ingresso foi gerado."
                );
            }

            await transaction.CommitAsync();

            var assentosPorId =
                assentos.ToDictionary(
                    a => a.Id
                );

            foreach (var ingresso in ingressos)
            {
                ingresso.Sessao = sessao;

                ingresso.Usuario = usuario;

                ingresso.Assento =
                    assentosPorId[
                        ingresso.AssentoId
                    ];
            }

            return ingressos
                .OrderBy(i => i.Assento.Codigo)
                .Select(ConverterParaDTO)
                .ToList();
        }
        catch
        {
            await transaction.RollbackAsync();

            _context.ChangeTracker.Clear();

            throw;
        }
    }


    public async Task<VendaBilheteriaResponseDTO>
        CriarVendaBilheteriaAsync(
            int funcionarioId,
            CriarVendaBilheteriaDTO dto
        )
    {
        if (
            dto.AssentoIds is null ||
            dto.AssentoIds.Count == 0
        )
        {
            throw new ArgumentException(
                "Selecione pelo menos um assento."
            );
        }

        var assentoIds = dto.AssentoIds
            .Distinct()
            .ToList();

        if (assentoIds.Count != dto.AssentoIds.Count)
        {
            throw new ArgumentException(
                "Existem assentos repetidos na seleção."
            );
        }

        if (
            !Enum.IsDefined(
                typeof(FormaPagamento),
                dto.FormaPagamento
            )
        )
        {
            throw new ArgumentException(
                "Forma de pagamento inválida."
            );
        }

        var agora = DateTime.Now;

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            /*
             * O FuncionarioId é obtido pelo JWT no controller.
             * Mesmo assim, validamos novamente no service para
             * não confiar apenas no atributo de autorização.
             */
            var funcionario = await _context.Usuarios
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    u => u.Id == funcionarioId
                );

            if (funcionario is null)
            {
                throw new KeyNotFoundException(
                    "Funcionário não encontrado."
                );
            }

            if (
                funcionario.TipoUsuario !=
                TipoUsuario.Funcionario
            )
            {
                throw new InvalidOperationException(
                    "O usuário autenticado não é um funcionário."
                );
            }

            var sessao = await _context.Sessoes
                .AsNoTracking()
                .Include(s => s.Filme)
                .FirstOrDefaultAsync(
                    s => s.Id == dto.SessaoId
                );

            if (sessao is null)
            {
                throw new KeyNotFoundException(
                    "Sessão não encontrada."
                );
            }

            if (!sessao.Ativa)
            {
                throw new InvalidOperationException(
                    "Sessão desativada."
                );
            }

            if (agora > sessao.DataHora.AddMinutes(30))
            {
                throw new InvalidOperationException(
                    "O prazo para venda desta sessão foi encerrado."
                );
            }

            var assentos = await _context.Assentos
                .AsNoTracking()
                .Where(a =>
                    assentoIds.Contains(a.Id)
                )
                .ToListAsync();

            if (assentos.Count != assentoIds.Count)
            {
                throw new KeyNotFoundException(
                    "Um ou mais assentos não foram encontrados."
                );
            }

            /*
             * O funcionário precisa ser o dono atual
             * das reservas dos assentos escolhidos.
             */
            var reservasValidas =
                await _context.ReservasAssentos
                    .Where(r =>
                        r.SessaoId == dto.SessaoId &&
                        r.UsuarioId == funcionarioId &&
                        assentoIds.Contains(r.AssentoId) &&
                        r.ExpiraEm > agora
                    )
                    .ToListAsync();

            if (
                reservasValidas.Count !=
                assentoIds.Count
            )
            {
                throw new InvalidOperationException(
                    "Uma ou mais reservas expiraram ou não pertencem " +
                    "ao funcionário. A venda não foi realizada."
                );
            }

            var assentosJaVendidos =
                await _context.Ingressos
                    .AsNoTracking()
                    .AnyAsync(i =>
                        i.SessaoId == dto.SessaoId &&
                        assentoIds.Contains(i.AssentoId)
                    );

            if (assentosJaVendidos)
            {
                throw new InvalidOperationException(
                    "Um ou mais assentos já foram vendidos. " +
                    "A venda não foi realizada."
                );
            }

            var cortesia =
                dto.FormaPagamento ==
                FormaPagamento.Cortesia;

            /*
             * O preço oficial sempre vem da sessão.
             *
             * Apenas uma cortesia substitui o valor
             * efetivamente pago por zero.
             */
            var valorUnitario =
                cortesia
                    ? 0m
                    : sessao.PrecoIngresso;

            var valorTotal =
                valorUnitario * assentoIds.Count;

            var venda = new Venda
            {
                DataHora = agora,

                FormaPagamento =
                    dto.FormaPagamento,

                OrigemVenda =
                    OrigemVenda.Bilheteria,

                FuncionarioId =
                    funcionarioId,

                ValorTotal =
                    valorTotal
            };

            var ingressos = assentoIds
                .Select(assentoId =>
                    new Ingresso
                    {
                        Venda = venda,

                        SessaoId =
                            dto.SessaoId,

                        AssentoId =
                            assentoId,

                        /*
                         * Venda presencial não possui
                         * cliente cadastrado associado.
                         */
                        UsuarioId =
                            null,

                        ValorPago =
                            valorUnitario,

                        TokenQrCode =
                            Guid.NewGuid()
                                .ToString("N"),

                        DataCompra =
                            agora,

                        Utilizado =
                            false,

                        DataUtilizacao =
                            null
                    }
                )
                .ToList();

            await _context.Vendas.AddAsync(venda);

            await _context.Ingressos
                .AddRangeAsync(ingressos);

            _context.ReservasAssentos.RemoveRange(
                reservasValidas
            );

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new InvalidOperationException(
                    "Um ou mais assentos acabaram de ser vendidos " +
                    "por outra operação. Nenhum ingresso foi gerado."
                );
            }

            await transaction.CommitAsync();

            var assentosPorId =
                assentos.ToDictionary(
                    a => a.Id
                );

            foreach (var ingresso in ingressos)
            {
                ingresso.Sessao = sessao;

                ingresso.Assento =
                    assentosPorId[
                        ingresso.AssentoId
                    ];

                /*
                 * Não atribuímos o funcionário a
                 * ingresso.Usuario.
                 *
                 * O funcionário pertence à Venda,
                 * não é o dono do ingresso.
                 */
                ingresso.Usuario = null;
            }

            var ingressosDto = ingressos
                .OrderBy(i => i.Assento.Codigo)
                .Select(ConverterParaDTO)
                .ToList();

            return new VendaBilheteriaResponseDTO
            {
                VendaId = venda.Id,

                FormaPagamento =
                    dto.FormaPagamento,

                ValorTotal =
                    valorTotal,

                Ingressos =
                    ingressosDto
            };
        }
        catch
        {
            await transaction.RollbackAsync();

            _context.ChangeTracker.Clear();

            throw;
        }
    }


    public async Task<List<IngressoResponseDTO>>
        ListarTodosAsync()
    {
        var ingressos = await _context.Ingressos
            .AsNoTracking()
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .OrderByDescending(i => i.DataCompra)
            .ToListAsync();

        return ingressos
            .Select(ConverterParaDTO)
            .ToList();
    }


    public async Task<List<IngressoResponseDTO>>
        ListarDoUsuarioAsync(
            int usuarioId
        )
    {
        var ingressos = await _context.Ingressos
            .AsNoTracking()
            .Where(i =>
                i.UsuarioId == usuarioId
            )
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .OrderByDescending(i => i.DataCompra)
            .ToListAsync();

        return ingressos
            .Select(ConverterParaDTO)
            .ToList();
    }


    public async Task<IngressoResponseDTO?>
        BuscarPorIdAsync(
            int ingressoId,
            int usuarioId
        )
    {
        var ingresso = await _context.Ingressos
            .AsNoTracking()
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .FirstOrDefaultAsync(i =>
                i.Id == ingressoId &&
                i.UsuarioId == usuarioId
            );

        return ingresso is null
            ? null
            : ConverterParaDTO(ingresso);
    }


    public async Task<ValidacaoIngressoResponseDTO>
        ValidarAsync(
            ValidarIngressoDTO dto
        )
    {
        var ingresso = await _context.Ingressos
            .Include(i => i.Sessao)
                .ThenInclude(s => s.Filme)
            .Include(i => i.Assento)
            .Include(i => i.Usuario)
            .FirstOrDefaultAsync(i =>
                i.TokenQrCode == dto.TokenQrCode
            );

        if (ingresso is null)
        {
            return CriarResultadoValidacao(
                false,
                "Ingresso não encontrado."
            );
        }

        if (ingresso.SessaoId != dto.SessaoId)
        {
            return CriarResultadoValidacao(
                false,
                "Este ingresso pertence a outra sessão."
            );
        }

        if (!ingresso.Sessao.Ativa)
        {
            return CriarResultadoValidacao(
                false,
                "A sessão já foi encerrada."
            );
        }

        if (ingresso.Utilizado)
        {
            return CriarResultadoValidacao(
                false,
                "Este ingresso já foi utilizado."
            );
        }

        var inicioLiberacao =
            ingresso.Sessao.DataHora
                .AddMinutes(-30);

        if (DateTime.Now < inicioLiberacao)
        {
            return CriarResultadoValidacao(
                false,
                "A sessão ainda não está liberada para entrada."
            );
        }

        ingresso.Utilizado = true;
        ingresso.DataUtilizacao = DateTime.Now;

        await _context.SaveChangesAsync();

        return CriarResultadoValidacao(
            true,
            "Entrada liberada."
        );
    }


    public async Task<bool> ExcluirAsync(
        int id
    )
    {
        var ingresso = await _context.Ingressos
            .FirstOrDefaultAsync(
                i => i.Id == id
            );

        if (ingresso is null)
        {
            return false;
        }

        _context.Ingressos.Remove(ingresso);

        await _context.SaveChangesAsync();

        return true;
    }


    private async Task<Sessao>
        BuscarSessaoDisponivelAsync(
            int sessaoId
        )
    {
        var sessao = await _context.Sessoes
            .AsNoTracking()
            .Include(s => s.Filme)
            .FirstOrDefaultAsync(
                s => s.Id == sessaoId
            );

        if (sessao is null)
        {
            throw new KeyNotFoundException(
                "Sessão não encontrada."
            );
        }

        if (!sessao.Ativa)
        {
            throw new InvalidOperationException(
                "Sessão desativada."
            );
        }

        var limiteCompra =
            sessao.DataHora.AddMinutes(30);

        if (DateTime.Now > limiteCompra)
        {
            throw new InvalidOperationException(
                "O prazo para compra desta sessão foi encerrado."
            );
        }

        return sessao;
    }


    private static Ingresso CriarIngresso(
        int sessaoId,
        int assentoId,
        int usuarioId,
        decimal valorPago,
        DateTime dataCompra,
        Venda venda
    )
    {
        return new Ingresso
        {
            Venda = venda,

            SessaoId = sessaoId,

            AssentoId = assentoId,

            UsuarioId = usuarioId,

            ValorPago = valorPago,

            TokenQrCode =
                Guid.NewGuid().ToString("N"),

            DataCompra = dataCompra,

            Utilizado = false,

            DataUtilizacao = null
        };
    }


    private static ValidacaoIngressoResponseDTO
        CriarResultadoValidacao(
            bool sucesso,
            string mensagem
        )
    {
        return new ValidacaoIngressoResponseDTO
        {
            Sucesso = sucesso,
            Mensagem = mensagem
        };
    }


    private static IngressoResponseDTO
        ConverterParaDTO(
            Ingresso ingresso
        )
    {
        return new IngressoResponseDTO
        {
            Id = ingresso.Id,

            SessaoId = ingresso.SessaoId,

            Filme =
                ingresso.Sessao.Filme.Titulo,

            DataSessao =
                ingresso.Sessao.DataHora,

            AssentoId =
                ingresso.AssentoId,

            CodigoAssento =
                ingresso.Assento.Codigo,

            UsuarioId =
                ingresso.UsuarioId,

            Usuario =
                ingresso.Usuario?.Nome,

            ValorPago =
                ingresso.ValorPago,

            TokenQrCode =
                ingresso.TokenQrCode,

            DataCompra =
                ingresso.DataCompra,

            Utilizado =
                ingresso.Utilizado,

            DataUtilizacao =
                ingresso.DataUtilizacao
        };
    }
}