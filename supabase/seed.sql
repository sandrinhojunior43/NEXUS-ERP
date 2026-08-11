-- =============================================================================
-- NEXUS ERP — dados de demonstração (empresa fictícia NEXUS AUTOMOTIVE SOLUTIONS)
--
-- Este seed cobre os dados de negócio (não depende de auth.users). Os usuários
-- de demonstração precisam ser criados separadamente pelo Supabase Auth
-- (Studio → Authentication → Add user, ou `supabase auth admin create-user`),
-- porque senhas só podem ser definidas com segurança pela API de Auth, não
-- por INSERT direto em auth.users. Depois de criar os usuários, promova os
-- papéis com o UPDATE no final deste arquivo (ajuste os e-mails).
--
-- Rodar com: supabase db reset   (aplica migrations + este seed)
-- ou:        psql "$DATABASE_URL" -f supabase/seed.sql
-- =============================================================================

begin;

insert into empresa (razao, fantasia, cnpj, ie, logradouro, numero, bairro, municipio, uf, cep, fone,
  regime, segmento, contribuinte_ipi, serie_nfe, proximo_numero_nfe, aliq_icms_interna, aliq_pis, aliq_cofins)
values ('NEXUS AUTOMOTIVE SOLUTIONS LTDA', 'Nexus Automotive', '12.345.678/0001-90', '114.256.789.110',
  'Rodovia SP-340, km 158', '2400', 'Distrito Industrial', 'Mogi Mirim', 'SP', '13803-000', '19 3862-4400',
  'presumido', 'ambos', true, 1, 1, 18, 0.65, 3.00);

-- ---- Plano de contas (estrutura fixa de partida dobrada) --------------------
insert into chart_of_accounts (codigo, nome, tipo, natureza, sintetica, pai_codigo, sistema) values
  ('1',     'ATIVO',                                     'ativo',   'devedora', true,  null, true),
  ('1.1',   'Ativo Circulante',                           'ativo',   'devedora', true,  '1',  true),
  ('1.1.1', 'Caixa e Bancos',                              'ativo',   'devedora', false, '1.1',true),
  ('1.1.2', 'Clientes a Receber',                          'ativo',   'devedora', false, '1.1',true),
  ('1.1.3', 'Estoque de Matéria-Prima',                    'ativo',   'devedora', false, '1.1',true),
  ('1.1.4', 'Estoque de Produtos Acabados',                'ativo',   'devedora', false, '1.1',true),
  ('1.2',   'Ativo Não Circulante',                        'ativo',   'devedora', true,  '1',  true),
  ('1.2.1', 'Imobilizado',                                 'ativo',   'devedora', false, '1.2',true),
  ('2',     'PASSIVO',                                     'passivo', 'credora',  true,  null, true),
  ('2.1',   'Passivo Circulante',                          'passivo', 'credora',  true,  '2',  true),
  ('2.1.1', 'Fornecedores a Pagar',                        'passivo', 'credora',  false, '2.1',true),
  ('2.1.2', 'Obrigações Trabalhistas a Pagar',             'passivo', 'credora',  false, '2.1',true),
  ('2.1.3', 'ICMS a Recolher',                             'passivo', 'credora',  false, '2.1',true),
  ('2.1.4', 'IPI a Recolher',                              'passivo', 'credora',  false, '2.1',true),
  ('2.1.5', 'PIS e COFINS a Recolher',                     'passivo', 'credora',  false, '2.1',true),
  ('3',     'PATRIMÔNIO LÍQUIDO',                          'pl',      'credora',  true,  null, true),
  ('3.1',   'Capital Social',                              'pl',      'credora',  false, '3',  true),
  ('3.2',   'Lucros ou Prejuízos Acumulados',               'pl',      'credora',  false, '3',  true),
  ('4',     'RECEITAS',                                    'receita', 'credora',  true,  null, true),
  ('4.1',   'Receita Bruta de Vendas',                     'receita', 'credora',  false, '4',  true),
  ('4.2',   'Deduções da Receita (ICMS/PIS/COFINS)',       'receita', 'devedora', false, '4',  true),
  ('4.3',   'Devoluções de Vendas',                        'receita', 'devedora', false, '4',  true),
  ('5',     'CUSTOS',                                      'custo',   'devedora', true,  null, true),
  ('5.1',   'Custo da Mercadoria Vendida (CMV)',           'custo',   'devedora', false, '5',  true),
  ('6',     'DESPESAS',                                    'despesa', 'devedora', true,  null, true),
  ('6.1',   'Despesas com Pessoal',                        'despesa', 'devedora', false, '6',  true),
  ('6.2',   'Despesas Administrativas',                    'despesa', 'devedora', false, '6',  true),
  ('6.3',   'Despesas Financeiras',                        'despesa', 'devedora', false, '6',  true);

-- ---- Departamentos -----------------------------------------------------------
insert into departments (code, name, orcamento) values
  ('DIR','Diretoria',180000), ('IND','Industrial',420000), ('QUA','Qualidade',95000),
  ('SUP','Suprimentos',110000), ('COM','Comercial',260000), ('FIN','Financeiro',88000),
  ('ADM','Administrativo',72000), ('LOG','Logística',140000);

-- ---- Funcionários -------------------------------------------------------------
insert into employees (code, name, cpf, cargo, dept_id, admissao, salario, status, email, phone) values
  ('MAT0001','Sandro Aparecido','111.222.333-44','Diretor Industrial',(select id from departments where code='DIR'),current_date-2000,14880,'ativo','sandro.aparecido@nexus.com','19 99100-2001'),
  ('MAT0002','Renata Miquelin','222.333.444-55','Gerente de Produção',(select id from departments where code='IND'),current_date-1500,8520,'ativo','renata.miquelin@nexus.com','19 99100-2002'),
  ('MAT0003','Otávio Bertoldi','333.444.555-66','Supervisor de Usinagem',(select id from departments where code='IND'),current_date-1200,5160,'ativo','otavio.bertoldi@nexus.com','19 99100-2003'),
  ('MAT0004','André Nakamura','444.555.666-77','Coordenador da Qualidade',(select id from departments where code='QUA'),current_date-900,6900,'ativo','andre.nakamura@nexus.com','19 99100-2004'),
  ('MAT0005','Fernanda Callado','555.666.777-88','Gerente de Suprimentos',(select id from departments where code='SUP'),current_date-1100,8280,'ativo','fernanda.callado@nexus.com','19 99100-2005'),
  ('MAT0006','Marcelo Ibrahim','666.777.888-99','Gerente Comercial',(select id from departments where code='COM'),current_date-1300,9360,'ativo','marcelo.ibrahim@nexus.com','19 99100-2006'),
  ('MAT0007','Larissa Ventura','777.888.999-00','Executiva de Contas',(select id from departments where code='COM'),current_date-700,4320,'ativo','larissa.ventura@nexus.com','19 99100-2007'),
  ('MAT0008','Helena Prado','888.999.000-11','Controller',(select id from departments where code='FIN'),current_date-1600,9840,'ativo','helena.prado@nexus.com','19 99100-2008'),
  ('MAT0009','Camila Ferrão','999.000.111-22','Coordenadora de Logística',(select id from departments where code='LOG'),current_date-800,6180,'ativo','camila.ferrao@nexus.com','19 99100-2009'),
  ('MAT0010','Gustavo Peixoto','000.111.222-33','Conferente de Expedição',(select id from departments where code='LOG'),current_date-500,1920,'ativo','gustavo.peixoto@nexus.com','19 99100-2010');

update departments set responsavel_id = (select id from employees where name='Sandro Aparecido') where code='DIR';
update departments set responsavel_id = (select id from employees where name='Renata Miquelin') where code='IND';
update departments set responsavel_id = (select id from employees where name='André Nakamura') where code='QUA';
update departments set responsavel_id = (select id from employees where name='Fernanda Callado') where code='SUP';
update departments set responsavel_id = (select id from employees where name='Marcelo Ibrahim') where code='COM';
update departments set responsavel_id = (select id from employees where name='Helena Prado') where code='FIN';
update departments set responsavel_id = (select id from employees where name='Camila Ferrão') where code='LOG';

-- ---- Fornecedores / Clientes ---------------------------------------------------
insert into suppliers (code, name, cnpj, city, uf, phone, email, lead_time_dias) values
  ('FOR0001','Metalúrgica Paulista Ltda','45.123.456/0001-78','São Paulo','SP','11 3255-4400','comercial@metalurgicapaulista.com.br',7),
  ('FOR0002','Aços Campinas S/A','52.234.567/0001-89','Campinas','SP','19 3722-1180','comercial@acoscampinas.com.br',12),
  ('FOR0003','Poliplast Indústria','63.345.678/0001-90','Jundiaí','SP','11 4587-2200','comercial@poliplast.com.br',18),
  ('FOR0004','Rolamentos Bragança','74.456.789/0001-01','Bragança Paulista','SP','11 4033-9090','comercial@rolamentosbraganca.com.br',10),
  ('FOR0005','Cobre Fios do Brasil','85.567.890/0001-12','Sorocaba','SP','15 3221-7700','comercial@cobrefios.com.br',25),
  ('FOR0006','Tratamento Térmico Vale','96.678.901/0001-23','Mogi Guaçu','SP','19 3841-5500','comercial@tratamentovale.com.br',15);

insert into customers (code, name, cnpj, ie, city, uf, phone, email) values
  ('CLI0001','Autopeças Central','21.345.678/0001-90','123.456.789.110','Ribeirão Preto','SP','16 3610-2200','compras@autopecascentral.com.br'),
  ('CLI0002','Distribuidora RodaBrasil','32.456.789/0001-01','234.567.890.221','Curitiba','PR','41 3322-8800','compras@rodabrasil.com.br'),
  ('CLI0003','Oficina Rede Motriz','43.567.890/0001-12','345.678.901.332','Campinas','SP','19 3234-1100','compras@redemotriz.com.br'),
  ('CLI0004','MegaParts Distribuição','54.678.901/0001-23','456.789.012.443','Belo Horizonte','MG','31 3271-4400','compras@megaparts.com.br'),
  ('CLI0005','Comercial São Jorge','65.789.012/0001-34','567.890.123.554','Santos','SP','13 3221-6600','compras@saojorge.com.br'),
  ('CLI0006','Grupo Andrade Veículos','76.890.123/0001-45','678.901.234.665','São José dos Campos','SP','12 3921-3300','compras@grupoandrade.com.br'),
  ('CLI0007','Peças & Cia Norte','87.901.234/0001-56','789.012.345.776','Goiânia','GO','62 3212-9900','compras@pecasecianorte.com.br');

-- ---- Depósitos -------------------------------------------------------------
insert into warehouses (code, nome, aceita, descricao, principal, ativo) values
  ('ALM','Almoxarifado central','materia','Recebimento e guarda de matéria-prima', true, true),
  ('PRD','Estoque de processo','materia','Material liberado para as células de produção', false, true),
  ('ACB','Produto acabado','produto','Peças prontas aguardando expedição', true, true),
  ('EXP','Área de expedição','produto','Separado e conferido, pronto para embarque', false, true),
  ('QUA','Quarentena','ambos','Material bloqueado aguardando decisão da qualidade', false, true);

-- ---- Centros de trabalho -----------------------------------------------------
insert into work_centers (nome, capacidade_diaria_horas) values
  ('Usinagem',16), ('Prensagem',16), ('Injeção',24), ('Montagem',24), ('Acabamento',8), ('Inspeção',8);

-- ---- Matérias-primas -----------------------------------------------------------
insert into inventory_items (sku, description, category, type, quantity, min_quantity, unit_price, supplier_id, ncm, unidade, controla_lote) values
  ('MP00001','Chapa de aço SAE 1020','Motor','materia',620,200,42.30,(select id from suppliers where code='FOR0001'),'7208.10.00','KG',true),
  ('MP00002','Barra de alumínio 6061','Motor','materia',480,300,68.90,(select id from suppliers where code='FOR0001'),'7604.29.20','KG',true),
  ('MP00003','Resina fenólica','Freios','materia',540,250,31.40,(select id from suppliers where code='FOR0003'),'3909.40.19','KG',true),
  ('MP00004','Fibra cerâmica','Freios','materia',390,180,55.10,(select id from suppliers where code='FOR0003'),'6806.10.10','KG',true),
  ('MP00005','Arame de mola SAE 9254','Suspensão','materia',700,220,47.60,(select id from suppliers where code='FOR0002'),'7217.10.19','KG',true),
  ('MP00006','Tubo de aço trefilado','Suspensão','materia',610,240,38.20,(select id from suppliers where code='FOR0002'),'7304.31.10','KG',true),
  ('MP00007','Rolamento esférico','Transmissão','materia',900,260,22.80,(select id from suppliers where code='FOR0004'),'8482.10.90','PC',true),
  ('MP00008','Fio de cobre esmaltado','Elétrica','materia',430,200,63.50,(select id from suppliers where code='FOR0005'),'8544.11.00','KG',true);

-- ---- Produtos acabados -----------------------------------------------------
insert into inventory_items (sku, description, category, type, quantity, min_quantity, unit_price, ncm, unidade, aliq_ipi, controla_lote) values
  ('PA00001','Pastilha de freio dianteira','Freios','produto',180,60,142.50,'8708.30.90','PC',10,true),
  ('PA00002','Disco de freio ventilado','Freios','produto',150,60,198.00,'8708.30.90','PC',10,true),
  ('PA00003','Cilindro mestre','Freios','produto',90,60,265.00,'8708.30.90','PC',10,true),
  ('PA00004','Amortecedor dianteiro','Suspensão','produto',130,60,310.00,'8708.80.00','PC',10,true),
  ('PA00005','Mola helicoidal','Suspensão','produto',110,60,175.00,'8708.80.00','PC',10,true),
  ('PA00006','Pistão forjado','Motor','produto',200,60,215.00,'8409.91.90','PC',5,true),
  ('PA00007','Junta do cabeçote','Motor','produto',170,60,98.00,'8409.91.90','PC',5,true),
  ('PA00008','Kit de embreagem','Transmissão','produto',95,60,340.00,'8708.40.90','PC',10,true),
  ('PA00009','Rolamento de roda','Transmissão','produto',220,60,88.00,'8708.40.90','PC',10,true),
  ('PA00010','Alternador 90A','Elétrica','produto',80,60,420.00,'8511.50.90','PC',5,true);

-- ---- Saldos iniciais nos depósitos ------------------------------------------
insert into stock_balances (item_id, warehouse_id, quantity)
  select id, (select id from warehouses where code='ALM'), quantity from inventory_items where type='materia';
insert into stock_balances (item_id, warehouse_id, quantity)
  select id, (select id from warehouses where code='ACB'), quantity from inventory_items where type='produto';

-- ---- Fichas técnicas (BOM) simplificadas ------------------------------------
insert into boms (product_id, versao, ativa)
  select id, 1, true from inventory_items where type='produto';

insert into bom_lines (bom_id, item_id, quantity, perda_pct)
  select b.id, m.id, 1.5, 2.0
  from boms b
  join inventory_items p on p.id = b.product_id
  join inventory_items m on m.category = p.category and m.type = 'materia'
  where m.id = (select id from inventory_items mm where mm.category = p.category and mm.type='materia' order by mm.sku limit 1);

insert into bom_operations (bom_id, seq, work_center_id, tempo_min, custo_hora)
  select b.id, 10, (select id from work_centers where nome='Montagem'), 5, 46
  from boms b;

-- ---- Requisições de compra financeiras e demais lançamentos ficam a cargo --
-- ---- do uso normal do sistema — o seed cobre o cadastro básico para o app
-- ---- não abrir vazio. Ordens de produção, compras e vendas de exemplo:
insert into production_orders (code, product_id, bom_id, quantity, machine, progress, status, due_at, stock_applied)
select next_code('OP'), p.id, b.id, 100, 'CNC-01', 100, 'concluida', current_date - 5, true
from inventory_items p join boms b on b.product_id = p.id
where p.sku in ('PA00001','PA00002','PA00006');

insert into purchases (code, supplier_id, status, expected_at, stock_applied)
values
  (next_code('PC'), (select id from suppliers where code='FOR0001'), 'recebido', current_date - 10, true),
  (next_code('PC'), (select id from suppliers where code='FOR0002'), 'enviado', current_date + 5, false);

insert into purchase_lines (purchase_id, item_id, quantity, unit_price)
select p.id, i.id, 200, i.unit_price * 0.9
from purchases p, inventory_items i
where p.code = (select code from purchases order by created_at limit 1) and i.sku = 'MP00001';

insert into sales (code, customer_id, status, stock_applied)
values
  (next_code('PV'), (select id from customers where code='CLI0001'), 'faturado', true),
  (next_code('PV'), (select id from customers where code='CLI0002'), 'aberto', false);

insert into sales_lines (sale_id, item_id, quantity, unit_price)
select s.id, i.id, 40, i.unit_price * 1.05
from sales s, inventory_items i
where s.code = (select code from sales order by created_at limit 1) and i.sku = 'PA00001';

insert into financial_entries (code, type, description, amount, due_at, ref_type, ref_id)
select next_code('FIN'), 'pagar', 'Compra ' || p.code, coalesce((select sum(quantity*unit_price) from purchase_lines where purchase_id=p.id),0), current_date + 20, 'compra', p.id
from purchases p where p.status = 'recebido';

insert into financial_entries (code, type, description, amount, due_at, ref_type, ref_id)
select next_code('FIN'), 'receber', 'Venda ' || s.code, coalesce((select sum(quantity*unit_price) from sales_lines where sale_id=s.id),0), current_date + 25, 'venda', s.id
from sales s where s.status = 'faturado';

commit;

-- =============================================================================
-- Após criar os usuários de demonstração no Supabase Auth (mesmo e-mail),
-- promova os papéis (o trigger handle_new_user já criou o profile como
-- 'consulta'):
--
--   update profiles set role = 'administrador', name = 'Sandro Aparecido' where email = 'sandro03junior@gmail.com';
--   update profiles set role = 'gerente',       name = 'Gerente Demonstração' where email = 'gerente@nexus.com';
--   update profiles set role = 'operador',      name = 'Operador Demonstração' where email = 'operador@nexus.com';
--   update profiles set role = 'consulta',      name = 'Consulta Demonstração' where email = 'consulta@nexus.com';
-- =============================================================================
