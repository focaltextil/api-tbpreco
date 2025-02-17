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
// TABELA DE USUARIOS

async function listar_user() {
    try {
      const client = await pool.connect();
      const result = await client.query('select * from tembo."USER"');
  
      const dadosArray = result.rows;
      client.release();
      return dadosArray;
    } catch (error) {
      console.error('Erro ao conectar ou consultar o PostgreSQL:', error);
      return [];
    }
  }
  
  app.get('/users', async (req, res) => {
    const dadosArray = await listar_user();
    res.json(dadosArray);
  
  });

// ----------------------------------------------------------------------------------------

app.post('/orcamentos', async (req, res) => {
  const { data, rep, cliente, total, desconto1, desconto2, desconto3 } = req.body;

  const insertQuery = `
    INSERT INTO tembo."ORCAMENTOS" 
      ("DATA", "REP", "CLIENTE", "TOTAL", "DESCONTO 1", "DESCONTO 2", "DESCONTO 3", "STATUS")
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'Aguardando Aprovação')
    RETURNING *;
  `;

  const values = [data, rep, cliente, total, desconto1, desconto2, desconto3];

  try {
    const result = await pool.query(insertQuery, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao inserir dados na tabela ORCAMENTOS:", error);
    res.status(500).json({ error: "Erro ao inserir dados na tabela ORCAMENTOS." });
  }
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
          "telefone", "representante", "codigo", "produto", "qtd", "obs_item", "obs_pedido", "status") 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'Aguardando Confirmação');
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
              item.obs_pedido
          ];

          await client.query(itemQuery, itemValues);
      }

      await client.query('COMMIT'); // Confirma a transação
      res.status(201).json({ message: 'Pedido inserido com sucesso!' });
  } catch (error) {
      await client.query('ROLLBACK'); // Desfaz a transação em caso de erro
      console.error("Erro ao inserir Pedido", error);
      res.status(500).json({ error: "Erro ao inserir Pedido." });
  } finally {
      client.release();
  }
});

  
// ----------------------------------------------------------------------------------------
// RODANDO NO SERVIDOR - node database.js
app.listen(3000, () => {
    console.log('Servidor rodando em http://127.0.0.1:3000');
  });
  