# Contrato do backend (extraido do frontend)

Gerado automaticamente a partir de `js/*.js`. Estado: `feito` = existe na migracao 001; `pendente` = ainda nao existe no servidor.

## RPCs chamadas com sb.rpc(...)

| Funcao | Parametros vistos | Estado |
|---|---|---|
| `acabamentos_do_lar` | - | pendente |
| `admin_alerta_visto` | p_id | pendente |
| `admin_alertas` | - | pendente |
| `admin_anuncios` | - | pendente |
| `admin_canal_lista` | - | pendente |
| `admin_cfb_casos` | p_so_recursos | pendente |
| `admin_conversao` | p_dias | pendente |
| `admin_denuncias` | - | pendente |
| `admin_economia` | - | pendente |
| `admin_estatisticas` | - | pendente |
| `admin_exposicao` | - | pendente |
| `admin_fin_aprovar` | p_id | pendente |
| `admin_fin_definicoes` | - | pendente |
| `admin_fin_despesa` | - | pendente |
| `admin_fin_despesa_anular` | p_id | pendente |
| `admin_fin_painel` | - | pendente |
| `admin_fin_propor` | p_mes | pendente |
| `admin_fin_publicar` | p_id | pendente |
| `admin_fin_simular` | p_ajustes, p_custo, p_mes | pendente |
| `admin_inicio` | - | pendente |
| `admin_jogador` | p_id | pendente |
| `admin_jogadores` | p_busca, p_filtro, p_ordem, p_pagina | pendente |
| `admin_loja` | - | pendente |
| `admin_manutencao` | p_em, p_minutos | pendente |
| `admin_pagamentos` | - | pendente |
| `admin_pagamentos_locais` | - | pendente |
| `admin_receitas` | p_dias | pendente |
| `admin_recursos_suspensao` | - | pendente |
| `admin_registo` | - | pendente |
| `admin_stats_jogo` | - | pendente |
| `admin_visitas` | - | pendente |
| `amigos_salas` | - | pendente |
| `apagar_post` | p_post | pendente |
| `aparelho_cheio` | p_disp | feito |
| `apreensao_pendente` | - | pendente |
| `arranque` | - | feito |
| `arranque_tudo` | p_disp, p_sessao, p_ua | feito |
| `aviso_manutencao` | - | feito |
| `aviso_visto` | p_aviso | pendente |
| `boleia_convidar` | p_destino, p_ids, p_meio | pendente |
| `cambio_hoje` | - | pendente |
| `casamento_por_decidir` | - | pendente |
| `cemiterio_campas` | - | pendente |
| `clima_hoje` | - | pendente |
| `comentar` | p_post, p_texto | pendente |
| `criar_personagem` | p_aparencia, p_disp, p_maior, p_nome | feito |
| `criar_sala_privada` | - | pendente |
| `desafio_meu` | p_id | pendente |
| `desafio_por_ver` | - | pendente |
| `desafio_resultado` | p_corrida, p_desafio | pendente |
| `desafio_transporte` | p_id, p_meio | pendente |
| `desp_confirmar_18` | - | pendente |
| `desp_estado` | - | pendente |
| `desp_minhas` | p_abertas | pendente |
| `dia_das_posses` | - | pendente |
| `dia_do_sugar` | - | pendente |
| `dia_dos_empregados` | - | pendente |
| `diario` | - | pendente |
| `empresa_contas` | p_id | pendente |
| `encontro_meu` | p_id | pendente |
| `encontro_por_ver` | - | pendente |
| `entrar_fila` | - | pendente |
| `enviar_dm` | p_para, p_texto | pendente |
| `enviar_mensagem` | p_texto | pendente |
| `escolher_sala` | p_amigo, p_fuso, p_lingua, p_sala | pendente |
| `esconder_da_lista_ricos` | p_esconder | pendente |
| `estado` | - | feito |
| `estado_bebes` | - | pendente |
| `filial_decidir` | p_empresa, p_opcao | pendente |
| `filial_estado` | p_empresa | pendente |
| `filial_inspecao` | p_empresa | pendente |
| `filial_licenca_ouro` | p_empresa | pendente |
| `gostar` | p_post | pendente |
| `grupos_resumo` | - | pendente |
| `guia_dia` | - | pendente |
| `guia_estado` | - | pendente |
| `guia_fim` | - | pendente |
| `guia_lembrar` | - | pendente |
| `guia_oferta_vista` | - | pendente |
| `guia_receber` | p_passo | pendente |
| `guia_saltar` | - | pendente |
| `irt_simular` | p_empresa, p_valor | pendente |
| `jetski_ranking` | - | pendente |
| `jogadores_hoje` | - | pendente |
| `jogo_mesa_comecar` | p_jogo | pendente |
| `jogos_hoje` | - | pendente |
| `jornal_semana` | - | pendente |
| `kart_mapa` | - | pendente |
| `kart_ranking` | - | pendente |
| `ler_dms` | p_de | pendente |
| `ludo_estado` | p_id | pendente |
| `marcar_origem` | p_origem | pendente |
| `meu_credito` | - | pendente |
| `meu_preco_kota` | - | pendente |
| `meus_convites` | - | pendente |
| `meus_impostos` | - | pendente |
| `meus_roubos` | - | pendente |
| `minha_entrega` | - | pendente |
| `minha_pena` | - | pendente |
| `minha_suspensao` | - | pendente |
| `minha_ultima_despedida` | - | pendente |
| `minhas_boleias` | - | pendente |
| `mobilia_lugar` | - | pendente |
| `moda_loja` | - | pendente |
| `mudar_aparencia` | p_aparencia | pendente |
| `mudar_nome` | p_nome | pendente |
| `nome_disponivel` | p_nome | feito |
| `objetivos` | - | pendente |
| `objetivos_tudo` | - | pendente |
| `pagamento_local_ativo` | - | feito |
| `pagar_com_ouro` | p_acao, p_args, p_simular | pendente |
| `pedir_amizade_email` | p_email | pendente |
| `pedir_pagamento_local` | p_pacote | pendente |
| `perfil_de` | p_id | pendente |
| `perguntar` | p_lingua, p_origem, p_texto | pendente |
| `pintar_movel` | p_cor, p_id | pendente |
| `protecao_visto` | - | pendente |
| `prov_estado` | - | pendente |
| `prov_medidas_lista` | - | pendente |
| `pulso` | p_estado, p_expo, p_sala, p_vistas | feito |
| `ranking` | - | pendente |
| `receber_encomendas` | - | pendente |
| `reclamar_sessao` | p_sessao | feito |
| `recorrer_suspensao` | p_texto | pendente |
| `registar_dispositivo` | p_disp, p_ua | feito |
| `registar_exposicao` | p_itens | pendente |
| `registar_toque` | p_id, p_tipo | pendente |
| `registo_criminal_de` | p_id | pendente |
| `responder_regresso` | p_outro, p_resposta | pendente |
| `salas_bairro` | - | pendente |
| `seguir_jogador` | p_alvo, p_sim | pendente |
| `tycoon_bonus` | p_empresa | pendente |
| `tycoon_completar` | p_empresa | pendente |
| `tycoon_compras_de` | p_chave | pendente |
| `tycoon_coroas` | p_jogador | pendente |
| `tycoon_guardar` | p_chave, p_estado | pendente |
| `tycoon_ler` | p_chave | pendente |
| `tycoon_ouro` | p_chave, p_item | pendente |
| `tycoon_problemas_de` | p_chave | pendente |
| `tycoon_ranking` | p_ambito, p_periodo, p_tipo | pendente |
| `tycoon_receber` | p_empresa, p_notas | pendente |
| `veiculos_do_lar` | - | pendente |
| `vida_boa_evento` | p_tipo | pendente |
| `vida_boa_visto` | - | pendente |

## Acoes chamadas com acao('...') (tambem sao RPCs)

| Acao | Parametros vistos | Estado |
|---|---|---|
| `acabar_sugar` | - | pendente |
| `aceitar_entrega` | - | pendente |
| `admin_acao_jogador` | p_acao, p_id, p_motivo, p_valor | pendente |
| `admin_canal_apagar` | p_id | pendente |
| `admin_canal_publicar` | - | pendente |
| `admin_cfb_decidir` | p_caso, p_devolver | pendente |
| `admin_decidir_suspensao` | p_id, p_levantar | pendente |
| `admin_tratar_pagamento` | p_confirmar, p_id | pendente |
| `adotar` | p_nome | pendente |
| `animal` | p_acao | pendente |
| `anunciar_imovel` | p_preco, p_prop, p_renda | pendente |
| `apostar` | p_escolha, p_jogo, p_valor | pendente |
| `apreensao_decidir` | p_escolha, p_id | pendente |
| `arranjar_sugar` | p_tipo | pendente |
| `arrendar_imovel` | p_prop | pendente |
| `banco` | p_acao, p_valor | pendente |
| `bloquear` | p_alvo, p_bloquear | pendente |
| `boleia_responder` | p_aceitar, p_id | pendente |
| `cadeia` | p_acao | pendente |
| `campanha` | p_tipo | pendente |
| `candidatar` | p_lema | pendente |
| `candidatar_empresa` | p_id | pendente |
| `casa_porta` | p_aberta | pendente |
| `casamento_anunciar` | p_outro, p_sim | pendente |
| `cemiterio_fantasmas` | - | pendente |
| `cemiterio_flores` | p_campa | pendente |
| `cfb_recorrer` | p_texto | pendente |
| `colher` | p_id | pendente |
| `colocar_movel` | p_andar, p_id, p_prop, p_rot, p_x, p_y | pendente |
| `comprar` | p_item | pendente |
| `comprar_acabamento` | p_carro, p_tipo, p_valor | pendente |
| `comprar_agua` | - | pendente |
| `comprar_armazem` | - | pendente |
| `comprar_bilhete` | p_numero | pendente |
| `comprar_casa` | p_casa, p_morar | pendente |
| `comprar_casa_ouro` | p_casa, p_morar | pendente |
| `comprar_com_ouro` | p_id, p_tipo | pendente |
| `comprar_imovel` | p_prop | pendente |
| `comprar_item_bebe` | p_item | pendente |
| `comprar_protecao` | p_dias | pendente |
| `comprar_seguro` | - | pendente |
| `comprar_vantagem` | p_tipo | pendente |
| `confirmar_maioridade` | - | pendente |
| `conta_casal` | p_valor | pendente |
| `contratar_ama` | p_dias, p_id | pendente |
| `contratar_empregado` | p_sim, p_tipo | pendente |
| `corrida` | - | pendente |
| `cozinhar2` | p_comida, p_estrelas, p_movel | pendente |
| `credito_pagar` | p_valor | pendente |
| `criar_empresa` | p_gasosa, p_nome, p_tipo | pendente |
| `criar_empresa_credito` | p_gasosa, p_nome, p_tipo | pendente |
| `criar_empresa_ouro` | p_gasosa, p_nome, p_tipo | pendente |
| `criar_grupo` | p_descricao, p_nome, p_tipo | pendente |
| `crime` | p_alvo, p_tipo | pendente |
| `cuidar_bebe` | p_acao, p_id | pendente |
| `cuidar_filho` | p_acao, p_id, p_valor | pendente |
| `cuidar_filho2` | p_acao, p_estrelas, p_id | pendente |
| `dar_festa` | - | pendente |
| `decidir` | p_id, p_opcao | pendente |
| `decidir_detencao` | p_escolha | pendente |
| `decorar` | p_chao, p_parede | pendente |
| `demitir_me` | - | pendente |
| `denunciar` | p_alvo, p_motivo, p_texto | pendente |
| `desfazer_amizade` | p_alvo | pendente |
| `desp_apostar` | p_sel, p_valor | pendente |
| `desp_cash_out` | p_aposta | pendente |
| `despedir` | p_jogador | pendente |
| `diario_bau` | - | pendente |
| `diario_gelo` | - | pendente |
| `diario_roda` | - | pendente |
| `dormir` | - | pendente |
| `empresa_filial` | p_id | pendente |
| `empresa_melhorar` | p_acao, p_id, p_valor | pendente |
| `encomendar_veiculo` | p_item | pendente |
| `encontro_transporte` | p_id, p_meio | pendente |
| `entrar_grupo` | p_entrar, p_grupo | pendente |
| `entregar_filho` | p_id, p_modo | pendente |
| `enviar_kumbu` | p_nome, p_valor | pendente |
| `escolher_ambicao` | p_id | pendente |
| `estudar` | p_curso, p_online, p_univ | pendente |
| `festejar` | p_anfitriao | pendente |
| `fugir_impostos` | p_fugir, p_id | pendente |
| `gerir_empresa` | p_acao, p_id, p_valor | pendente |
| `governar` | p_acao, p_servico, p_valor | pendente |
| `guardar_movel` | p_id | pendente |
| `influencer` | p_tipo | pendente |
| `interagir` | p_acao, p_alvo | pendente |
| `jetski_acabar` | p_corrida, p_duracao, p_moedas, p_pontos | pendente |
| `jetski_comecar` | p_escudo | pendente |
| `jetski_continuar` | p_corrida, p_duracao, p_moedas | pendente |
| `jogo_mesa_resultado` | p_ganhou, p_id | pendente |
| `kart_acabar` | p_acabou, p_corrida, p_posicao, p_tempo, p_voltas | pendente |
| `kart_comecar` | - | pendente |
| `ligar_familia` | - | pendente |
| `moda_desafio` | p_estrelas | pendente |
| `morar_juntos` | - | pendente |
| `mudar_aparencia` | p_aparencia | pendente |
| `mudar_nome` | p_nome | pendente |
| `mudar_para` | p_prop | pendente |
| `mudar_relacao` | p_acao, p_alvo | pendente |
| `ouro_recarga` | p_tipo | pendente |
| `pagar_com_ouro` | p_acao, p_args | pendente |
| `participar` | p_grupo | pendente |
| `pedir` | p_alvo, p_grau, p_tipo | pendente |
| `pedir_dinheiro_pais` | - | pendente |
| `pedir_promocao` | - | pendente |
| `penaltis` | p_estrelas | pendente |
| `plantar` | p_cultura | pendente |
| `policia` | p_acao | pendente |
| `por_fora_de_casa` | p_dono, p_visitante | pendente |
| `preparar_bebe` | p_cabelo, p_id, p_nome, p_pele | pendente |
| `processar` | p_motivo, p_reu, p_valor | pendente |
| `prov_candidatar` | p_mensagem, p_provincia | pendente |
| `prov_desviar` | p_valor | pendente |
| `prov_medida` | p_medida | pendente |
| `prov_nomear` | p_cargo, p_nome, p_salario | pendente |
| `prov_votar` | p_candidato, p_disp, p_eleicao | pendente |
| `publicar` | p_foto, p_texto | pendente |
| `queixa_roubo` | p_roubo | pendente |
| `queixar` | p_crime | pendente |
| `raspadinha` | - | pendente |
| `recolher` | p_i, p_id, p_tipo | pendente |
| `recolher_moveis` | - | pendente |
| `reformar` | - | pendente |
| `regar` | p_id | pendente |
| `responder_pedido` | p_aceitar, p_id | pendente |
| `responder_sms` | p_acao, p_id | pendente |
| `rezar` | - | pendente |
| `roubar_jogador` | p_valor, p_vitima | pendente |
| `roubar_movel` | p_id | pendente |
| `sair_empresa` | - | pendente |
| `terminar` | p_alvo | pendente |
| `testamento` | p_parte | pendente |
| `trabalhar_empresa` | p_id | pendente |
| `tratar` | p_onde | pendente |
| `treinar2` | p_estrelas, p_onde | pendente |
| `trocar` | p_acao, p_onde, p_usd | pendente |
| `usar_movel` | p_id | pendente |
| `vender_colheita` | p_cultura, p_sacos | pendente |
| `vender_imovel` | p_prop | pendente |
| `vender_item` | p_item | pendente |
| `vender_movel` | p_id | pendente |
| `viajar` | p_destino, p_meio | pendente |
| `votar` | p_candidato | pendente |
