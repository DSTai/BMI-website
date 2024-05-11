const express = require('express');
const sql = require('msnodesqlv8');
const bodyParser = require('body-parser');
const path = require('path');

const connectionString = 'Driver={ODBC Driver 17 for SQL Server};Server=DUCKTAI;Database=BMI;Trusted_Connection=yes;';

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/patient', (req, res) => {
  sql.open(connectionString, (err, conn) => {
    if (err) {
      console.error('Error occurred:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    const query = `
    SELECT 
    p.id,
    p.time,
    p.name,
    p.sex,
    p.dob,
    m.height,
    m.weight,
    m.BMI
FROM 
    patient p
JOIN (
    SELECT 
        patient_id,
        MAX(measurement_time) AS latest_measurement_time
    FROM 
        measurements
    GROUP BY 
        patient_id
) AS latest_measurement ON p.id = latest_measurement.patient_id
JOIN measurements m ON p.id = m.patient_id AND m.measurement_time = latest_measurement.latest_measurement_time
`;

    conn.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.json(results);
      }

      conn.close();
    });
  });
});

///// Select latest patient
app.get('/patient/:name/latest', (req, res) => {
  const patientName = req.params.name;

  sql.open(connectionString, (err, conn) => {
    if (err) {
      console.error('Error occurred:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    const query = `
    SELECT TOP 1 p.*, m.height, m.weight, m.BMI
    FROM patient p
    LEFT JOIN measurements m ON p.id = m.patient_id
    WHERE p.name = ?
    ORDER BY p.id DESC, m.measurement_time DESC;
    `;

    const params = [patientName];

    conn.query(query, params, (err, result) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
      } else {
        if (result.length === 0) {
          res.status(404).send('Patient not found');
        } else {
          res.json(result[0]); // Send latest patient data back to client
        }
      }

      conn.close();
    });
  });
});


// Add new endpoint for adding patients
app.post('/add-patient', async (req, res) => {
  const { name, sex, dob, height, weight } = req.body;

  // Get current timestamp
  const currentTime = new Date().toISOString();

  try {
    // Open a database connection
    const conn = await new Promise((resolve, reject) => {
      sql.open(connectionString, (err, conn) => {
        if (err) {
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });

    // Insert patient into the database
    const patientQuery = `
      INSERT INTO [BMI].[dbo].[patient] ([time], [name], [sex], [dob])
      VALUES (?, ?, ?, ?)
    `;
    const patientParams = [currentTime, name, sex, dob];

    // Execute the patient query
    const patientResult = await new Promise((resolve, reject) => {
      conn.query(patientQuery, patientParams, (err, patientResult) => {
        if (err) {
          reject(err);
        } else {
          resolve(patientResult);
        }
      });
    });

    // Retrieve the newly inserted patient_id
    const patientIdQuery = 'SELECT @@IDENTITY AS patientId;';
    const patientIdResult = await new Promise((resolve, reject) => {
      conn.query(patientIdQuery, (err, patientIdResult) => {
        if (err) {
          reject(err);
        } else {
          resolve(patientIdResult);
        }
      });
    });
    const patientId = patientIdResult[0].patientId;

    // Insert measurements for the new patient
    const measurementQuery = `
      INSERT INTO [BMI].[dbo].[measurements] ([patient_id], [height], [weight], [measurement_time])
      VALUES (?, ?, ?, ?)
    `;
    const measurementParams = [patientId, height, weight, currentTime];

    // Execute the measurement query
    await new Promise((resolve, reject) => {
      conn.query(measurementQuery, measurementParams, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Close the connection
    await conn.close();

    // Send success response
    res.status(201).send('Patient added successfully');
  } catch (error) {
    console.error('Error adding patient:', error);
    res.status(500).send('Failed to add patient');
  }
});



// Add new endpoint for fetching 
app.get('/patientID', (req, res) => {
  sql.open(connectionString, (err, conn) => {
    if (err) {
      console.error('Error occurred:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    const query = 'SELECT id FROM patient';

    conn.query(query, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.json(results);
      }

      conn.close();
    });
  });
});

// Add new endpoint for adding measurements
app.post('/measurements', async (req, res) => {
  const { patient_id, height, weight } = req.body;

  // Get current timestamp
  const currentTime = new Date().toISOString();

  try {
    // Open a database connection
    const conn = await new Promise((resolve, reject) => {
      sql.open(connectionString, (err, conn) => {
        if (err) {
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });
    const query = `
      INSERT INTO [BMI].[dbo].[measurements] ([patient_id], [height], [weight], [measurement_time])
      VALUES (?, ?, ?, ?)
    `;
    const params = [patient_id, height, weight, currentTime];
    // Execute the query
    await new Promise((resolve, reject) => {
      conn.query(query, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Close the connection
    await conn.close();

    // Send success response
    res.status(201).send('Measurement added successfully');
  } catch (error) {
    console.error('Error adding measurement:', error);
    res.status(500).send('Failed to add measurement');
  }
});



app.get('/graph/:patientId', (req, res) => {
  const { patientId } = req.params;
  if (patientId === 'Select ID') {
    // Send an empty response with a 200 status code
    res.status(200).json([]);
    return;
  }
  sql.open(connectionString, (err, conn) => {
    if (err) {
      console.error('Error occurred:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    const query = `SELECT measurement_time, height, weight, BMI
    FROM measurements
    WHERE patient_id = ?`;
    const params = [ patientId];
    conn.query(query,params, (err, results) => {
      if (err) {
        console.error('Error executing query:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.json(results);
      }

      conn.close();
    });
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
