# Primeiro administrador

Não há endpoint público para criar um Admin. Depois de aplicar a migration, promova manualmente um funcionário existente no banco de produção:

```sql
UPDATE Usuarios
SET TipoUsuario = 3, Ativo = 1
WHERE Email = 'funcionario-existente@exemplo.com'
  AND TipoUsuario = 2;
```

Substitua o e-mail pelo funcionário correto e confirme que exatamente um registro foi alterado. A partir daí, esse Admin pode cadastrar e promover os demais membros pela API `api/Equipe`.
