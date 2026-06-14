using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CinemaAPI.Migrations
{
    /// <inheritdoc />
    public partial class RemovePrecosSessao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrecoInteira",
                table: "Sessoes");

            migrationBuilder.DropColumn(
                name: "PrecoMeia",
                table: "Sessoes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PrecoInteira",
                table: "Sessoes",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "PrecoMeia",
                table: "Sessoes",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);
        }
    }
}
