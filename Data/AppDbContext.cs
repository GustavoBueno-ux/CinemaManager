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

    public DbSet<Usuario> Usuarios { get; set; } = null!;

    public DbSet<Filme> Filmes { get; set; } = null!;

    public DbSet<Sessao> Sessoes { get; set; } = null!;

    public DbSet<Assento> Assentos { get; set; } = null!;

    public DbSet<Ingresso> Ingressos { get; set; } = null!;

    public DbSet<ReservaAssento> ReservasAssentos { get; set; } = null!;

    public DbSet<Venda> Vendas { get; set; } = null!;

    protected override void OnModelCreating(
        ModelBuilder modelBuilder
    )
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Email)
            .IsUnique();

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

        modelBuilder.Entity<Ingresso>()
            .HasOne(i => i.Venda)
            .WithMany(v => v.Ingressos)
            .HasForeignKey(i => i.VendaId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Venda>()
            .HasOne(v => v.Funcionario)
            .WithMany()
            .HasForeignKey(v => v.FuncionarioId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}