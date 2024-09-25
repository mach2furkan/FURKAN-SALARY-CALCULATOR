const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());

// Replace this with your MongoDB connection string
mongoose.connect('mongodb://localhost:27017/employeeDB', { useNewUrlParser: true, useUnifiedTopology: true });

// Define a schema for Employee
const employeeSchema = new mongoose.Schema({
  name: String,
  password: String,
  clockInTimes: [Date],
  clockOutTimes: [Date]
});

const Employee = mongoose.model('Employee', employeeSchema);

// Register a new employee
app.post('/register', async (req, res) => {
  const { name, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const newEmployee = new Employee({ name, password: hashedPassword, clockInTimes: [], clockOutTimes: [] });
  await newEmployee.save();
  res.json({ message: 'Employee registered successfully!' });
});

// Employee login
app.post('/login', async (req, res) => {
  const { name, password } = req.body;
  const employee = await Employee.findOne({ name });
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  const isPasswordCorrect = await bcrypt.compare(password, employee.password);
  if (!isPasswordCorrect) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ id: employee._id }, 'your_jwt_secret');
  res.json({ token });
});

// Clock in
app.post('/clockin', async (req, res) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  const { id } = jwt.verify(token, 'your_jwt_secret');

  const employee = await Employee.findById(id);
  employee.clockInTimes.push(new Date());
  await employee.save();

  res.json({ message: 'Clocked in successfully!' });
});

// Clock out
app.post('/clockout', async (req, res) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  const { id } = jwt.verify(token, 'your_jwt_secret');

  const employee = await Employee.findById(id);
  employee.clockOutTimes.push(new Date());
  await employee.save();

  res.json({ message: 'Clocked out successfully!' });
});

// Calculate weekly earnings
app.get('/earnings', async (req, res) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  const { id } = jwt.verify(token, 'your_jwt_secret');

  const employee = await Employee.findById(id);
  const hourlyRate = 16;
  let totalHours = 0;

  for (let i = 0; i < employee.clockInTimes.length; i++) {
    const startTime = employee.clockInTimes[i];
    const endTime = employee.clockOutTimes[i];
    if (startTime && endTime) {
      totalHours += (endTime - startTime) / (1000 * 60 * 60); // Convert milliseconds to hours
    }
  }

  const totalEarnings = totalHours * hourlyRate;
  res.json({ totalHours, totalEarnings });
});

// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
