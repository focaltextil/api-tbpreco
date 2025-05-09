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
  methods: 'GET,POST,DELETE',
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
    const result = await client.query('select * from tembo."salas"');

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
  const { nome, sala, data, hora_inicio, hora_fim, titulo } = req.body;

  if (!nome || !sala || !data || !hora_inicio || !hora_fim || !titulo) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("Dados recebidos:", req.body);

    const query = `
          INSERT INTO tembo.salas (sala, nome, data, hora_inicio, hora_fim, titulo) 
          VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;
      `;
    const values = [sala, nome, data, hora_inicio, hora_fim, titulo];
    await client.query(query, values);

    await client.query('COMMIT');

    console.log("Reserva inserida com sucesso!");

    res.status(201).json({ message: "Reserva inserida com sucesso!" });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro ao inserir reserva:", error);
    res.status(500).json({ error: "Erro ao inserir a reserva. Tente novamente mais tarde." });

  } finally {
    client.release();
  }
});


// ----------------------------------------------------------------------------------------
// INSERIR COMPROMISSO

app.post('/insert_compromisso', async (req, res) => {

  const { nome, titulo, data, hora_inicio, hora_fim } = req.body;

  if (!nome || !titulo || !data || !hora_inicio || !hora_fim) {

    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });

  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log("Dados recebidos:", req.body);

    const query = `
          INSERT INTO tembo.agenda (nome, titulo, data, hora_inicio, hora_fim) 
          VALUES ($1, $2, $3, $4, $5) RETURNING id;
      `;
    const values = [nome, titulo, data, hora_inicio, hora_fim];

    await client.query(query, values);

    await client.query('COMMIT');

    console.log("Compromisso inserido com sucesso!");

    res.status(201).json({ message: "Compromisso inserido com sucesso!" });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error("Erro ao inserir reserva:", error);

    res.status(500).json({ error: "Erro ao inserir a reserva. Tente novamente mais tarde." });

  } finally {
    client.release();
  }
});


// --------------------------------------------------------------------------------------
// FILTRAR AGENDA DO USUARIO

app.get('/filtrar_agendamentos/:nome', async (req, res) => {
  const { nome } = req.params;

  const client = await pool.connect();
  try {
    const query = `
      SELECT
        id, 
        nome,
        titulo,
        data,
        hora_inicio,
        hora_fim
      FROM tembo.agenda
      WHERE nome = $1
      ORDER BY data, hora_inicio;
    `;

    const result = await client.query(query, [nome]);

    const formatado = result.rows.map(item => ({
      id: item.id,
      nome: item.nome,
      titulo: item.titulo,
      data: item.data,
      hora_inicio: item.hora_inicio,
      hora_fim: item.hora_fim,
    }));

    res.status(200).json({ data: formatado });

  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ error: "Erro ao buscar agendamentos." });
  } finally {
    client.release();
  }
});

// --------------------------------------------------------------------------------------
// DELETAR RESERVA DE SALA

app.delete("/delete_agendamento/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const query = "DELETE FROM tembo.salas WHERE id = $1";
    const { rowCount } = await pool.query(query, [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    res.status(200).json({ message: "Agendamento excluído com sucesso!" });

  } catch (err) {
    console.error(`Erro ao excluir agendamento (ID: ${id}):`, err);
    res.status(500).json({ error: "Erro ao excluir agendamento", details: err.message });
  }
});


// ----------------------------------------------------------------------------------------
// RODANDO NO SERVIDOR - node database.js
app.listen(65000, () => {
  console.log('Servidor rodando em http://127.0.0.1:65000');
});
