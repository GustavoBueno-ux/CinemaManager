using CinemaAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(
        DbContextOptions<AppDbContext> options
    ) : base(options)
    {
    }


    // =========================================================
    // DBSETS
    // =========================================================

    public DbSet<Usuario> Usuarios { get; set; } = null!;

    public DbSet<Filme> Filmes { get; set; } = null!;

    public DbSet<Sessao> Sessoes { get; set; } = null!;

    public DbSet<Assento> Assentos { get; set; } = null!;

    public DbSet<Ingresso> Ingressos { get; set; } = null!;

    public DbSet<ReservaAssento> ReservasAssentos { get; set; } = null!;

    public DbSet<Venda> Vendas { get; set; } = null!;

    public DbSet<PedidoOnline> PedidosOnline { get; set; } = null!;

    public DbSet<PedidoOnlineAssento> PedidosOnlineAssentos { get; set; } = null!;


    // =========================================================
    // CONFIGURAÇÕES
    // =========================================================

    protected override void OnModelCreating(
        ModelBuilder modelBuilder
    )
    {
        base.OnModelCreating(modelBuilder);


        // =====================================================
        // USUÁRIO
        // =====================================================

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Email)
            .IsUnique();


        // =====================================================
        // INGRESSO
        // =====================================================

        modelBuilder.Entity<Ingresso>()
            .HasIndex(i => new
            {
                i.SessaoId,
                i.AssentoId
            })
            .IsUnique();

        modelBuilder.Entity<Ingresso>()
            .HasIndex(i => i.CodigoRecuperacao)
            .IsUnique();

        modelBuilder.Entity<Ingresso>()
            .HasOne(i => i.Venda)
            .WithMany(v => v.Ingressos)
            .HasForeignKey(i => i.VendaId)
            .OnDelete(DeleteBehavior.Restrict);


        // =====================================================
        // RESERVA DE ASSENTO
        // =====================================================

        modelBuilder.Entity<ReservaAssento>()
            .HasIndex(r => new
            {
                r.SessaoId,
                r.AssentoId
            })
            .IsUnique();

        modelBuilder.Entity<ReservaAssento>()
            .HasOne(r => r.Sessao)
            .WithMany()
            .HasForeignKey(r => r.SessaoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReservaAssento>()
            .HasOne(r => r.Assento)
            .WithMany()
            .HasForeignKey(r => r.AssentoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReservaAssento>()
            .HasOne(r => r.Usuario)
            .WithMany()
            .HasForeignKey(r => r.UsuarioId)
            .OnDelete(DeleteBehavior.Cascade);


        // =====================================================
        // VENDA
        // =====================================================

        modelBuilder.Entity<Venda>()
            .HasOne(v => v.Funcionario)
            .WithMany()
            .HasForeignKey(v => v.FuncionarioId)
            .OnDelete(DeleteBehavior.Restrict);


        // =====================================================
        // PEDIDO ONLINE
        // =====================================================

        modelBuilder.Entity<PedidoOnline>()
            .HasIndex(p => p.StripeCheckoutSessionId)
            .IsUnique();

        modelBuilder.Entity<PedidoOnline>()
            .HasIndex(p => p.StripePaymentIntentId)
            .IsUnique();

        modelBuilder.Entity<PedidoOnline>()
            .HasOne(p => p.Usuario)
            .WithMany()
            .HasForeignKey(p => p.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PedidoOnline>()
            .HasOne(p => p.Sessao)
            .WithMany()
            .HasForeignKey(p => p.SessaoId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PedidoOnline>()
            .HasOne(p => p.Venda)
            .WithMany()
            .HasForeignKey(p => p.VendaId)
            .OnDelete(DeleteBehavior.Restrict);


        // =====================================================
        // ASSENTOS DO PEDIDO ONLINE
        // =====================================================

        modelBuilder.Entity<PedidoOnlineAssento>()
            .HasIndex(pa => new
            {
                pa.PedidoOnlineId,
                pa.AssentoId
            })
            .IsUnique();

        modelBuilder.Entity<PedidoOnlineAssento>()
            .HasOne(pa => pa.PedidoOnline)
            .WithMany(p => p.Assentos)
            .HasForeignKey(pa => pa.PedidoOnlineId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PedidoOnlineAssento>()
            .HasOne(pa => pa.Assento)
            .WithMany()
            .HasForeignKey(pa => pa.AssentoId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}