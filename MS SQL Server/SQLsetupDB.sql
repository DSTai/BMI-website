
---------------------- new database -------------------
-- Create the BMI database
CREATE DATABASE BMI;

-- Use the BMI database
USE BMI;

-- Create the patients table
CREATE TABLE patient (
    id INT IDENTITY(1,1) PRIMARY KEY,
    time DATETIME DEFAULT GETDATE(),
    name VARCHAR(100) NOT NULL,
    sex VARCHAR(10) NOT NULL,
    dob DATE NOT NULL
);

-- Create the measurements table
CREATE TABLE measurements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT,
    height INT NOT NULL,
    weight INT NOT NULL,
    measurement_time DATETIME DEFAULT GETDATE(), -- Assuming measurement time
    FOREIGN KEY (patient_id) REFERENCES patient(id)
);


------------------SAMPLE DATA--------------------
INSERT INTO [BMI].[dbo].[patient] ([time], [name], [sex], [dob])
VALUES 
(GETDATE(), 'John Doe', 'Male', '1990-05-15'),
(GETDATE(), 'Jane Smith', 'Female', '1985-08-20'),
(GETDATE(), 'Michael Johnson', 'Male', '1978-12-10'),
(GETDATE(), 'Daniel Martinez', 'Male', '1976-11-05'),
(GETDATE(), 'Olivia Anderson', 'Female', '1992-02-12'),
(GETDATE(), 'Sophia Garcia', 'Female', '1980-04-17'),
(GETDATE(), 'David Brown', 'Male', '1995-09-25'),
(GETDATE(), 'Emily Wilson', 'Female', '1998-03-08'),
(GETDATE(), 'Andrew Taylor', 'Male', '1982-07-19'),
(GETDATE(), 'Emma Davis', 'Female', '1989-10-30'),
(GETDATE(), 'William Martinez', 'Male', '1974-06-22'),
(GETDATE(), 'Abigail Johnson', 'Female', '1996-12-05'),
(GETDATE(), 'James Miller', 'Male', '1987-04-14'),
(GETDATE(), 'Olivia Garcia', 'Female', '1983-11-27'),
(GETDATE(), 'Ethan Hernandez', 'Male', '1993-08-03'),
(GETDATE(), 'Isabella Anderson', 'Female', '1990-01-18'),
(GETDATE(), 'Ava Thomas', 'Female', '1988-05-29'),
(GETDATE(), 'Sophia Wilson', 'Female', '1997-02-21'),
(GETDATE(), 'Liam Brown', 'Male', '1981-09-12');

INSERT INTO [BMI].[dbo].[measurements] ([patient_id], [height], [weight], [measurement_time])
VALUES 
(1, 180, 80, '2024-05-10 08:00:00'),
(1, 175, 75, '2024-05-10 09:00:00'),
(1, 178, 78, '2024-05-10 10:00:00'),
(2, 165, 60, '2024-05-10 08:30:00'),
(2, 163, 58, '2024-05-10 09:30:00'),
(3, 175, 85, '2024-05-10 08:45:00'),
(4, 170, 70, '2024-05-10 09:15:00'),
(5, 160, 55, '2024-05-10 08:20:00'),
(6, 168, 65, '2024-05-10 09:45:00'),
(7, 185, 90, '2024-05-10 08:10:00'),
(8, 155, 50, '2024-05-10 09:30:00'),
(9, 175, 80, '2024-05-10 08:35:00'),
(10, 170, 75, '2024-05-10 09:05:00'),
(11, 160, 70, '2024-05-10 08:25:00'),
(12, 165, 65, '2024-05-10 09:40:00'),
(13, 180, 85, '2024-05-10 08:15:00'),
(14, 170, 75, '2024-05-10 09:20:00'),
(15, 175, 80, '2024-05-10 08:40:00'),
(16, 160, 55, '2024-05-10 09:10:00'),
(17, 180, 85, '2024-05-10 08:50:00'),
(18, 175, 80, '2024-05-10 09:25:00'),
(19, 170, 75, '2024-05-10 08:55:00');


-- Add a new BMI column
ALTER TABLE measurements ADD BMI FLOAT;




-- Update the new BMI column with correct values
UPDATE measurements
SET BMI = ROUND((weight / POWER((height / 100.0), 2)),2)
WHERE height IS NOT NULL AND weight IS NOT NULL;




-- Create a trigger to automatically calculate BMI
CREATE TRIGGER Calculate_BMI
ON measurements
AFTER INSERT, UPDATE
AS
BEGIN
    -- Update BMI for existing rows
    UPDATE measurements
    SET BMI = ROUND((weight / POWER((height / 100.0), 2)),2)
    WHERE height IS NOT NULL AND weight IS NOT NULL;

    -- Calculate BMI for newly inserted rows
    DECLARE @patient_id INT, @height INT, @weight INT;
    SELECT @patient_id = patient_id, @height = height, @weight = weight
    FROM inserted;

    IF @height IS NOT NULL AND @weight IS NOT NULL
    BEGIN
        UPDATE measurements
        SET BMI = ROUND((@weight / POWER((@height / 100.0), 2)),2)
        WHERE patient_id = @patient_id
          AND measurement_time = (SELECT MAX(measurement_time) FROM measurements WHERE patient_id = @patient_id);
    END
END;