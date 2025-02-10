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
// RODANDO NO SERVIDOR - node database.js
app.listen(3000, () => {
    console.log('Servidor rodando em http://127.0.0.1:3000');
  });
  