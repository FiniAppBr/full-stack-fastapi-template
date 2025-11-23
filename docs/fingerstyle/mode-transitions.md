# Nina - Mode Transitions

```
                              ┌─────────────┐
                              │   conexao   │
                              └──────┬──────┘
                                     │ interesse morno/quente
                                     ▼
                              ┌─────────────┐
                              │  descoberta │
                              └──────┬──────┘
                                     │ skill + need identified
                                     ▼
                              ┌─────────────┐
                              │  validacao  │◄────────────┐
                              └──────┬──────┘             │
                                     │ name + interest    │ agreement
                                     ▼                    │
                              ┌─────────────┐      ┌──────┴──────┐
                              │apresentacao │      │  objection  │
                              └──────┬──────┘      └─────────────┘
                                     │                    ▲
                                     │ pronto comprar     │ objeção (from any)
                                     ▼                    │
                              ┌─────────────┐             │
                              │ fechamento  │─────────────┘
                              └──────┬──────┘
                                     │ comprou
                                     ▼
                              ┌─────────────┐
                              │ boasvindas  │
                              └─────────────┘
```

## Transitions

| From        | To          | Condition                          |
|-------------|-------------|-----------------------------------|
| conexao     | descoberta  | nivel_interesse = morno/quente    |
| descoberta  | validacao   | skill_identified + need_identified |
| validacao   | apresentacao| name_captured + interest_confirmed |
| any         | objection   | tipo_objecao detected             |
| objection   | validacao   | intent = agreement                |
| any         | fechamento  | intent = pronto_comprar           |
| fechamento  | boasvindas  | intent = comprou                  |
