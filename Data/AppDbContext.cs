using CinemaAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace CinemaAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Usuario> Usuarios { get; set; }

    public DbSet<Filme> Filmes { get; set; }

    public DbSet<Sessao> Sessoes { get; set; }

    public DbSet<Assento> Assentos { get; set; }

    public DbSet<Ingresso> Ingressos { get; set; }

    public DbSet<ValidacaoIngresso> ValidacoesIngresso { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Usuario>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Ingresso>()
            .HasIndex(i => new { i.SessaoId, i.AssentoId })
            .IsUnique();
    }
}