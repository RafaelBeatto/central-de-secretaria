# Documentação — Central da Secretaria APAE

Comece por aqui se você é uma pessoa **ou uma IA** assumindo o projeto.

| Documento | Para quê |
|---|---|
| [HANDOFF.md](HANDOFF.md) | **Leia primeiro.** Regras do dono do projeto, decisões já aprovadas, estado atual, próximo passo exato, como rodar e armadilhas conhecidas. |
| [MAPA_DE_CODIGO.md](MAPA_DE_CODIGO.md) | Onde fica cada coisa no `back/` e no `front/`, rotas da API, schemas e tabelas, componentes reaproveitáveis. |
| [MAPA_DE_USABILIDADE.md](MAPA_DE_USABILIDADE.md) | Telas, rotas, quem vê o quê, fluxos principais e a especificação funcional de cada módulo do sistema antigo (`old/`) que ainda será migrado. |

| [melhorias/](melhorias/README.md) | O que cada módulo migrado **melhorou/mudou** em relação ao sistema antigo (um arquivo por módulo). |

Instrução curta para uma IA continuar:

> Leia `docs/HANDOFF.md` inteiro, depois `docs/MAPA_DE_CODIGO.md` e a seção do próximo módulo em
> `docs/MAPA_DE_USABILIDADE.md`. Siga a seção "Próximo passo" do HANDOFF. Não altere `old/` nem `basefront/`.
> Ao terminar cada módulo, atualize a seção "Estado atual" do HANDOFF, os dois mapas e crie `melhorias/modulo-NN-*.md`.
