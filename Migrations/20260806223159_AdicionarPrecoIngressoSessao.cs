using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CinemaAPI.Migrations
{
    public partial class AdicionarPrecoIngressoSessao : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PrecoIngresso",
                table: "Sessoes",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 22.00m);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrecoIngresso",
                table: "Sessoes");
        }
    }
}