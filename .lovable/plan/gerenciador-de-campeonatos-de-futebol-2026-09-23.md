# Gerenciador de Campeonatos de Futebol

Aplicativo web com visual de app de celular (modo escuro, estilo Material 3), com login e dados salvos na nuvem. Regras iguais às do Brasileirão Série A.

## Como funciona para o organizador

1. Cria a conta e entra.
2. Cria um campeonato, escolhendo turno único ou turno e returno.
3. Cadastra os times (nome, escudo, cor) e os jogadores (nome, posição, número).
4. Gera as rodadas automaticamente.
5. Em cada jogo, lança o placar, quem fez os gols, quem deu as assistências e os cartões.
6. Ao finalizar a partida, a tabela, a artilharia e as suspensões se atualizam sozinhas.

## Telas (barra inferior de navegação)

- **Tabela**: classificação com P, J, V, E, D, GP, GC, SG e % de aproveitamento; cores para as faixas (líder, G4, rebaixamento).
- **Partidas**: rodadas, jogos pendentes e encerrados, e a tela de súmula para lançar tudo.
- **Times**: lista de clubes, elenco de cada um com gols, assistências, cartões e selo de suspensão (🔴 suspenso / 🟢 liberado).
- **Rankings**: artilheiros, assistências, e listas de cartões amarelos e vermelhos.

Além disso: tela de entrada/cadastro, e tela inicial de escolha/criação de campeonato.

## Regras aplicadas

- Vitória 3, empate 1, derrota 0.
- Desempate na ordem: vitórias → saldo de gols → gols pró → confronto direto (só quando são exatamente 2 times) → menos vermelhos → menos amarelos → sorteio (estável, sempre igual para o mesmo campeonato).
- 3 amarelos acumulados = 1 jogo de suspensão; vermelho direto = 1 jogo de suspensão. O contador de amarelos zera quando a suspensão é cumprida.
- Na súmula, jogadores suspensos aparecem bloqueados para escalação naquele jogo.

## Detalhes técnicos

Banco de dados (Lovable Cloud), com acesso restrito ao dono do campeonato:

- `championships` (dono, nome, formato turno/returno, temporada)
- `teams` (campeonato, nome, escudo, cor)
- `players` (time, nome, posição, número)
- `matches` (campeonato, rodada, mandante, visitante, gols, status, data)
- `goals` (partida, jogador, time, minuto, jogador da assistência, contra o próprio gol)
- `cards` (partida, jogador, time, tipo amarelo/vermelho, minuto)
- `suspensions` (jogador, motivo, jogos a cumprir, cumprida)

Imagens dos escudos em armazenamento de arquivos na nuvem.

Classificação e rankings calculados a partir das partidas encerradas, com a função de ordenação implementando os critérios de desempate na ordem exata acima (confronto direto avaliado somente em empates de dois times). Lançamento de súmula feito no servidor, em uma única operação, para manter placar, gols, assistências, cartões e suspensões consistentes.

Estrutura: rotas protegidas por login, camada de dados com TanStack Query, componentes de UI shadcn ajustados para tema escuro e alvo de toque grande. Depois de pronto e publicado, o app pode ser instalado no celular; para a Play Store seria preciso um empacotamento à parte.

## Etapas

1. Ativar backend na nuvem, login por e-mail/senha e Google, tabelas e regras de acesso.
2. Tema escuro, navegação inferior e estrutura das telas.
3. Cadastro de campeonato, times e jogadores.
4. Geração de rodadas e lista de partidas.
5. Súmula completa com gols, assistências e cartões.
6. Tabela com desempates, rankings e selos de suspensão.
