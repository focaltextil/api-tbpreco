import express from 'express';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
const app = express();

// --------------------------------------------------------------------------------------
// CONFIGURAÇÕES
app.use(cors());
app.use(express.json());

// --------------------------------------------------------------------------------------
// CRENDENCIAL
const pool = new Pool({
  user: 'postgres',
  host: 'nobly-spicy-chaffinch.data-1.use1.tembo.io',
  database: 'postgres',
  password: 'EfC88UIqHuDcyGC9',
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});


// --------------------------------------------------------------------------------------
// PERMISSOES DO SITE
const corsOptions = {
    origin: "*",
    methods: 'GET,POST',
  };
  
  app.use(cors(corsOptions));

// --------------------------------------------------------------------------------------
// TABELA DE PEDIDOS

async function GetPedidos() {
    try {
      const client = await pool.connect();
      const result = await client.query('select * from tembo."pedidos"');
  
      const dadosArray = result.rows;
      client.release();
      return dadosArray;
    } catch (error) {
      console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
      return [];
    }
  }
  
  app.get('/orders', async (req, res) => {
    const dadosArray = await GetPedidos();
    res.json(dadosArray);
  
  });


// ----------------------------------------------------------------------------------------
// FAZER O INSERT DOS PEDIDOS DA FIMEC

app.post('/order_input', async (req, res) => {
  const itens = req.body;
  const client = await pool.connect();

  try {
      await client.query('BEGIN');

      const { rows } = await client.query("SELECT nextval('tembo.documento_seq') as doc_num");
      const docNum = rows[0].doc_num;

      const itemQuery = `
          INSERT INTO tembo."pedidos" 
          ("DOC_N", "data", "cliente", "cnpj", "endereco", "cidade", "uf", "cep", "nome_contato", 
          "telefone", "representante", "codigo", "produto", "qtd", "obs_item", "obs_pedido", "status","metodo_pagamento") 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Aguardando Digitação', $17);
      `;

      // Inserindo cada item do array
      for (let item of itens) {
          const itemValues = [
              docNum,    
              item.data,
              item.cliente,
              item.cnpj,
              item.endereco,
              item.cidade,
              item.uf,
              item.cep,
              item.nome_contato,
              item.telefone,
              item.representante,
              item.codigo,
              item.produto,
              item.qtd,
              item.obs_item,
              item.obs_pedido,
              item.metodo_pagamento,
          ];

          await client.query(itemQuery, itemValues);
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Pedido inserido com sucesso!' });
  } catch (error) {
      await client.query('ROLLBACK');
      console.error("Erro ao inserir Pedido", error);
      res.status(500).json({ error: "Erro ao inserir Pedido." });
  } finally {
      client.release();
  }
});

// --------------------------------------------------------------------------------------
// TABELA DA AGENDA

async function GetAgenda() {
  try {
    const client = await pool.connect();
    const result = await client.query('select * from tembo."agenda"');

    const dadosArray = result.rows;
    client.release();
    return dadosArray;
  } catch (error) {
    console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
    return [];
  }
}

app.get('/horarios', async (req, res) => {
  const dadosArray = await GetAgenda();
  res.json(dadosArray);

});

// ----------------------------------------------------------------------------------------
// INSERIR RESERVA

app.post('/reserva_input', async (req, res) => {
  const itens = req.body;
  const client = await pool.connect();

  try {
      await client.query('BEGIN');


      const { rows } = await client.query("SELECT nextval('tembo.salas_id_seq') as id");
      const docNum = rows[0].id;

      const itemQuery = `
          INSERT INTO tembo.salas 
          (sala, nome, data, hora_inicio, hora_fim) 
          VALUES ($1, $2, $3, $4, $5, "id");
      `;

      for (let item of itens) {
          const itemValues = [
              item.sala,
              item.nome,
              item.data,
              item.hora_inicio,
              item.hora_fim,
              docNum, 
          ];

          await client.query(itemQuery, itemValues);
      }

      await client.query('COMMIT');
      res.status(201).json({ message: 'Reserva inserida com sucesso!' });

  } catch (error) {
      await client.query('ROLLBACK');
      console.error("Erro ao inserir Reserva:", error);
      res.status(500).json({ error: "Erro ao inserir Reserva." });

  } finally {
      client.release();
  }
});

  
// ----------------------------------------------------------------------------------------
// RODANDO NO SERVIDOR - node database.js
app.listen(65000, () => {
    console.log('Servidor rodando em http://127.0.0.1:65000');
  });
  