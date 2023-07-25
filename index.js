const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer'); // Middleware para gestionar la carga de archivos
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
const connection = mysql.createConnection({
  host: "basejulio.c52ywilrvbwu.us-east-1.rds.amazonaws.com",
  user: "admin",
  password: "Actividad1234",
  database: "proyecto_mariscos"
});
//////------Para que se guarden en la carpeta----------/////////
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

///////----Agregar productos--------////////
app.post('/datospro', upload.single('Imagen'), (req, res) => {
  const { Tamano, Nombre, Precio_compra, Cantidad, Precio_venta } = req.body;
  
  // Check if an image was uploaded, if not, set the imageFilePath to 'nodisponible.png'
  const imageFilePath = req.file ? req.file.path : 'nodisponible.png';
  
  const query = 'INSERT INTO Productos (Tamano, Nombre, Precio_compra, Cantidad, Precio_venta, Imagen) VALUES (?, ?, ?, ?, ?, ?)';
  connection.query(query, [Tamano, Nombre, Precio_compra, Cantidad, Precio_venta, imageFilePath], (error, results) => {
    if (error) {
      console.error('Error adding new product: ', error);
      res.status(500).json({ error: 'Error adding new product.' });
    } else {
      res.sendStatus(200);
    }
  });
});

//////----Mostrar productos--------////////
app.get('/datospro', (req, res) => {
  const query = 'SELECT * FROM Productos';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error retrieving data: ', error);
      res.status(500).json({ error: 'Error retrieving data.' });
    } else {
      res.json(results);
    }
  });
});
/////-------Mostrar Imagen---------///////
app.use('/uploads', express.static('uploads'));
app.get('/imagen/:nombreArchivo', (req, res) => {
  const nombreArchivo = req.params.nombreArchivo;
  const rutaImagen = path.join(__dirname, 'uploads', nombreArchivo);
  res.sendFile(rutaImagen);
});
app.get('/uploads/:nombreArchivo', (req, res) => {
  const nombreArchivo = req.params.nombreArchivo;
  const rutaImagen = path.join(__dirname, 'uploads', nombreArchivo);
  res.sendFile(rutaImagen);
});

///////----Eliminar productos--------////////
app.options('/datoseli/:Tamano/:Nombre', cors());
app.options('/datosact/:Tamano/:Nombre', cors());

app.delete('/datoseli/:Tamano/:Nombre', async (req, res) => {
  const { Tamano, Nombre } = req.params;
  const query = 'SELECT Imagen FROM Productos WHERE Tamano = ? AND Nombre = ?';
  connection.query(query, [Tamano, Nombre], async (error, results) => {
    if (error) {
      console.error('Error retrieving product information: ', error);
      res.status(500).json({ error: 'Error retrieving product information.' });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const imageFileName = results[0].Imagen;
    const imageFilePath = path.join(imageFileName); 
    const deleteQuery = 'DELETE FROM Productos WHERE Tamano = ? AND Nombre = ?';
    connection.query(deleteQuery, [Tamano, Nombre], async (error, deleteResults) => {
      if (error) {
        console.error('Error deleting product: ', error);
        res.status(500).json({ error: 'Error deleting product.' });
        return;
      }
      try {
        if (imageFileName !== 'nodisponible.png') {
          fs.unlinkSync(imageFilePath);
        }
        res.sendStatus(200);
      } catch (unlinkError) {
        console.error('Error deleting image: ', unlinkError);
        res.status(500).json({ error: 'Error deleting image.' });
      }
    });
  });
});
///////----Modificar productos--------////////
app.put('/datosact/:Tamano/:Nombre', upload.single('Imagen'), (req, res) => {
  const { Tamano, Nombre } = req.params;
  const nuevosDatos = req.body;

  // Si se proporcionó una imagen en la solicitud, actualizar la columna 'Imagen' en la base de datos
  if (req.file) {
    nuevosDatos.Imagen = req.file.filename;
  }

  const query = 'UPDATE Productos SET ? WHERE Tamano = ? AND Nombre = ?';
  connection.query(query, [nuevosDatos, Tamano, Nombre], (error, results) => {
    if (error) {
      console.error('Error updating row: ', error);
      res.status(500).json({ error: 'Error updating row.' });
    } else {
      res.sendStatus(200);
    }
  });
});


////////-------Consulta semanal-----------//////////////
app.get('/ventas/:year/:month/:week', (req, res) => {
  const { year, month, week } = req.params;
  const query = `SELECT * FROM Ventas WHERE Ano = ? AND Mes = ? AND Semana = ?`;
  connection.query(query, [year, month, week], (error, results) => {
    if (error) {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ error: 'Error al obtener los datos' });
    } else {
      res.json(results);
    }
  });
});
////////---------Consulta mensual por semanas--------------////////
app.get('/ventassxm/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const query = `SELECT Mes, Semana, SUM(Cantidadvendida) AS Total_ventas, SUM(Cantidadesperada) AS Total_esperada
  FROM Ventas WHERE Ano = ? AND Mes = ?
  GROUP BY Mes, Semana; `;
  connection.query(query, [year, month], (error, results) => {
    if (error) {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ error: 'Error al obtener los datos' });
    } else {
      res.json(results);
    }
  });
});
/////////---------Consulta mensual por productos-------------//////////////
app.get('/ventasm/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const query = `SELECT Nom_producto, Tamano, SUM(Cantidadvendida) AS Total_ventas, SUM(Cantidadesperada) AS Total_esperada, AVG(Precio_compra) AS Promedio_ventas 
  FROM Ventas WHERE Ano = ? AND Mes = ?
  GROUP BY Nom_producto, Tamano; `;
  connection.query(query, [year, month], (error, results) => {
    if (error) {
      console.error('Error al obtener los datos:', error);
      res.status(500).json({ error: 'Error al obtener los datos' });
    } else {
      res.json(results);
    }
  });
});
//////////-------Vender producto/////////////////////
app.post('/ventas', (req, res) => {
  const { Ano, Mes, Semana, Nombre, Tamano, Cantidadvendida } = req.body;

  const query = `UPDATE Ventas SET Cantidadvendida = Cantidadvendida + ? WHERE Ano = ? AND Mes = ? AND Semana = ? AND Nom_producto = ? AND Tamano = ?`;
  const values = [Cantidadvendida, Ano, Mes, Semana, Nombre, Tamano];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.error('Error al registrar la venta:', error);
      res.status(500).json({ error: 'Error al registrar la venta' });
    } else {
      console.log('Venta registrada');
      res.json({ success: true });
    }
  });
});
//////////-------Devolver producto/////////////////////
app.post('/devoluciones', (req, res) => {
  const { Cantidadvendida, Ano, Mes, Semana, Nombre, Tamano } = req.body;

  const query = `UPDATE Ventas SET Cantidadvendida = Cantidadvendida - ? WHERE Ano = ? AND Mes = ? AND Semana = ? AND Nom_producto = ? AND Tamano = ?`;
  const values = [Cantidadvendida, Ano, Mes, Semana, Nombre, Tamano];

  connection.query(query, values, (error, results) => {
    if (error) {
      console.error('Error al realizar la devolución:', error);
      res.status(500).json({ error: 'Error al realizar la devolución' });
    } else {
      console.log('Devolución realizada');
      res.json({ success: true });
    }
  });
});
/////------Generar Venta semanal----------////////////
app.post('/ventasg', (req, res) => {
  const { Ano, Mes, Semana, Nom_producto, Tamano, Cantidadvendida, Cantidadesperada, Precio_compra } = req.body;
  const query = 'INSERT INTO Ventas (Ano, Mes, Semana, Nom_producto, Tamano, Cantidadvendida, Cantidadesperada, Precio_compra) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

  connection.query(query, [Ano, Mes, Semana, Nom_producto, Tamano, Cantidadvendida, Cantidadesperada, Precio_compra], (error, results) => {
    if (error) {
      console.error('Error adding new venta: ', error);
      res.status(500).json({ error: 'Error adding new venta.' });
    } else {
      res.sendStatus(200);
    }
  });
});

//////////--------Mostarar Usuarios////////////////
app.get('/datosusu', (req, res) => {
  const query = 'SELECT * FROM Usuarios';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error retrieving data: ', error);
      res.status(500).json({ error: 'Error retrieving data.' });
    } else {
      res.json(results);
    }
  });
});
//////////--------Eliminar Usuarios---------////////////////
app.delete('/datoseliusu/:Usuario', (req, res) => {
  const { Usuario } = req.params;
  const query = 'DELETE FROM Usuarios WHERE Usuario=?';
  connection.query(query, [Usuario], (error, results) => {
    if (error) {
      console.error('Error deleting row: ', error);
      res.status(500).json({ error: 'Error deleting row.' });
    } else {
      res.sendStatus(200);
    }
  });
});
//////////--------Agregar Usuarios----------////////////////
app.post('/datosusuagre', (req, res) => {
  console.log('vas bien');
  const { Usuario, Contrasena } = req.body;
  const query = 'INSERT INTO Usuarios (Usuario, Contrasena) VALUES (?, ?)';
  connection.query(query, [Usuario, Contrasena], (error, results) => {
    if (error) {
      console.error('Error adding new user: ', error);
      res.status(500).json({ error: 'Error adding new user.' });
    } else {
      res.sendStatus(200);
    }
  });
});
//////////--------Validar datos---------/////////////

app.post('/login', (req, res) => {
  const { Usuario, Contrasena } = req.body;
  const query = `SELECT * FROM Usuarios WHERE Usuario = ? AND Contrasena = ?`;

  connection.query(query, [Usuario, Contrasena], (err, results) => {
      if (err) {
          console.error('Error en la consulta:', err);
          return res.status(500).json({ success: false });
      }
      if (results.length === 1) {
          return res.status(200).json({ success: true });
      } else {
          return res.status(401).json({ success: false });
      }
  });
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
